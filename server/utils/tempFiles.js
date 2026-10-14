import fs from 'fs';
import path from 'path';
import config from 'config';

// Папка для временных файлов загрузки. Лежит рядом с хранилищем (по умолчанию server/storage/tmp,
// на том же диске), поэтому перенос в итоговую папку (file.mv) — это быстрое переименование,
// а не копирование гигабайтов
export const tempDir = () => path.resolve(config.get('tempPath'));

export const ensureTempDir = () => fs.mkdirSync(tempDir(), { recursive: true });

// Все загруженные файлы запроса одним списком (поле формы может содержать массив)
export const requestFiles = (req) => Object.values(req.files ?? {}).flat();

const isInsideTempDir = (filePath) => {
  const dir = tempDir();
  return path.resolve(filePath).startsWith(dir + path.sep);
};

// Удаляет временные файлы запроса. Не ошибка, если файла уже нет: после успешного
// file.mv временный файл перенесён и удалять нечего
export async function removeRequestTempFiles(req) {
  await Promise.all(
    requestFiles(req)
      .map((file) => file.tempFilePath)
      .filter((filePath) => filePath && isInsideTempDir(filePath))
      .map((filePath) => fs.promises.rm(filePath, { force: true }).catch(() => {})),
  );
}

// Подчищает «осиротевшие» временные файлы (сервер упал или клиент оборвал загрузку
// до того, как запрос успел зарегистрировать файл). Возраст считается по последней записи
// в файл, поэтому идущая загрузка большого файла не удаляется
export async function sweepStaleTempFiles(maxAgeMs = 60 * 60 * 1000) {
  let names;
  try {
    names = await fs.promises.readdir(tempDir());
  } catch {
    return 0; // папки ещё нет — подчищать нечего
  }

  let removed = 0;
  for (const name of names) {
    const filePath = path.join(tempDir(), name);
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.isFile() && Date.now() - stat.mtimeMs > maxAgeMs) {
        await fs.promises.rm(filePath, { force: true });
        removed += 1;
      }
    } catch {
      // файл исчез между readdir и stat — это нормально
    }
  }
  return removed;
}
