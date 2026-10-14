import config from 'config';
import fileUpload from 'express-fileupload';
import { ensureTempDir, removeRequestTempFiles, tempDir } from '../utils/tempFiles.js';

export const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2 МБ

// Максимальный размер одного загружаемого файла (config: maxUploadSize, env MAX_UPLOAD_SIZE).
// В переменных окружения число приходит строкой, поэтому Number()
export const maxUploadSize = () => Number(config.get('maxUploadSize'));

// Гарантирует, что временные файлы запроса удаляются при любом исходе: успех (после file.mv
// их уже нет), ошибка валидации, 4xx/5xx, обрыв соединения клиентом. 'close' у ответа
// срабатывает во всех этих случаях. Регистрируется ДО разбора формы.
const prepareTempFiles = (req, res, next) => {
  ensureTempDir();
  res.once('close', () => {
    removeRequestTempFiles(req);
  });
  next();
};

// Загрузка файлов на диск пользователя. Подключается на уровне маршрута ПОСЛЕ authMiddleware:
// неавторизованный запрос не разбирается и ничего не пишет на диск.
// useTempFiles: файл пишется на диск кусками, а не копится целиком в памяти процесса.
// limits.fileSize + 1: busboy помечает файл обрезанным уже при достижении лимита,
// поэтому файл ровно в maxUploadSize байт иначе был бы отклонён (контроллер видит
// file.truncated и отвечает 413; лишнее после лимита на диск не пишется).
// defParamCharset: имена файлов на кириллице приходят в utf8, иначе портятся
export const uploadFiles = [
  prepareTempFiles,
  (req, res, next) =>
    fileUpload({
      useTempFiles: true,
      tempFileDir: tempDir(),
      createParentPath: true,
      defParamCharset: 'utf8',
      limits: { fileSize: maxUploadSize() + 1 },
    })(req, res, next),
];

// Аватар: небольшой (2 МБ), поэтому остаётся в памяти; лишнее обрезается на лету
// (без abortOnLimit: так остаётся возможность ответить JSON-ом), в память попадает не больше
// AVATAR_MAX_SIZE + 1 байт; контроллер видит file.truncated (см. «+ 1» выше)
export const uploadAvatar = fileUpload({
  defParamCharset: 'utf8',
  limits: { fileSize: AVATAR_MAX_SIZE + 1, files: 1 },
});
