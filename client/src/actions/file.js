import axios from 'axios';
import { API_URL } from '../config';
import {
  addFile,
  enterDir,
  removeFile,
  setDirPath,
  setFiles,
} from '../reducers/fileReducer';
import { addUpload, updateUpload } from '../reducers/uploadReducer';
import { addUsedSpace } from '../reducers/userReducer';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Номер последнего запроса списка: если пришёл ответ на более старый запрос
// (быстро сменили папку или поисковую строку), его результат игнорируем
let latestListRequest = 0;

// Получить содержимое папки dirId (null — корень диска)
export const getFiles = (dirId) => {
  return async (dispatch) => {
    const requestId = ++latestListRequest;
    try {
      const response = await axios.get(`${API_URL}/files`, {
        params: { parent: dirId }, // null/undefined axios в запрос не добавляет
        headers: authHeaders(),
      });
      if (requestId === latestListRequest) {
        dispatch(setFiles(response.data.files));
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Не удалось получить файлы');
    }
  };
};

// Номер последней синхронизации: если адрес успел смениться снова (быстрые «назад/вперёд»),
// результат более раннего запроса применять нельзя
let latestDirSync = 0;

// Приводит текущую папку и путь для крошек в соответствие с адресом /folder/:id (null — корень).
// Адрес — источник правды: все переходы (двойной клик, крошки, «назад/вперёд» браузера, F5)
// только меняют URL, а состояние подстраивается здесь. Порядок от дешёвого к дорогому:
//   1) уже там — ничего не делаем;
//   2) корень или папка выше по текущему пути — просто обрезаем путь;
//   3) дочерняя папка текущей, есть в списке — добавляем уровень;
//   4) иначе (F5, прямая ссылка, найденная поиском вложенная папка) — путь спрашиваем у сервера.
// Возвращает 'ok' | 'stale' | 'not-found' | 'error'
export const syncDir = (dirId) => {
  return async (dispatch, getState) => {
    const syncId = ++latestDirSync;
    const { currentDir, dirStack, files } = getState().files;

    if (dirId === currentDir) return 'ok';

    if (dirId === null) {
      dispatch(setDirPath([]));
      return 'ok';
    }

    const ancestor = dirStack.findIndex((dir) => dir.id === dirId);
    if (ancestor !== -1) {
      dispatch(setDirPath(dirStack.slice(0, ancestor + 1)));
      return 'ok';
    }

    const child = files.find(
      (file) =>
        file._id === dirId && file.type === 'dir' && (file.parent ?? null) === currentDir,
    );
    if (child) {
      dispatch(enterDir({ id: child._id, name: child.name }));
      return 'ok';
    }

    try {
      const response = await axios.get(`${API_URL}/files/breadcrumbs`, {
        params: { id: dirId },
        headers: authHeaders(),
      });
      if (syncId !== latestDirSync) return 'stale';
      dispatch(setDirPath(response.data.path));
      return 'ok';
    } catch (e) {
      if (syncId !== latestDirSync) return 'stale';
      return e.response?.status === 404 ? 'not-found' : 'error';
    }
  };
};

// Поиск по имени среди всех файлов и папок пользователя
export const searchFiles = (search) => {
  return async (dispatch) => {
    const requestId = ++latestListRequest;
    try {
      const response = await axios.get(`${API_URL}/files/search`, {
        params: { search },
        headers: authHeaders(),
      });
      if (requestId === latestListRequest) {
        dispatch(setFiles(response.data.files));
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Не удалось выполнить поиск');
    }
  };
};

// Создать папку name внутри dirId. Возвращает true при успехе
export const createDir = (dirId, name) => {
  return async (dispatch) => {
    try {
      const response = await axios.post(
        `${API_URL}/files`,
        { name, parent: dirId, type: 'dir' },
        { headers: authHeaders() },
      );
      dispatch(addFile(response.data));
      return true;
    } catch (e) {
      alert(e.response?.data?.message || 'Не удалось создать папку');
      return false;
    }
  };
};

const newUploadId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Показать в панели загрузок, что элемент загружен не будет (например, перетащили папку)
export const rejectUpload = (name, message) => {
  return (dispatch) => {
    dispatch(
      addUpload({
        id: newUploadId(),
        name,
        progress: 0,
        status: 'error',
        error: message,
      }),
    );
  };
};

// Загрузить один файл в папку dirId (null — корень). Прогресс идёт в upload-стор
export const uploadFile = (file, dirId) => {
  return async (dispatch, getState) => {
    const id = newUploadId();
    dispatch(
      addUpload({ id, name: file.name, progress: 0, status: 'uploading' }),
    );

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (dirId) {
        formData.append('parent', dirId);
      }

      const response = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: authHeaders(),
        onUploadProgress: (e) => {
          if (e.total) {
            dispatch(
              updateUpload({ id, progress: Math.round((e.loaded * 100) / e.total) }),
            );
          }
        },
      });

      dispatch(updateUpload({ id, progress: 100, status: 'done' }));
      dispatch(addUsedSpace(response.data.size));
      // Если за время загрузки перешли в другую папку, в её список файл не добавляем
      if (getState().files.currentDir === dirId) {
        dispatch(addFile(response.data));
      }
    } catch (e) {
      dispatch(
        updateUpload({
          id,
          status: 'error',
          error: e.response?.data?.message || 'Ошибка загрузки',
        }),
      );
    }
  };
};

// Загрузить несколько файлов по очереди (и кнопка «Загрузить файл», и drag-and-drop).
// Не параллельно: так проще следить за прогрессом и не перегружать сервер
export const uploadFiles = (files, dirId) => {
  return async (dispatch) => {
    for (const file of files) {
      await dispatch(uploadFile(file, dirId));
    }
  };
};

// Скачать файл потоком. Обычная ссылка не может передать заголовок Authorization,
// а axios с responseType 'blob' собрал бы файл целиком в памяти вкладки. Поэтому:
// просим у сервера токен на 60 секунд (это запрос с авторизацией), а само скачивание
// отдаём браузеру: он принимает файл потоком и пишет прямо на диск, с менеджером загрузок
// и докачкой. Имя файла и заголовок attachment задаёт сервер (Content-Disposition).
export const downloadFile = async (file) => {
  try {
    const response = await axios.get(`${API_URL}/files/download-link`, {
      params: { id: file._id },
      headers: authHeaders(),
    });

    const link = document.createElement('a');
    link.href = `${API_URL}/files/download?token=${encodeURIComponent(response.data.token)}`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (e) {
    alert(e.response?.data?.message || 'Не удалось скачать файл');
  }
};

// Удалить файл или папку (папка удаляется вместе со всем содержимым)
export const deleteFile = (file) => {
  return async (dispatch) => {
    try {
      const response = await axios.delete(`${API_URL}/files`, {
        params: { id: file._id },
        headers: authHeaders(),
      });
      dispatch(removeFile(file._id));
      dispatch(addUsedSpace(-(response.data.freedSpace || 0)));
      return true;
    } catch (e) {
      alert(e.response?.data?.message || 'Не удалось удалить');
      return false;
    }
  };
};
