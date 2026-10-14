import jwt from 'jsonwebtoken';
import config from 'config';

export default function (req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    // Достаем токен из заголовка Authorization (формат: "Bearer TOKEN")
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Нет авторизации' });
    }

    // Декодируем и проверяем токен
    const decoded = jwt.verify(token, config.get('secretKey'));
    req.user = decoded; // Прикрепляем данные пользователя к запросу
    next(); // Идем дальше к обработчику маршрута
  } catch (e) {
    return res.status(401).json({ message: 'Нет авторизации' });
  }
}
