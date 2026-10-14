// Адрес сервера. По умолчанию — боевой сервер на Render. Для локальной разработки создайте
// client/.env.local со строкой VITE_SERVER_URL=http://localhost:5000 (значение подставляется при сборке)
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://qwerty-server.onrender.com';
export const API_URL = `${SERVER_URL}/api`;
// Аватары отдаются сервером как публичная статика: <AVATAR_URL>/<имя файла из user.avatar>
export const AVATAR_URL = `${SERVER_URL}/avatars`;
