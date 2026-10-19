// Reduce una imagen antes de subirla a Storage (lado largo máx. 1280 px, JPEG 0.7: ~100-200 KB).
// Si el navegador no puede procesarla, devuelve el archivo original.
export async function comprimirImagen(archivo, ladoMax = 1280, calidad = 0.7) {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', calidad));
    return blob && blob.size < archivo.size ? blob : archivo;
  } catch {
    return archivo;
  }
}
