type WatermarkStyle = 'seal' | 'polaroid' | 'cinema' | 'minimal' | 'eco' | 'postcard';

export async function capturePhoto(settings: { watermark: boolean; watermarkText: string; watermarkStyle?: WatermarkStyle }) {
  const glCanvas = document.querySelector('canvas') as HTMLCanvasElement;
  if (!glCanvas) throw new Error("Canvas not found");

  // Force render (optional if frame just rendered, but preserveDrawingBuffer allows reading it directly)
  let dataUrl = glCanvas.toDataURL('image/png', 1.0);

  if (settings.watermark && settings.watermarkText) {
    // Create an offscreen canvas to composite the watermark
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    if (ctx) {
      const w = img.width;
      const h = img.height;
      const style = settings.watermarkStyle || 'seal';
      const S = Math.max(1, Math.min(w / 1600, h / 900));

      if (style === 'polaroid') {
        const border = 40 * S;
        const bottomBorder = 160 * S;
        canvas.width = w + border * 2;
        canvas.height = h + border + bottomBorder;

        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // inner shadow simulation
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 20 * S;
        ctx.shadowOffsetY = 10 * S;
        ctx.fillStyle = '#fff';
        ctx.fillRect(border, border, w, h);
        ctx.shadowColor = 'transparent';

        ctx.drawImage(img, border, border);

        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `italic 600 ${45 * S}px "Caveat", "Indie Flower", "PingFang SC", cursive, sans-serif`;
        ctx.fillText(settings.watermarkText || 'Wander Island', canvas.width / 2, h + border + (bottomBorder / 2));

      } else if (style === 'cinema') {
        const barHeight = 120 * S;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, barHeight);
        ctx.fillRect(0, h - barHeight, w, barHeight);

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `300 ${22 * S}px "Courier New", "PingFang SC", monospace`;
        const hasLS = 'letterSpacing' in ctx;
        if (hasLS) (ctx as any).letterSpacing = `${8 * S}px`;
        ctx.fillText((settings.watermarkText || 'WANDER ISLAND').toUpperCase(), w / 2, h - barHeight / 2);
        if (hasLS) (ctx as any).letterSpacing = '0px';

      } else {
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0);

        const padX = 60 * S;
        const padY = 60 * S;
        const baseX = w - padX;
        const baseY = h - padY;

        if (style === 'minimal') {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.font = `400 ${20 * S}px "Helvetica Neue", "Arial", "PingFang SC", sans-serif`;
            const hasLS = 'letterSpacing' in ctx;
            if (hasLS) (ctx as any).letterSpacing = `${3 * S}px`;

            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4 * S;
            ctx.shadowOffsetX = 1 * S;
            ctx.shadowOffsetY = 1 * S;

            ctx.fillText((settings.watermarkText || 'Wander Island').toUpperCase(), baseX, baseY);
            ctx.shadowColor = 'transparent';
            if (hasLS) (ctx as any).letterSpacing = '0px';

        } else if (style === 'eco') {
            const text = settings.watermarkText || 'Wander Island';
            ctx.font = `bold ${22 * S}px "Nunito", "PingFang SC", sans-serif`;
            const textW = ctx.measureText(text).width;
            const iconW = 30 * S;
            const padding = 16 * S;
            const boxW = textW + iconW + padding * 3;
            const boxH = 50 * S;
            const boxX = padX;
            const boxY = h - padY - boxH;

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 10 * S;
            ctx.shadowOffsetY = 4 * S;
            ctx.fillStyle = 'rgba(240, 253, 244, 0.9)'; // green-50

            // Draw rounded rect
            const r = boxH / 2;
            ctx.beginPath();
            ctx.moveTo(boxX + r, boxY);
            ctx.lineTo(boxX + boxW - r, boxY);
            ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
            ctx.lineTo(boxX + boxW, boxY + boxH - r);
            ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
            ctx.lineTo(boxX + r, boxY + boxH);
            ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
            ctx.lineTo(boxX, boxY + r);
            ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
            ctx.fill();
            ctx.restore();

            // Draw leaf icon
            ctx.fillStyle = '#16a34a'; // green-600
            ctx.beginPath();
            const cx = boxX + padding + iconW / 2;
            const cy = boxY + boxH / 2;
            ctx.ellipse(cx - 2 * S, cy + 2 * S, 8 * S, 4 * S, -Math.PI / 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 2 * S, cy - 2 * S, 8 * S, 4 * S, -Math.PI / 4, 0, 2 * Math.PI);
            ctx.fill();

            // Draw text
            ctx.fillStyle = '#166534'; // green-800
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, boxX + padding * 2 + iconW, cy);

        } else {
            // seal
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 8 * S;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2 * S;
            ctx.lineCap = 'round';

            // 圆形印章（最右）：双描边 + 两道浪纹
            const sealR = 26 * S;
            const cx = baseX - sealR;
            const cy = baseY - sealR;
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 1.5 * S;
            ctx.beginPath(); ctx.arc(cx, cy, sealR, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 0.9 * S;
            ctx.beginPath(); ctx.arc(cx, cy, sealR - 5.5 * S, 0, Math.PI * 2); ctx.stroke();
            const wave = (yo: number, op: number, w: number) => {
              ctx.strokeStyle = `rgba(255,255,255,${op})`;
              ctx.lineWidth = w * S;
              const span = sealR - 9 * S;
              ctx.beginPath();
              for (let i = 0; i <= 48; i++) {
                const x = cx - span + (2 * span) * (i / 48);
                const y = cy + yo * S + Math.sin((i / 48) * Math.PI * 4) * 2.3 * S;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
              }
              ctx.stroke();
            };
            wave(3, 0.9, 1.4);
            wave(-3.4, 0.5, 1.0);

            // 字标块（印章左侧，右对齐）
            const tx = cx - sealR - 14 * S;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'alphabetic';
            const hasLS = 'letterSpacing' in ctx;
            ctx.fillStyle = 'rgba(255,255,255,0.96)';
            ctx.font = `600 ${25 * S}px "Raleway","Nunito","PingFang SC",sans-serif`;
            if (hasLS) (ctx as any).letterSpacing = `${5.5 * S}px`;
            ctx.fillText('WANDER ISLAND', tx, cy - 3 * S);

            const sub = (settings.watermarkText || '').toUpperCase();
            if (sub) {
              ctx.font = `500 ${14 * S}px "Raleway","Nunito","PingFang SC",sans-serif`;
              if (hasLS) (ctx as any).letterSpacing = `${3 * S}px`;
              ctx.fillStyle = 'rgba(255,255,255,0.82)';
              const subY = cy + 17 * S;
              ctx.fillText(sub, tx, subY);
              // 署名左侧细线
              const subW = ctx.measureText(sub).width;
              ctx.strokeStyle = 'rgba(255,255,255,0.4)';
              ctx.lineWidth = 1 * S;
              ctx.beginPath();
              ctx.moveTo(tx - subW - 16 * S, subY - 4.5 * S);
              ctx.lineTo(tx - subW - 6 * S, subY - 4.5 * S);
              ctx.stroke();
            }
            if (hasLS) (ctx as any).letterSpacing = '0px';
            ctx.restore();
        }
      }

      dataUrl = canvas.toDataURL('image/png', 1.0);
    }
  }

  // Trigger download
  const link = document.createElement('a');
  link.download = `wander-island-photo-${Date.now()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
