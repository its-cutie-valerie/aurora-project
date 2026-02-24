import sharp from 'sharp';
import fs from 'fs';

async function processSun() {
    const inputPath = 'public/assets/latest_1024_0304.jpg';
    const outputPath = 'public/assets/latest_sun_clean.webp';

    const width = 1024;
    const height = 1024;

    console.log(`Processing ${inputPath}...`);

    // NASA SDO images typically have the sun perfectly centered at (512, 512) 
    // with a radius of around 460-480px.
    // We'll use a soft radial gradient mask to drop out the corners and texts!
    const maskSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <radialGradient id="sgrad" cx="50%" cy="50%" r="48%">
          <stop offset="90%" stop-color="white" stop-opacity="1" />
          <stop offset="95%" stop-color="white" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="512" cy="512" r="512" fill="url(#sgrad)" />
    </svg>
  `;

    await sharp(inputPath)
        .ensureAlpha()
        .composite([{
            input: Buffer.from(maskSvg),
            blend: 'dest-in'
        }])
        .webp({ quality: 85, alphaQuality: 100 })
        .toFile(outputPath);

    console.log(`Success! Created cleaned transparent sun at ${outputPath}`);
}

processSun().catch(console.error);
