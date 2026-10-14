import './env.js';
import mongoose from 'mongoose';
import config from 'config';
import createApp from './app.js';
import { sweepStaleTempFiles } from './utils/tempFiles.js';

const missing = [
  ['dbUrl', 'DB_URL'],
  ['secretKey', 'JWT_SECRET'],
].filter(([key]) => !config.has(key));
if (missing.length > 0) {
  console.error(
    `Не заданы переменные окружения: ${missing.map(([, env]) => env).join(', ')}.\n` +
      'Создайте server/.env по образцу server/.env.example',
  );
  process.exit(1);
}

const app = createApp();
const PORT = config.get('serverPort') || 5000;

const start = async () => {
  try {
    await mongoose.connect(config.get('dbUrl'));
    console.log('Успешное подключение к MongoDB Atlas!');

    app.listen(PORT, () => {
      console.log('Сервер запущен на порту', PORT);
    });

    const sweep = () =>
      sweepStaleTempFiles().then((n) => n && console.log('Удалено старых временных файлов:', n));
    sweep();
    setInterval(sweep, 30 * 60 * 1000).unref();
  } catch (e) {
    console.log('Ошибка при запуске сервера:', e);
  }
};

start();
