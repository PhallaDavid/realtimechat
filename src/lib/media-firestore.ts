import type { MessageType } from '@/src/types';

/** Keep under Firestore ~1MB doc limit (free tier, no Storage billing). */
const MAX_DATA_URL_CHARS = 750_000;

export function resolveMessageType(file: File): MessageType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'voice';
  return 'file';
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlSize(file: File): number {
  return Math.ceil(file.size * 1.37);
}

async function compressImage(file: File, maxDim = 1280, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image compression failed.'))),
      'image/jpeg',
      quality
    );
  });
  return blob;
}

async function fileToOptimizedBlob(file: File): Promise<Blob> {
  if (file.type.startsWith('image/')) {
    let quality = 0.72;
    let blob = await compressImage(file, 1280, quality);
    while (estimateDataUrlSize(new File([blob], 'x')) > MAX_DATA_URL_CHARS && quality > 0.35) {
      quality -= 0.12;
      blob = await compressImage(file, 960, quality);
    }
    if (estimateDataUrlSize(new File([blob], 'x')) > MAX_DATA_URL_CHARS) {
      blob = await compressImage(file, 640, 0.5);
    }
    return blob;
  }

  if (file.type.startsWith('audio/')) {
    if (file.size > 280_000) {
      throw new Error('Voice note too long. Record under ~30 seconds.');
    }
    return file;
  }

  if (file.size > 200_000) {
    throw new Error('File too large for free mode (max ~200 KB). Send a link in text instead.');
  }
  return file;
}

export async function prepareMediaForMessage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{
  type: MessageType;
  mediaUrl: string;
  fileName: string;
  mimeType: string;
}> {
  onProgress?.(20);
  const blob = await fileToOptimizedBlob(file);
  const outFile = new File(
    [blob],
    file.name,
    { type: blob.type || file.type || 'application/octet-stream' }
  );

  if (estimateDataUrlSize(outFile) > MAX_DATA_URL_CHARS) {
    throw new Error('File still too large after compression. Try a smaller image or shorter voice note.');
  }

  onProgress?.(60);
  const mediaUrl = await readAsDataURL(outFile);
  if (mediaUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error('File too large for free chat (Firestore limit). Use a smaller file.');
  }

  onProgress?.(100);
  return {
    type: resolveMessageType(file),
    mediaUrl,
    fileName: file.name,
    mimeType: outFile.type,
  };
}
