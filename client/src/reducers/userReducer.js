const SET_USER = 'SET_USER';
const LOGOUT = 'LOGOUT';
const ADD_USED_SPACE = 'ADD_USED_SPACE';
const AUTH_FAILED = 'AUTH_FAILED';

const hasToken = () => {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
};

const defaultState = {
  currentUser: {},
  isAuth: false,
  // Закончилась ли проверка токена при запуске. Пока она идёт (токен есть, ответа ещё нет),
  // приложение не знает, авторизован ли пользователь, и не должно перекидывать его на /login:
  // иначе при обновлении страницы на /folder/<id> адрес терялся бы
  authChecked: !hasToken(),
};

export default function userReducer(state = defaultState, action) {
  switch (action.type) {
    case SET_USER:
      return {
        ...state,
        currentUser: action.payload,
        isAuth: true,
        authChecked: true,
      };
    case AUTH_FAILED:
      return { ...state, authChecked: true };
    case ADD_USED_SPACE:
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          usedSpace: Math.max(
            0,
            (state.currentUser.usedSpace || 0) + action.payload,
          ),
        },
      };
    case LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        currentUser: {},
        isAuth: false,
      };
    default:
      return state;
  }
}

export const setUser = (user) => ({ type: SET_USER, payload: user });
export const logout = () => ({ type: LOGOUT });
export const authFailed = () => ({ type: AUTH_FAILED });
// delta в байтах: положительная после загрузки, отрицательная после удаления
export const addUsedSpace = (delta) => ({ type: ADD_USED_SPACE, payload: delta });
