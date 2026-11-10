import sharp from 'sharp';
import fs from 'node:fs/promises';
const source = await fs.readFile('public/icons/coffee.svg');
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['maskable-512', 512], ['apple-touch-icon', 180]]) {
  await sharp(source).resize(size, size).png().toFile(`public/icons/${name}.png`);
}
console.log('Íconos PNG generados; contenido importante dentro del área segura maskable.');
