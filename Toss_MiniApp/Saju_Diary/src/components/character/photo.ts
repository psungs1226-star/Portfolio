/**
 * 캐릭터 커스텀 사진 유틸 — 업로드 이미지를 정사각 축소 후 data URL(JPEG)로 변환.
 *
 * 로컬 Storage(CRITICAL #1)에 담기 좋게 긴 변 max px 이하로 줄여 용량을 낮춘다. 외부 전송 없음.
 */
export function readResizedImage(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx == null) {
          reject(new Error('ctx'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
