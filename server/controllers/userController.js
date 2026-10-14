import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import config from 'config';
import User from '../models/User.js';
import { AVATAR_MAX_SIZE } from '../middleware/upload.middleware.js';
import { detectImageType } from '../utils/imageType.js';
import toUserDto from '../utils/userDto.js';

// Папка аватаров. Отдельная от файлов пользователей: раздаётся как статика (/avatars)
export const avatarDir = () => path.resolve(config.get('avatarPath'));

// Имена создаём только мы: <id пользователя>-<16 hex>.<png|jpg|webp>. Эту же форму проверяем
// перед удалением, чтобы подменённое в БД значение не позволило удалить посторонний файл
const AVATAR_NAME = /^[0-9a-f]{24}-[0-9a-f]{16}\.(png|jpg|webp)$/;

const removeAvatarFile = async (name) => {
  if (!name || !AVATAR_NAME.test(name)) return;
  try {
    await fs.promises.rm(path.join(avatarDir(), name), { force: true });
  } catch (e) {
    console.log('Не удалось удалить файл аватара', name, e.message);
  }
};

class UserController {
  // POST /api/auth/avatar (multipart, поле "file") → { user }
  async uploadAvatar(req, res) {
    try {
      const file = req.files?.file;
      if (!file || Array.isArray(file)) {
        return res.status(400).json({ message: 'Файл не передан' });
      }
      if (file.truncated || file.size > AVATAR_MAX_SIZE) {
        return res.status(413).json({
          message: `Файл слишком большой (максимум ${AVATAR_MAX_SIZE / 1024 / 1024} МБ)`,
        });
      }

      // Формат определяем по содержимому, а не по имени и mimetype из запроса
      const ext = detectImageType(file.data);
      if (!ext) {
        return res
          .status(400)
          .json({ message: 'Допустимы только изображения JPEG, PNG или WebP' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Новое имя при каждой загрузке: старая картинка не остаётся в кэше браузера
      const name = `${user.id}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
      await fs.promises.mkdir(avatarDir(), { recursive: true });
      await fs.promises.writeFile(path.join(avatarDir(), name), file.data);

      const previous = user.avatar;
      try {
        user.avatar = name;
        await user.save();
      } catch (e) {
        await removeAvatarFile(name); // не оставляем файл-сироту
        throw e;
      }
      await removeAvatarFile(previous);

      return res.json({ user: toUserDto(user) });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при загрузке аватара' });
    }
  }

  // DELETE /api/auth/avatar → { user }. Повторный вызов безвреден
  async deleteAvatar(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      const previous = user.avatar;
      user.avatar = undefined;
      await user.save();
      await removeAvatarFile(previous);

      return res.json({ user: toUserDto(user) });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Ошибка при удалении аватара' });
    }
  }
}

export default new UserController();
