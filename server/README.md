Vertix Upload Server (demo)

Quick start:

1. Install dependencies

```bash
cd server
npm install
```

2. Start server

```bash
npm run start
```

3. (Optional) start worker (requires `ffmpeg` on PATH)

```bash
npm run worker
```

Notes:
- This demo server stores incoming uploads in `server/storage` and supports resumable chunked uploads via `PUT /uploads/:id` with `Content-Range: bytes start-end/total`.
- After `POST /uploads/init` returns an `uploadId`, clients should send chunks to `PUT /uploads/:id` and call `POST /uploads/:id/complete` when finished.
- This is a minimal demo. For production use a durable DB for metadata, object storage (S3/GCS), signed URLs, background workers, virus/moderation scanning, and rate limiting.
