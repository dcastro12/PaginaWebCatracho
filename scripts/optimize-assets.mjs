#!/usr/bin/env node
import { readdir, stat, rename, unlink, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const imageTargets = [
  path.join(projectRoot, 'src/assets'),
];
const videoTargets = [
  path.join(projectRoot, 'public/media'),
];

const IMG_MAX_WIDTH = 1920;
const IMG_QUALITY = 78;
const VIDEO_CRF = 28;
const VIDEO_AUDIO_BITRATE = '96k';

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function isImage(file) {
  return /\.(jpe?g|png)$/i.test(file);
}
function isVideo(file) {
  return /\.mp4$/i.test(file);
}

async function optimizeImage(file) {
  const original = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  const pipeline = sharp(original).rotate().resize({ width: IMG_MAX_WIDTH, withoutEnlargement: true });
  const buffer =
    ext === '.png'
      ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await pipeline.jpeg({ quality: IMG_QUALITY, progressive: true, mozjpeg: true }).toBuffer();
  if (buffer.length >= original.length) {
    console.log(`  skip (no gain)  ${path.relative(projectRoot, file)}  ${original.length}B`);
    return;
  }
  await writeFile(file, buffer);
  const delta = original.length - buffer.length;
  console.log(
    `  shrunk          ${path.relative(projectRoot, file)}  ${original.length}B -> ${buffer.length}B  (-${delta}B)`,
  );
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
}

async function optimizeVideo(file) {
  const originalStat = await stat(file);
  const tmp = `${file}.tmp.mp4`;
  await runFfmpeg([
    '-y',
    '-i', file,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', String(VIDEO_CRF),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', VIDEO_AUDIO_BITRATE,
    tmp,
  ]);
  const tmpStat = await stat(tmp);
  if (tmpStat.size >= originalStat.size) {
    await unlink(tmp);
    console.log(`  skip (no gain)  ${path.relative(projectRoot, file)}  ${originalStat.size}B`);
    return;
  }
  await rename(tmp, file);
  console.log(
    `  shrunk          ${path.relative(projectRoot, file)}  ${originalStat.size}B -> ${tmpStat.size}B`,
  );
}

async function main() {
  console.log('Optimizing images...');
  for (const root of imageTargets) {
    const files = (await walk(root)).filter(isImage);
    for (const file of files) {
      try {
        await optimizeImage(file);
      } catch (err) {
        console.error(`  error           ${path.relative(projectRoot, file)}  ${err.message}`);
      }
    }
  }

  console.log('Optimizing videos...');
  for (const root of videoTargets) {
    const files = (await walk(root)).filter(isVideo);
    for (const file of files) {
      try {
        await optimizeVideo(file);
      } catch (err) {
        console.error(`  error           ${path.relative(projectRoot, file)}  ${err.message}`);
      }
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
