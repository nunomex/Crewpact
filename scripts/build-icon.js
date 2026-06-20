/*
 * Gera os ícones + splash da app (sem dependências externas — desenha os pixels e
 * codifica o PNG com o zlib do Node). Marca CrewPact: avião de papel branco com o
 * ponto vermelho #F5402C ("luz de nav") na ponta, sobre fundo "ink" #1B1B1B.
 *   node scripts/build-icon.js
 * Saída (assets/):
 *   icon.png          1024² opaco        — iOS (a app inteira)
 *   adaptive-icon.png 1024² transparente — Android foreground (bg = adaptiveIcon.backgroundColor)
 *   splash-icon.png   1024² transparente — logo do splash (avião maior/tight)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve('assets');
fs.mkdirSync(OUT, { recursive: true });

const S = 1024;                 // lado
const SS = 2;                   // supersampling (anti-aliasing 2×2)
const INK = [27, 27, 27];       // #1B1B1B
const WHITE = [255, 255, 255];
const RED = [245, 64, 44];      // #F5402C
const CX = 512, CY = 512, BX = 12, BY = 15;  // centro + box-center do glifo (viewBox 24)

// Avião de papel (viewBox 24) — M2,16 22,9 13,21 11,16 6,14
const PLANE24 = [[2, 16], [22, 9], [13, 21], [11, 16], [6, 14]];
const DOT24 = { x: 19.64, y: 10.71, r: 1.43 };   // ponto vermelho na ponta, em coords do glifo

const planeAt = (scale) => PLANE24.map(([x, y]) => [CX + (x - BX) * scale, CY + (y - BY) * scale]);
const dotAt = (scale) => ({ x: CX + (DOT24.x - BX) * scale, y: CY + (DOT24.y - BY) * scale, r: DOT24.r * scale });

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function render(scale, transparentBg) {
  const plane = planeAt(scale), dot = dotAt(scale), r2 = dot.r * dot.r;
  const raw = Buffer.alloc(S * (1 + S * 4));
  const off = [0.25, 0.75];
  for (let py = 0; py < S; py++) {
    const rowStart = py * (1 + S * 4);
    raw[rowStart] = 0;
    for (let px = 0; px < S; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let oy = 0; oy < SS; oy++) for (let ox = 0; ox < SS; ox++) {
        const x = px + off[ox], y = py + off[oy];
        const dx = x - dot.x, dy = y - dot.y;
        let c;
        if (dx * dx + dy * dy <= r2) c = [RED[0], RED[1], RED[2], 255];          // vermelho por cima
        else if (inPoly(x, y, plane)) c = [WHITE[0], WHITE[1], WHITE[2], 255];
        else c = transparentBg ? [0, 0, 0, 0] : [INK[0], INK[1], INK[2], 255];
        r += c[0]; g += c[1]; b += c[2]; a += c[3];
      }
      const n = SS * SS, i = rowStart + 1 + px * 4;
      raw[i] = Math.round(r / n); raw[i + 1] = Math.round(g / n); raw[i + 2] = Math.round(b / n); raw[i + 3] = Math.round(a / n);
    }
  }
  return raw;
}

// ── codificador PNG mínimo (RGBA 8-bit) ──
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(raw) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const files = [
  ['icon.png', png(render(28, false)), 'opaco · iOS'],
  ['adaptive-icon.png', png(render(28, true)), 'transparente · Android'],
  ['splash-icon.png', png(render(40, true)), 'transparente · splash (tight)'],
];
for (const [name, buf, note] of files) {
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name.padEnd(18)} ${S}×${S}  ${String((buf.length / 1024).toFixed(0)).padStart(3)} KB  (${note})`);
}
