// Quick icon generator for Bloom PWA
const fs = require("fs");
const path = require("path");

// Simple SVG to use as placeholder (you can replace with actual logo)
const createSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size / 8}" fill="#ec4899"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".35em"
        font-family="Arial, sans-serif" font-size="${size / 2}"
        font-weight="bold" fill="white">B</text>
</svg>
`;

// Save SVG files (browsers can use these temporarily)
fs.writeFileSync(
    path.join(__dirname, "public", "icon-192.png"),
    createSVG(192)
);

fs.writeFileSync(
    path.join(__dirname, "public", "icon-512.png"),
    createSVG(512)
);

console.log("✓ Icon placeholders created!");
console.log("Note: For production, convert these to actual PNG files using:");
console.log("https://favicon.io/favicon-generator/ or an image editor");
