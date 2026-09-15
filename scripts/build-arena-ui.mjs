import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const source = path.resolve('Assets/Video and GIFs');
const out = path.resolve('public/arena-ui');
await fs.mkdir(out, { recursive: true });
for (const [i, id] of ['kampung', 'pasar', 'taman', 'kanal'].entries()) {
  await sharp(path.join(source, `background field map selection/map ${i + 1}.png`))
    .resize({ width: 1672, withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(out, `${id}.webp`));
  await fs.copyFile(path.join(source, `loading/map ${i + 1} loading animation .mp4`), path.join(out, `${id}.mp4`));
}
for (const [team, file] of [['red', 'merahload1.jpg'], ['green', 'hijauload1.jpg']]) {
  await sharp(path.join(source, file)).resize({ width: 1672, withoutEnlargement: true })
    .webp({ quality: 84 }).toFile(path.join(out, `${team}-loading.webp`));
}
console.log('Arena UI: 6 WebP backgrounds and 4 original videos ready.');
