// Определяет формат изображения по первым байтам файла. Расширению и mimetype из запроса
// верить нельзя: их выбирает клиент. Разрешены только JPEG, PNG и WebP; SVG и GIF не берём
// (SVG может нести скрипты). Возвращает расширение ('png' | 'jpg' | 'webp') или null.
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  const isPng =
    buffer[0] === 0x89 &&
    buffer.toString('latin1', 1, 4) === 'PNG' &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return 'png';

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') {
    return 'webp';
  }

  return null;
}
