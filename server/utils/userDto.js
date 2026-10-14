// Данные пользователя, которые уходят на клиент (без пароля и служебных полей).
// avatar — имя файла в папке аватаров; полный адрес клиент строит сам: <сервер>/avatars/<avatar>
export default function toUserDto(user) {
  return {
    id: user.id,
    email: user.email,
    diskSpace: user.diskSpace,
    usedSpace: user.usedSpace,
    avatar: user.avatar ?? null,
  };
}
