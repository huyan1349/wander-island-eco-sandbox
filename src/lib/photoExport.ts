export async function capturePhoto(settings: { watermark: boolean; watermarkText: string }) {
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
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);

      ctx.save();
      
      // Shadow for readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Position bottom right
      const paddingX = 60;
      const paddingY = 80;
      
      // Rotate -3 deg for the entire watermark group
      ctx.translate(canvas.width - paddingX, canvas.height - paddingY);
      ctx.rotate(-3 * Math.PI / 180);
      
      // Add logo text
      ctx.font = 'bold 80px "ZCOOL KuaiLe", sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Wander Island', 0, 0);
      
      // Add subtext
      if (settings.watermarkText) {
         ctx.font = '32px "ZCOOL KuaiLe", sans-serif';
         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
         ctx.fillText(`~ ${settings.watermarkText} ~`, -20, 40);
      }
      
      ctx.restore();

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
