// Адрес сервера можно переопределить переменной VITE_SERVER_URL (client/.env.local),
// например, если порт 5000 занят. По умолчанию — локальный сервер на порту 5000
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
export const API_URL = `${SERVER_URL}/api`;
// Аватары отдаются сервером как публичная статика: <AVATAR_URL>/<имя файла из user.avatar>
export const AVATAR_URL = `${SERVER_URL}/avatars`;
