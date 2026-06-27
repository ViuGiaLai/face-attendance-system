export function scoreImage(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Brightness score (avoid too dark or too bright)
      let totalLuma = 0;
      for (let i = 0; i < data.length; i += 4) {
        totalLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuma = totalLuma / (data.length / 4);
      const brightnessScore = avgLuma > 40 && avgLuma < 220 ? 1 - Math.abs(avgLuma - 130) / 130 : 0.2;

      // Sharpness score (Laplacian variance)
      let laplacianSum = 0;
      const w = canvas.width;
      const h = canvas.height;
      const gray = new Float32Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      let count = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const lap = gray[idx - w - 1] + gray[idx - w] + gray[idx - w + 1] +
            gray[idx - 1] - 8 * gray[idx] + gray[idx + 1] +
            gray[idx + w - 1] + gray[idx + w] + gray[idx + w + 1];
          laplacianSum += lap * lap;
          count++;
        }
      }
      const laplacianVar = count ? laplacianSum / count : 0;
      const sharpnessScore = Math.min(1, laplacianVar / 500);

      // Combined score
      const score = brightnessScore * 0.4 + sharpnessScore * 0.6;
      resolve(Math.round(score * 100) / 100);
    };
    img.onerror = () => resolve(0);
    img.src = imageSrc;
  });
}

export async function selectBestImages(images, maxCount = 5) {
  const scored = await Promise.all(
    images.map(async (img, i) => ({
      index: i,
      score: img.score || (img.descriptor ? 0.5 : 0) || (await scoreImage(img.src)),
      image: img,
    }))
  );
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map((s) => ({ ...s.image, score: s.score }));
}
