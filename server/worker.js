const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple worker that converts uploaded video to an mp4 web-friendly rendition.
const STORAGE = path.join(__dirname, 'storage');

function transcode(filePath) {
  const out = filePath.replace(/\.[^.]+$/, '') + '.transcoded.mp4';
  // This command requires ffmpeg installed on the machine.
  const cmd = `ffmpeg -y -i "${filePath}" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 96k "${out}"`;
  console.log('running', cmd);
  exec(cmd, (err, stdout, stderr) => {
    if (err) return console.error('transcode err', err);
    console.log('transcode done', out);
    // TODO: upload to object storage, generate HLS, DRM packaging
  });
}

// scan storage for finished uploads
function scan() {
  fs.readdir(STORAGE, (err, files) => {
    if (err) return console.error(err);
    files.filter((f) => f.includes('.part') === false && f.match(/\.mp4|\.mov|\.transcoded/)).forEach((f) => {
      const p = path.join(STORAGE, f);
      if (f.includes('.transcoded')) return;
      transcode(p);
    });
  });
}

console.log('worker scanning storage every 20s');
setInterval(scan, 20000);
scan();
