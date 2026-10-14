import { Router } from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from 'config';
import { check, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.middleware.js';
import File from '../models/File.js';
import FileService from '../services/fileService.js';
import userController from '../controllers/userController.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import toUserDto from '../utils/userDto.js';

const router = new Router();

// Маршрут регистрации
router.post(
  '/registration',
  [
    check('email', 'Некорректный email').isEmail(),
    check(
      'password',
      'Пароль должен быть длиннее 3 и короче 12 символов',
    ).isLength({ min: 3, max: 12 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Некорректный запрос', errors });
      }

      const { email, password } = req.body;

      const candidate = await User.findOne({ email });
      if (candidate) {
        return res
          .status(400)
          .json({ message: `Пользователь с email ${email} уже существует` });
      }

      const hashPassword = await bcrypt.hash(password, 8);
      const user = new User({ email, password: hashPassword });
      // Сначала корневая папка на диске (<filePath>\<userId>\), потом запись в БД: если
      // хранилище недоступно, пользователь не создаётся и регистрацию можно повторить
      const rootDir = new File({ user: user.id, name: '' });
      await FileService.createDir(rootDir);
      try {
        await user.save();
      } catch (e) {
        await FileService.deleteFile(rootDir).catch(() => {});
        throw e;
      }

      return res.json({ message: 'Пользователь успешно создан!' });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'Ошибка сервера на этапе регистрации' });
    }
  },
);

// Маршрут авторизации (логин)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ищем пользователя по email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Сравниваем введенный пароль с хэшем из базы
    const isPassValid = bcrypt.compareSync(password, user.password);
    if (!isPassValid) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }

    // Создаем JWT-токен на 1 час
    const token = jwt.sign({ id: user.id }, config.get('secretKey'), {
      expiresIn: '1h',
    });

    // Возвращаем токен и данные пользователя на клиент
    return res.json({ token, user: toUserDto(user) });
  } catch (e) {
    console.log(e);
    res.send({ message: 'Ошибка сервера на этапе авторизации' });
  }
});
router.get('/auth', authMiddleware, async (req, res) => {
  try {
    // Ищем пользователя по id, который расшифровал middleware
    const user = await User.findOne({ _id: req.user.id });

    // Генерируем новый свежий токен
    const token = jwt.sign({ id: user.id }, config.get('secretKey'), {
      expiresIn: '1h',
    });

    return res.json({ token, user: toUserDto(user) });
  } catch (e) {
    console.log(e);
    res.send({ message: 'Ошибка сервера' });
  }
});

// Аватар: сначала авторизация, затем разбор файла с ограничением размера
router.post('/avatar', authMiddleware, uploadAvatar, userController.uploadAvatar);
router.delete('/avatar', authMiddleware, userController.deleteAvatar);

export default router;
