import axios from 'axios';
import { API_URL } from '../config';
import { authFailed, setUser } from '../reducers/userReducer'; // Путь к вашему редьюсеру

// Те же ограничения, что и на сервере (там они главные: клиентская проверка только
// экономит запрос и сразу показывает понятную ошибку)
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_SIZE = 2 * 1024 * 1024;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Загрузить или заменить аватар. Сервер возвращает обновлённого пользователя,
// им заменяем currentUser в сторе, и аватар в Navbar меняется сразу
export const uploadAvatar = (file) => {
  return async (dispatch) => {
    if (!AVATAR_TYPES.includes(file.type)) {
      alert('Допустимы только изображения JPEG, PNG или WebP');
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      alert('Файл слишком большой (максимум 2 МБ)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_URL}/auth/avatar`, formData, {
        headers: authHeaders(),
      });
      dispatch(setUser(response.data.user));
    } catch (e) {
      alert(e.response?.data?.message || 'Не удалось загрузить аватар');
    }
  };
};

export const deleteAvatar = () => {
  return async (dispatch) => {
    try {
      const response = await axios.delete(`${API_URL}/auth/avatar`, {
        headers: authHeaders(),
      });
      dispatch(setUser(response.data.user));
    } catch (e) {
      alert(e.response?.data?.message || 'Не удалось удалить аватар');
    }
  };
};

export const registration = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/registration`, {
      email,
      password,
    });
    alert(response.data.message);
  } catch (e) {
    // e.response нет, если сервер недоступен (например, «просыпается» на бесплатном Render)
    alert(e.response?.data?.message || 'Сервер недоступен, попробуйте через минуту');
  }
};


export const login = (email, password) => {
  return async dispatch => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      // Сохраняем токен в localStorage
      localStorage.setItem('token', response.data.token);
      // Записываем пользователя в Redux стор
      dispatch(setUser(response.data.user));
    } catch (e) {
      alert(e.response?.data?.message || 'Сервер недоступен, попробуйте через минуту');
    }
  };
};
export const auth = () => {
  return async dispatch => {
    if (!localStorage.getItem('token')) {
      dispatch(authFailed());
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/auth/auth`, {
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`}
      });
      dispatch(setUser(response.data.user));
      localStorage.setItem('token', response.data.token);
    } catch {
      localStorage.removeItem('token');
      dispatch(authFailed());
    }
  }
};