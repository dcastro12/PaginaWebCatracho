#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const input = path.join(projectRoot, 'src/assets/hero/hero-bg.jpg');
const output = path.join(projectRoot, 'src/assets/hero/hero-bg-mobile.jpg');

const meta = await sharp(input).metadata();
const { width, height } = meta;
const side = Math.min(width, height);
const left = Math.round((width - side) / 2);
const top = Math.round((height - side) / 2);

await sharp(input)
  .extract({ left, top, width: side, height: side })
  .resize({ width: 1600, withoutEnlargement: true })
  .jpeg({ quality: 82, progressive: true, mozjpeg: true })
  .toFile(output);

const outMeta = await sharp(output).metadata();
console.log(`cropped ${width}x${height} -> ${outMeta.width}x${outMeta.height} at ${output}`);
