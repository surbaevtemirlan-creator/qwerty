import express from 'express';
import cors from 'cors';
import authRouter from './routes/routes.js';
import fileRouter from './routes/file.routes.js';
import { avatarDir } from './controllers/userController.js';

// Сборка Express-приложения без подключения к БД и запуска порта:
// index.js запускает его, а проверки могут поднимать его отдельно
export default function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Аватары отдаём как публичную статику: <img src> не умеет слать заголовок Authorization.
  // Имя файла содержит id пользователя и 16 случайных hex-символов, меняется при каждой
  // загрузке, поэтому кэшируем надолго. nosniff: браузер не будет «угадывать» тип файла.
  app.use(
    '/avatars',
    express.static(avatarDir(), {
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  app.use('/api/auth', authRouter);
  app.use('/api/files', fileRouter);

  return app;
}
