import FileService from '../services/fileService.js';
import User from '../models/User.js';
import File from '../models/File.js';
import fs from 'fs';
import { isValidObjectId } from 'mongoose';
import { maxUploadSize } from '../middleware/upload.middleware.js';

// Имя папки не должно содержать разделителей пути и запрещённых в Windows символов
const INVALID_NAME = /[\\/:*?"<>|]/;

// Файл/папка по id, принадлежащие пользователю (иначе null)
const findUserFile = (id, userId) =>
  isValidObjectId(id) ? File.findOne({ _id: id, user: userId }) : null;

// Проверяет, что файл можно отдать, и возвращает { file, filePath } или { status, message }.
// Обычная функция, а не метод класса: роутер передаёт методы контроллера без привязки this
const findDownloadable = async (fileId, userId) => {
  const file = await findUserFile(fileId, userId);
  if (!file) {
    return { status: 404, message: 'Файл не найден' };
  }
  if (file.type === 'dir') {
    return { status: 400, message: 'Папку нельзя скачать' };
  }
  const filePath = FileService.getPath(file);
  if (!fs.existsSync(filePath)) {
    return { status: 404, message: 'Файл не найден на диске' };
  }
  return { file, filePath };
};

class FileController {
  async createDir(req, res) {
    try {
      const { name, parent } = req.body;
      if (!name?.trim() || INVALID_NAME.test(name) || /^\.+$/.test(name)) {
        return res.status(400).json({ message: 'Недопустимое имя папки' });
      }

      const file = new File({
        name,
        type: 'dir',
        parent: parent || null,
        user: req.user.id,
      });
      const parentFile = parent ? await findUserFile(parent, req.user.id) : null;
      if (parent && !parentFile) {
        return res.status(400).json({ message: 'Родительская папка не найдена' });
      }

      if (!parentFile) {
        file.path = name;
        await FileService.createDir(file);
      } else {
        file.path = `${parentFile.path}\\${file.name}`;
        await FileService.createDir(file);
        parentFile.childs.push(file._id);
        await parentFile.save();
      }

      await file.save();
      return res.json(file);
    } catch (e) {
      console.log(e);
      return res
        .status(400)
        .json({ message: e?.message || 'Ошибка при создании папки' });
    }
  }

  async getFiles(req, res) {
    try {
      const files = await File.find({
        user: req.user.id,
        parent: req.query.parent || null,
      });
      return res.json({ files });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Не удалось получить файлы' });
    }
  }

  // НОВЫЙ МЕТОД: Загрузка файла на сервер
  async uploadFile(req, res) {
    try {
      const file = req.files?.file;
      if (!file) {
        return res.status(400).json({ message: 'Файл не передан' });
      }
      if (Array.isArray(file)) {
        return res.status(400).json({ message: 'Загружайте файлы по одному' });
      }
      // Временные файлы запроса удаляет middleware (при любом исходе), здесь только отказываем
      if (file.truncated || file.size > maxUploadSize()) {
        const limitMb = Math.round(maxUploadSize() / 1024 / 1024);
        return res
          .status(413)
          .json({ message: `Файл слишком большой (максимум ${limitMb} МБ)` });
      }

      // В Express 5 req.body — undefined, если в форме нет текстовых полей (загрузка в корень)
      const parentId = req.body?.parent;
      const parent = parentId ? await findUserFile(parentId, req.user.id) : null;
      if (parentId && !parent) {
        return res.status(400).json({ message: 'Родительская папка не найдена' });
      }
      const user = await User.findOne({ _id: req.user.id });

      // Проверяем, хватит ли у пользователя места на диске
      if (user.usedSpace + file.size > user.diskSpace) {
        return res.status(400).json({ message: 'Недостаточно места на диске' });
      }

      const relPath = parent ? `${parent.path}\\${file.name}` : file.name;
      let filePath;
      try {
        filePath = FileService.getPath({ user: user._id, path: relPath });
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }

      // Проверяем, существует ли файл с таким именем
      if (fs.existsSync(filePath)) {
        return res.status(400).json({ message: 'Файл уже существует' });
      }

      // Физически сохраняем файл на диск компьютера
      await file.mv(filePath);

      // 'dir' зарезервировано под папки, файл без расширения получает 'file'
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'file';
      const type = ext === 'dir' ? 'file' : ext;
      const dbFile = new File({
        name: file.name,
        type,
        size: file.size,
        path: relPath,
        parent: parent ? parent._id : null,
        user: user._id,
      });

      try {
        await dbFile.save();
        // $inc атомарно: параллельные загрузки не затирают usedSpace друг друга
        await User.updateOne({ _id: user._id }, { $inc: { usedSpace: file.size } });
      } catch (e) {
        // файл уже лежит в хранилище, а учёта в БД нет: не оставляем «невидимый» файл на диске
        await fs.promises.rm(filePath, { force: true }).catch(() => {});
        await File.deleteOne({ _id: dbFile._id }).catch(() => {});
        throw e;
      }

      return res.json(dbFile);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при загрузке файла' });
    }
  }

  // Цепочка папок от корня до папки id включительно (для хлебных крошек):
  // GET /api/files/breadcrumbs?id=... → { path: [{ id, name }, ...] }
  async getBreadcrumbs(req, res) {
    try {
      const dir = await findUserFile(req.query.id, req.user.id);
      if (!dir || dir.type !== 'dir') {
        return res.status(404).json({ message: 'Папка не найдена' });
      }

      // path папки — имена от корня через "\" ("Фото\Отчёты"): берём все префиксы
      // одним запросом, а не ходим вверх по parent по одному запросу на уровень
      const names = dir.path.split('\\');
      const prefixes = names.map((_, i) => names.slice(0, i + 1).join('\\'));
      const docs = await File.find({
        user: req.user.id,
        path: { $in: prefixes },
      });
      const byPath = new Map(docs.map((doc) => [doc.path, doc]));
      const chain = prefixes.map((prefix) => byPath.get(prefix));

      if (chain.some((doc) => !doc)) {
        return res.status(404).json({ message: 'Путь к папке не найден' });
      }
      return res.json({
        path: chain.map((doc) => ({ id: doc._id, name: doc.name })),
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при получении пути' });
    }
  }

  // Поиск по имени среди всех файлов и папок пользователя: GET /api/files/search?search=...
  async searchFiles(req, res) {
    try {
      const search = String(req.query.search ?? '').trim().toLowerCase();
      if (!search) {
        return res.json({ files: [] });
      }

      // Фильтруем в JS, а не через $regex: toLowerCase корректно сравнивает кириллицу
      // независимо от регистра, и спецсимволы вроде "." в запросе не становятся regex
      const files = await File.find({ user: req.user.id });
      return res.json({
        files: files.filter((file) => file.name.toLowerCase().includes(search)),
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при поиске' });
    }
  }

  // Скачивание в два шага. Браузерное скачивание (переход по ссылке) не умеет слать
  // заголовок Authorization, а качать через axios значило бы собрать весь файл в памяти
  // вкладки (Blob). Поэтому:
  //   1) GET /api/files/download-link?id=...  (с авторизацией) → { token } на 60 секунд;
  //   2) браузер сам переходит на GET /api/files/download?token=... и принимает файл
  //      потоком: сервер читает его с диска кусками (res.download), клиент пишет на диск.
  // Ни сервер, ни браузер не держат файл целиком в памяти, работает докачка (Range).

  // Шаг 1: выдать короткоживущий токен на скачивание
  async createDownloadLink(req, res) {
    try {
      const found = await findDownloadable(req.query.id, req.user.id);
      if (found.message) {
        return res.status(found.status).json({ message: found.message });
      }
      return res.json({
        token: FileService.createDownloadToken(req.user.id, found.file._id),
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при скачивании файла' });
    }
  }

  // Шаг 2: отдать файл по токену. Маршрут без authMiddleware: доступ даёт сам токен
  async downloadFile(req, res) {
    let payload;
    try {
      payload = FileService.verifyDownloadToken(req.query.token);
    } catch {
      return res
        .status(401)
        .json({ message: 'Ссылка для скачивания недействительна или устарела' });
    }

    try {
      const found = await findDownloadable(payload.fid, payload.uid);
      if (found.message) {
        return res.status(found.status).json({ message: found.message });
      }

      // dotfiles: 'allow' — иначе send отдаёт 404 для имён вида ".env"
      return res.download(found.filePath, found.file.name, { dotfiles: 'allow' }, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ message: 'Ошибка при скачивании файла' });
        }
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при скачивании файла' });
    }
  }

  // Удаление файла или папки (со всем содержимым): DELETE /api/files?id=...
  async deleteFile(req, res) {
    try {
      const file = await findUserFile(req.query.id, req.user.id);
      if (!file || !file.path) {
        return res.status(404).json({ message: 'Файл не найден' });
      }

      const ids = [file._id];
      let freedSpace = file.size || 0;
      let level = [file._id];
      while (level.length) {
        const children = await File.find({
          user: req.user.id,
          parent: { $in: level },
        });
        for (const child of children) {
          ids.push(child._id);
          freedSpace += child.size || 0;
        }
        level = children.filter((c) => c.type === 'dir').map((c) => c._id);
      }

      // Сначала диск: при ошибке записи в БД останутся целыми и можно повторить
      await FileService.deleteFile(file);
      await File.deleteMany({ _id: { $in: ids } });
      if (file.parent) {
        await File.updateOne(
          { _id: file.parent },
          { $pull: { childs: file._id } },
        );
      }
      if (freedSpace > 0) {
        await User.updateOne(
          { _id: req.user.id },
          { $inc: { usedSpace: -freedSpace } },
        );
      }

      return res.json({ message: 'Файл удалён', freedSpace });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при удалении' });
    }
  }
}

export default new FileController();
