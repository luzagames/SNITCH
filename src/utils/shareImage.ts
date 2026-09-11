import html2canvas from 'html2canvas';

export type ShareImageResult = 'shared' | 'downloaded' | 'error';

// Convierte el elemento a PNG y lo comparte con el selector nativo del
// dispositivo (si soporta compartir archivos) o lo descarga directo.
export async function captureAndShareImage(
  element: HTMLElement,
  fileName: string,
  shareText: string
): Promise<ShareImageResult> {
  // Esperamos a que las tipografías pixel terminen de cargar — si
  // capturamos antes, el texto sale con una fuente genérica.
  if (document.fonts) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, { backgroundColor: '#0a0a0a', scale: 1 });
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'error';

  const file = new File([blob], fileName, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'SNITCH', text: shareText });
      return 'shared';
    } catch {
      // Si cancela el selector nativo, no forzamos la descarga: el
      // usuario decidió no compartir, no es un error.
      return 'error';
    }
  }

  // Sin soporte para compartir archivos (la mayoría de los navegadores de
  // escritorio): descargamos directo para que lo compartan a mano.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
