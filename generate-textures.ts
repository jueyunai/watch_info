/**
 * 纹理生成脚本
 * 使用 canvas 库在 Node.js 中生成海报所需的背景纹理图片
 * 
 * 运行: npx ts-node generate-textures.ts
 * 或者: node generate-textures.js (编译后)
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, 'public/textures');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. 噪点纹理 (120x120)
function generateNoiseTexture() {
    const canvas = createCanvas(120, 120);
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 30;
        data[i] = noise;     // R
        data[i + 1] = noise; // G
        data[i + 2] = noise; // B
        data[i + 3] = Math.random() * 25 + 5; // Alpha
    }

    ctx.putImageData(imageData, 0, 0);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'noise-texture.png'), buffer);
    console.log('✅ noise-texture.png (120x120)');
}

// 2. 网格纹理 (54x54)
function generateGridTexture() {
    const canvas = createCanvas(54, 54);
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(18, 24, 20, 0.05)';
    ctx.lineWidth = 1;

    // 水平线 (底边)
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();

    // 垂直线 (右边)
    ctx.beginPath();
    ctx.moveTo(width - 0.5, 0);
    ctx.lineTo(width - 0.5, height);
    ctx.stroke();

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'grid-texture.png'), buffer);
    console.log('✅ grid-texture.png (54x54)');
}

// 3. Finale QR 渐变背景 (400x300)
function generateFinaleQrBg() {
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // 第一个 radial-gradient
    const grad1 = ctx.createRadialGradient(
        width * 0.12, height * 0.18, 0,
        width * 0.12, height * 0.18, width * 0.45
    );
    grad1.addColorStop(0, 'rgba(116, 215, 173, 0.2)');
    grad1.addColorStop(1, 'rgba(116, 215, 173, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    // 第二个 radial-gradient
    const grad2 = ctx.createRadialGradient(
        width * 0.9, 0, 0,
        width * 0.9, 0, width * 0.5
    );
    grad2.addColorStop(0, 'rgba(58, 175, 120, 0.18)');
    grad2.addColorStop(1, 'rgba(58, 175, 120, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);

    // 斜线纹理
    ctx.strokeStyle = 'rgba(18, 24, 20, 0.04)';
    ctx.lineWidth = 1;
    for (let i = -height; i < width + height; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + height, height);
        ctx.stroke();
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'finale-qr-bg.png'), buffer);
    console.log('✅ finale-qr-bg.png (400x300)');
}

// 4. Cover Section 高光 (600x400)
function generateCoverGlow() {
    const canvas = createCanvas(600, 400);
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createRadialGradient(
        width * 0.2, height * 0.2, 0,
        width * 0.2, height * 0.2, Math.max(width, height) * 0.55
    );
    grad.addColorStop(0, 'rgba(116, 215, 173, 0.35)');
    grad.addColorStop(1, 'rgba(116, 215, 173, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'cover-glow.png'), buffer);
    console.log('✅ cover-glow.png (600x400)');
}

// 5. 斜线纹理 (14x14, 可平铺)
function generateDiagonalLines() {
    const canvas = createCanvas(14, 14);
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(18, 24, 20, 0.05)';
    ctx.lineWidth = 1;

    // 135 度斜线
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width * 2, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'diagonal-lines.png'), buffer);
    console.log('✅ diagonal-lines.png (14x14)');
}

// 运行
console.log('🎨 生成海报纹理图片...\n');
generateNoiseTexture();
generateGridTexture();
generateFinaleQrBg();
generateCoverGlow();
generateDiagonalLines();
console.log('\n✨ 所有纹理已生成到 public/textures/ 目录');
