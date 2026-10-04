/**
 * Turn an image file — a camera capture or a library pick — into a small
 * JPEG data URL. Photos live in localStorage, so every byte counts.
 */
export interface PhotoOptions {
  /** Longest edge of the output, in pixels. Images are never scaled up. */
  maxDimension: number;
  /** JPEG quality, 0–1. */
  quality: number;
  /** Crop to the centre square first — what a selfie avatar wants. */
  square?: boolean;
}

/**
 * Open play avatars: square, and large enough to stay sharp when the
 * scoreboard's Players view shows them on a big screen. About 25KB each.
 */
export const AVATAR_PHOTO: PhotoOptions = { maxDimension: 400, quality: 0.7, square: true };

export function readPhoto(file: File, options: PhotoOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    // Some Android camera captures arrive with an empty type, so only reject
    // a type that is present and plainly not an image; decoding decides the rest.
    if (file.type && !file.type.startsWith('image/')) {
      reject(new Error('That file is not an image.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };

    img.onload = () => {
      URL.revokeObjectURL(url);

      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sw = options.square ? side : img.naturalWidth;
      const sh = options.square ? side : img.naturalHeight;
      const sx = (img.naturalWidth - sw) / 2;
      const sy = (img.naturalHeight - sh) / 2;

      const scale = Math.min(1, options.maxDimension / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process that image.'));
        return;
      }
      // Browsers apply the camera's EXIF rotation when drawing, so portrait
      // phone shots come out upright.
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', options.quality));
    };

    img.src = url;
  });
}
