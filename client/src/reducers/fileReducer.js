const SET_FILES = 'SET_FILES';
const ADD_FILE = 'ADD_FILE';
const REMOVE_FILE = 'REMOVE_FILE';
const SET_POPUP_DISPLAY = 'SET_POPUP_DISPLAY';
const ENTER_DIR = 'ENTER_DIR';
const SET_DIR_PATH = 'SET_DIR_PATH';
const SET_SORT = 'SET_SORT';

const defaultState = {
  files: [],

  dirStack: [],
  currentDir: null,
  popupDisplay: 'none',
  sort: { by: 'name', dir: 'asc' },
};

const withPath = (state, path) => ({
  ...state,
  dirStack: path,
  currentDir: path.length > 0 ? path[path.length - 1].id : null,
});

export default function fileReducer(state = defaultState, action) {
  switch (action.type) {
    case SET_FILES:
      return { ...state, files: action.payload };
    case ADD_FILE:
      return { ...state, files: [...state.files, action.payload] };
    case REMOVE_FILE: {
      const next = {
        ...state,
        files: state.files.filter((file) => file._id !== action.payload),
      };

      const index = state.dirStack.findIndex((dir) => dir.id === action.payload);
      return index === -1 ? next : withPath(next, state.dirStack.slice(0, index));
    }
    case SET_POPUP_DISPLAY:
      return { ...state, popupDisplay: action.payload };
    case ENTER_DIR:
      return withPath(state, [...state.dirStack, action.payload]);
    case SET_DIR_PATH:
      return withPath(state, action.payload);
    case SET_SORT:
      return { ...state, sort: { ...state.sort, ...action.payload } };
    case 'LOGOUT': // action из userReducer: сбрасываем состояние диска
      return defaultState;
    default:
      return state;
  }
}

export const setFiles = (files) => ({ type: SET_FILES, payload: files });
export const addFile = (file) => ({ type: ADD_FILE, payload: file });
export const removeFile = (id) => ({ type: REMOVE_FILE, payload: id });
export const setPopupDisplay = (display) => ({
  type: SET_POPUP_DISPLAY,
  payload: display,
});

export const enterDir = (dir) => ({ type: ENTER_DIR, payload: dir });

export const setDirPath = (path) => ({ type: SET_DIR_PATH, payload: path });

export const setSort = (sort) => ({ type: SET_SORT, payload: sort });
