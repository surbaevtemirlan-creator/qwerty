import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import config from 'config';
import jwt from 'jsonwebtoken';

// Ссылка на скачивание живёт недолго: браузер переходит по ней сразу после выдачи
const DOWNLOAD_TOKEN_TTL = '60s';

// Токены скачивания подписываются отдельным ключом, выведенным из секрета JWT.
// Поэтому токен из ссылки не пройдёт authMiddleware как обычный Bearer-токен
// (подпись не совпадёт), а обычный токен авторизации не подойдёт как ссылка
const downloadSecret = () =>
  crypto.createHmac('sha256', config.get('secretKey')).update('download').digest('hex');

class FileService {
  // Абсолютный путь на диске: <filePath>\<userId>\<file.path>.
  // Бросает ошибку, если путь выходит за папку пользователя (имя вроде '..\..\x'),
  // иначе скачивание и рекурсивное удаление могли бы задеть чужие файлы.
  getPath(file) {
    const root = path.resolve(config.get('filePath'), String(file.user));
    const fullPath = path.resolve(root, file.path);
    if (fullPath !== root && !fullPath.startsWith(root + path.sep)) {
      throw new Error('Недопустимое имя файла');
    }
    return fullPath;
  }

  // Одноразовая по смыслу ссылка: токен даёт доступ только к одному файлу одного пользователя
  createDownloadToken(userId, fileId) {
    return jwt.sign(
      { uid: String(userId), fid: String(fileId) },
      downloadSecret(),
      { expiresIn: DOWNLOAD_TOKEN_TTL },
    );
  }

  // Возвращает { uid, fid } или бросает ошибку (подделан, просрочен, не тот ключ)
  verifyDownloadToken(token) {
    const payload = jwt.verify(token, downloadSecret(), { algorithms: ['HS256'] });
    if (!payload.uid || !payload.fid) {
      throw new Error('Некорректный токен скачивания');
    }
    return payload;
  }

  // Метод для создания физической папки пользователя на сервере
  createDir(file) {
    const filePath = this.getPath(file);

    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath, { recursive: true });
          return resolve({ message: 'Папка успешно создана' });
        }
        return reject({ message: 'Папка уже существует' });
      } catch (e) {
        console.log(e);
        return reject({ message: 'Ошибка при создании папки' });
      }
    });
  }

  // Удаляет файл или папку (со всем содержимым). Если пути уже нет — не ошибка
  deleteFile(file) {
    return fs.promises.rm(this.getPath(file), { recursive: true, force: true });
  }
}

export default new FileService();
