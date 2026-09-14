// Decode the actual cached image used by the renderer, not just a second fetch.
export async function imageReady(image: HTMLImageElement, timeoutMs = 30000) {
  let timer: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      image.decode().then(() => {
        if (!image.naturalWidth) throw new Error('Gambar kosong');
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Waktu muat habis')), timeoutMs);
      }),
    ]);
  } catch {
    const src = image.src;
    image.removeAttribute('src');
    image.src = src; // Permit a retry after network/decode failure.
    throw new Error(`Gagal memuat ${new URL(src).pathname.split('/').pop()}`);
  } finally {
    clearTimeout(timer!);
  }
}

export function videoReady(src: string, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const finish = (error?: Error) => {
      clearTimeout(timer);
      video.onloadeddata = video.onerror = null;
      video.removeAttribute('src');
      video.load();
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => finish(new Error('Video tim belum siap. Coba lagi.')), timeoutMs);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onloadeddata = () => finish();
    video.onerror = () => finish(new Error('Gagal memuat video tim.'));
    video.src = src;
    video.load();
  });
}
