// Тащат ли именно файлы с компьютера (а не выделенный текст или ссылку со страницы)
export const hasFiles = (dataTransfer) =>
  Boolean(dataTransfer?.types) && Array.from(dataTransfer.types).includes('Files');

// Достаёт из dataTransfer файлы и имена перетащенных папок.
// Вызывать нужно синхронно внутри обработчика drop: после него браузер очищает dataTransfer.
export const extractDroppedFiles = (dataTransfer) => {
  const files = [];
  const folders = [];
  const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];

  if (items.length > 0) {
    for (const item of items) {
      if (item.kind !== 'file') continue;
      // Папка приходит как «файл» нулевого размера, отличить её можно только через entry
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        folders.push(entry.name);
        continue;
      }
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  } else {
    // Старые браузеры без dataTransfer.items: отличить папки нельзя
    files.push(...dataTransfer.files);
  }

  return { files, folders };
};
