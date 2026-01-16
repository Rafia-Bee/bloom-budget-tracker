/**
 * PWA Icon Generator for Bloom Budget Tracker
 *
 * Generates proper PNG icons from the bloomLogo2.png source image.
 * Run with: node create-icons.js
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_IMAGE = path.join(__dirname, 'public', 'bloomLogo2.png');
const OUTPUT_DIR = path.join(__dirname, 'public');

const ICON_SIZES = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
];

async function createIcons() {
    console.log('🌸 Bloom PWA Icon Generator\n');

    for (const icon of ICON_SIZES) {
        const outputPath = path.join(OUTPUT_DIR, icon.name);

        try {
            await sharp(SOURCE_IMAGE)
                .resize(icon.size, icon.size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
                })
                .png()
                .toFile(outputPath);

            console.log(`✓ Created ${icon.name} (${icon.size}x${icon.size})`);
        } catch (err) {
            console.error(`✗ Failed to create ${icon.name}:`, err.message);
        }
    }

    console.log('\n✅ PWA icons generated successfully!');
}

createIcons().catch(console.error);
