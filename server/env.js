// Подгружает server/.env в process.env. Должен импортироваться ПЕРВЫМ в index.js:
// пакет config читает переменные окружения в момент своего первого импорта.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Путь от расположения файла, а не от текущей папки, из которой запустили node
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)), quiet: true });
