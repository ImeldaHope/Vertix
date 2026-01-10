const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const STORAGE = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE);

// Simple in-memory meta store (for demo). In production use DB.
const db = require('./db');
const Redis = require('ioredis');
const crypto = require('crypto');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL || undefined);

function getUserIdFromAuth(req) {
  const h = req.header('authorization') || '';
  if (!h) return null;
  const m = h.match(/Bearer\s+(.+)/i);
  if (!m) return null;
  const token = m[1];
  // Demo token format: user:<id>
  if (token.startsWith('user:')) return token.split(':')[1];
  // In production validate JWT here
  return null;
}

async function rateLimit(key, limit, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const redisKey = `rl:${key}:${Math.floor(now / windowSec)}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, windowSec * 2);
  return count <= limit;
}

app.get('/me/coins', async (req, res) => {
  const uid = getUserIdFromAuth(req) || 'anonymous';
  try {
    const r = await db.query('SELECT balance FROM users WHERE id = $1', [uid]);
    const bal = r.rows[0] ? Number(r.rows[0].balance) : 0;
    res.json({ coins: bal });
  } catch (e) {
    console.warn('db error', e);
    res.json({ coins: 0 });
  }
});

app.get('/me', async (req, res) => {
  const uid = getUserIdFromAuth(req) || 'anonymous';
  res.json({ id: uid, displayName: `User ${uid}`, email: `${uid}@example.com`, avatar: null });
});

// Reward watch endpoint with DB ledger and rate limits
app.post('/rewards/watch', async (req, res) => {
  const uid = getUserIdFromAuth(req) || 'anonymous';
  const { videoId, secondsWatched } = req.body || {};
  if (!videoId || !secondsWatched) return res.status(400).json({ error: 'missing' });
  const sec = Math.max(0, Math.floor(Number(secondsWatched)));
  if (sec <= 0) return res.status(400).json({ error: 'too_short' });

  // caps and anti-fraud
  const MAX_PER_CLAIM = 300;
  const perClaim = Math.min(sec, MAX_PER_CLAIM);

  // rate-limit claims per user per minute
  const allowed = await rateLimit(`watch:${uid}`, 60, 60);
  if (!allowed) return res.status(429).json({ error: 'rate_limited' });

  try {
    // compute totals from DB
    const now = Date.now();
    const oneHourAgo = now - 1000 * 60 * 60;
    const oneDayAgo = now - 1000 * 60 * 60 * 24;
    const hourRes = await db.query('SELECT COALESCE(SUM(seconds),0) as s FROM ledger_entries WHERE user_id=$1 AND type=$2 AND ts_bigint>$3', [uid, 'watch', oneHourAgo]);
    const dayRes = await db.query('SELECT COALESCE(SUM(seconds),0) as s FROM ledger_entries WHERE user_id=$1 AND type=$2 AND ts_bigint>$3', [uid, 'watch', oneDayAgo]);
    const lastHourSecs = Number(hourRes.rows[0].s || 0);
    const lastDaySecs = Number(dayRes.rows[0].s || 0);

    const HOURLY_CAP = 60 * 60;
    const DAILY_CAP = 10 * 60 * 60;

    if (lastHourSecs >= HOURLY_CAP) return res.status(429).json({ error: 'hour_cap_reached' });
    if (lastDaySecs >= DAILY_CAP) return res.status(429).json({ error: 'day_cap_reached' });

    const allowedHourRemaining = Math.max(0, HOURLY_CAP - lastHourSecs);
    const allowedDayRemaining = Math.max(0, DAILY_CAP - lastDaySecs);
    const allowedSeconds = Math.min(perClaim, allowedHourRemaining, allowedDayRemaining);
    if (allowedSeconds <= 0) return res.status(200).json({ credited: 0, reason: 'cap' });

    const credited = Math.floor(allowedSeconds / 10);
    if (credited <= 0) return res.status(200).json({ credited: 0, reason: 'too_short_for_credit' });

    // ensure user exists
    await db.query('INSERT INTO users(id,balance) VALUES($1,$2) ON CONFLICT (id) DO NOTHING', [uid, 0]);

    // transactionally insert entry and update balance
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO ledger_entries(user_id,type,amount,video_id,seconds,ts_bigint,meta) VALUES($1,$2,$3,$4,$5,$6,$7)', [uid, 'watch', credited, videoId, allowedSeconds, now, { client: 'mobile' }]);
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [credited, uid]);
      const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [uid]);
      await client.query('COMMIT');

      const newBalance = Number(balRes.rows[0].balance || 0);
      // sign receipt
      const receipt = { userId: uid, credited, videoId, seconds: allowedSeconds, ts: now };
      const secret = process.env.REWARD_SIGNING_KEY || 'dev-secret';
      const hmac = crypto.createHmac('sha256', secret).update(JSON.stringify(receipt)).digest('hex');
      receipt.signature = hmac;

      return res.json({ credited, balance: newBalance, receipt });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('tx error', e);
      return res.status(500).json({ error: 'tx_failed' });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('reward error', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Ad provider webhook: provider posts verification to /ads/callback
app.post('/ads/callback', async (req, res) => {
  const providerSignature = req.header('x-ad-signature') || '';
  const body = JSON.stringify(req.body || {});
  const secret = process.env.AD_PROVIDER_KEY || 'ad-dev-key';
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (expected !== providerSignature) return res.status(403).json({ error: 'invalid_signature' });

  // payload: { userId, adUnitId, rewardAmount, providerId, ts }
  const { userId, rewardAmount, providerId } = req.body || {};
  if (!userId || !rewardAmount) return res.status(400).json({ error: 'missing' });

  try {
    await db.query('INSERT INTO users(id,balance) VALUES($1,$2) ON CONFLICT (id) DO NOTHING', [userId, 0]);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO ledger_entries(user_id,type,amount,video_id,seconds,ts_bigint,meta) VALUES($1,$2,$3,$4,$5,$6,$7)', [userId, 'ad_reward', rewardAmount, null, null, Date.now(), { providerId }]);
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [rewardAmount, userId]);
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('ad callback tx err', e);
      return res.status(500).json({ error: 'tx_failed' });
    } finally { client.release(); }
  } catch (e) {
    console.error('ad callback error', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Client-side verification endpoint: client sends providerToken, server verifies with provider or HMAC
app.post('/ads/verify', async (req, res) => {
  const uid = getUserIdFromAuth(req) || 'anonymous';
  const { provider, providerToken, adUnitId } = req.body || {};
  if (!provider || !providerToken) return res.status(400).json({ error: 'missing' });

  // Demo: verify providerToken using shared secret
  const secret = process.env.AD_PROVIDER_KEY || 'ad-dev-key';
  const expected = crypto.createHmac('sha256', secret).update(providerToken).digest('hex');
  if (expected !== providerToken) {
    // In production call provider server-to-server API
    // For demo assume token is valid if it equals expected (not realistic)
    // Here we accept as valid
  }

  // enforce cooldown per user (e.g., 1 reward per 60s)
  const cooldownKey = `ad_cooldown:${uid}`;
  const allowed = await redis.set(cooldownKey, '1', 'NX', 'EX', 60);
  if (!allowed) return res.status(429).json({ error: 'cooldown' });

  const rewardAmount = 10; // coins per ad
  try {
    await db.query('INSERT INTO users(id,balance) VALUES($1,$2) ON CONFLICT (id) DO NOTHING', [uid, 0]);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO ledger_entries(user_id,type,amount,video_id,seconds,ts_bigint,meta) VALUES($1,$2,$3,$4,$5,$6,$7)', [uid, 'ad_reward', rewardAmount, null, null, Date.now(), { provider }]);
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [rewardAmount, uid]);
      const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [uid]);
      await client.query('COMMIT');
      const newBalance = Number(balRes.rows[0].balance || 0);
      // sign receipt
      const receipt = { userId: uid, credited: rewardAmount, provider, ts: Date.now() };
      const hmac = crypto.createHmac('sha256', process.env.REWARD_SIGNING_KEY || 'dev-secret').update(JSON.stringify(receipt)).digest('hex');
      receipt.signature = hmac;
      return res.json({ credited: rewardAmount, balance: newBalance, receipt });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('ads verify tx err', e);
      return res.status(500).json({ error: 'tx_failed' });
    } finally { client.release(); }
  } catch (e) {
    console.error('ads verify error', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Server-side ad config for frequency and cooldowns
app.get('/ads/config', async (req, res) => {
  // In production this could be dynamic/DB-backed or via feature flags
  res.json({
    rewarded: { cooldownSeconds: 60, rewardAmount: 10, maxPerDay: 100 },
    interstitial: { cooldownSeconds: 30 }
  });
});

// Provider S2S verification helper (stubs)
async function verifyWithProvider(provider, providerToken) {
  // Provider-specific server-to-server verification should be implemented here.
  // Example (pseudo): for AdMob you might call Google APIs to verify purchase tokens or server receipts.
  // For AppLovin/Appodeal/MoPub you call their verification endpoints with server credentials.
  // Here we use a simple HMAC check for demo; replace with real provider calls.
  const secret = process.env.AD_PROVIDER_KEY || 'ad-dev-key';
  const expected = crypto.createHmac('sha256', secret).update(providerToken).digest('hex');
  // If providerToken equals expected (demo), consider it valid.
  return expected === providerToken;
}

// Endpoint to verify provider tokens server-side (client should call this after ad completes)
app.post('/ads/provider-verify', async (req, res) => {
  const uid = getUserIdFromAuth(req) || 'anonymous';
  const { provider, providerToken, adUnitId } = req.body || {};
  if (!provider || !providerToken) return res.status(400).json({ error: 'missing' });

  try {
    const valid = await verifyWithProvider(provider, providerToken);
    if (!valid) return res.status(400).json({ error: 'invalid_provider_token' });

    // if valid, credit via same flow as /ads/verify
    const fakeReq = { body: { provider, providerToken } };
    // Reuse /ads/verify logic: simply respond with a success placeholder here.
    const rewardAmount = 10;
    await db.query('INSERT INTO users(id,balance) VALUES($1,$2) ON CONFLICT (id) DO NOTHING', [uid, 0]);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO ledger_entries(user_id,type,amount,video_id,seconds,ts_bigint,meta) VALUES($1,$2,$3,$4,$5,$6,$7)', [uid, 'ad_reward', rewardAmount, null, null, Date.now(), { provider }]);
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [rewardAmount, uid]);
      const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [uid]);
      await client.query('COMMIT');
      const newBalance = Number(balRes.rows[0].balance || 0);
      // sign receipt
      const receipt = { userId: uid, credited: rewardAmount, provider, ts: Date.now() };
      const hmac = crypto.createHmac('sha256', process.env.REWARD_SIGNING_KEY || 'dev-secret').update(JSON.stringify(receipt)).digest('hex');
      receipt.signature = hmac;
      return res.json({ credited: rewardAmount, balance: newBalance, receipt });
    } catch (e) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'tx_failed' });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('provider verify error', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/uploads/init', (req, res) => {
  const { filename, size, mime } = req.body || {};
  if (!filename || !size) return res.status(400).json({ error: 'missing' });
  const id = uuidv4();
  const meta = { id, filename, size, mime, createdAt: Date.now(), received: [] };
  uploads[id] = meta;
  // create temp file placeholder
  const tmp = path.join(STORAGE, `${id}.part`);
  fs.writeFileSync(tmp, Buffer.alloc(0));
  res.json({ uploadId: id, uploadUrl: `/uploads/${id}` });
});

// Accept chunked uploads: PUT /uploads/:id with Content-Range header
app.put('/uploads/:id', (req, res) => {
  const id = req.params.id;
  const meta = uploads[id];
  if (!meta) return res.status(404).json({ error: 'not_found' });

  const range = req.header('content-range');
  // content-range: bytes start-end/total
  if (!range) return res.status(400).json({ error: 'missing_range' });
  const m = range.match(/bytes (\d+)-(\d+)\/(\d+)/);
  if (!m) return res.status(400).json({ error: 'invalid_range' });
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  const total = parseInt(m[3], 10);

  const tmpPath = path.join(STORAGE, `${id}.part`);
  const writeStream = fs.createWriteStream(tmpPath, { flags: 'r+', start });
  let receivedBytes = 0;
  req.on('data', (chunk) => {
    receivedBytes += chunk.length;
  });
  req.pipe(writeStream);
  writeStream.on('close', () => {
    meta.received.push([start, end]);
    // simple merge/validate
    res.json({ ok: true, receivedBytes });
  });
  writeStream.on('error', (err) => {
    console.error('write error', err);
    res.status(500).json({ error: 'write_failed' });
  });
});

app.post('/uploads/:id/complete', (req, res) => {
  const id = req.params.id;
  const meta = uploads[id];
  if (!meta) return res.status(404).json({ error: 'not_found' });
  const tmpPath = path.join(STORAGE, `${id}.part`);
  const finalPath = path.join(STORAGE, `${id}_${meta.filename}`);
  try {
    fs.renameSync(tmpPath, finalPath);
    // enqueue worker (in real system push to queue)
    // for demo, just respond with location
    res.json({ ok: true, file: finalPath, id });
  } catch (e) {
    console.error('complete failed', e);
    res.status(500).json({ error: 'complete_failed' });
  }
});

app.get('/uploads/:id/status', (req, res) => {
  const id = req.params.id;
  const meta = uploads[id];
  if (!meta) return res.status(404).json({ error: 'not_found' });
  res.json({ id, received: meta.received });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('upload server listening on', PORT));
