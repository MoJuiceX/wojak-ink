function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function compositeOverlay(baseDataUrl: string, overlayDataUrl: string): Promise<string> {
  const [baseImg, overlayImg] = await Promise.all([
    loadImage(baseDataUrl),
    loadImage(overlayDataUrl),
  ]);

  const width = baseImg.naturalWidth || baseImg.width;
  const height = baseImg.naturalHeight || baseImg.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  ctx.drawImage(baseImg, 0, 0, width, height);
  ctx.drawImage(overlayImg, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

export async function compositeMaskedEnhancement(
  baseDataUrl: string,
  enhancedDataUrl: string,
  maskDataUrl: string,
): Promise<string> {
  const [baseImg, enhancedImg, maskImg] = await Promise.all([
    loadImage(baseDataUrl),
    loadImage(enhancedDataUrl),
    loadImage(maskDataUrl),
  ]);

  const width = baseImg.naturalWidth || baseImg.width;
  const height = baseImg.naturalHeight || baseImg.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext('2d');
  if (!baseCtx) throw new Error('Failed to create base canvas context');

  baseCtx.drawImage(baseImg, 0, 0, width, height);
  baseCtx.globalCompositeOperation = 'destination-out';
  baseCtx.drawImage(maskImg, 0, 0, width, height);
  baseCtx.globalCompositeOperation = 'source-over';

  const maskedCanvas = document.createElement('canvas');
  maskedCanvas.width = width;
  maskedCanvas.height = height;
  const maskedCtx = maskedCanvas.getContext('2d');
  if (!maskedCtx) throw new Error('Failed to create mask canvas context');

  maskedCtx.drawImage(enhancedImg, 0, 0, width, height);
  maskedCtx.globalCompositeOperation = 'destination-in';
  maskedCtx.drawImage(maskImg, 0, 0, width, height);
  maskedCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(baseCanvas, 0, 0, width, height);
  ctx.drawImage(maskedCanvas, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}
