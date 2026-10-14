const ADD_UPLOAD = 'ADD_UPLOAD';
const UPDATE_UPLOAD = 'UPDATE_UPLOAD';
const CLEAR_UPLOADS = 'CLEAR_UPLOADS';

const defaultState = {
  isVisible: false,
  // { id, name, progress: 0..100, status: 'uploading' | 'done' | 'error', error }
  files: [],
};

export default function uploadReducer(state = defaultState, action) {
  switch (action.type) {
    case ADD_UPLOAD:
      return {
        ...state,
        isVisible: true,
        files: [...state.files, action.payload],
      };
    case UPDATE_UPLOAD:
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id ? { ...f, ...action.payload } : f,
        ),
      };
    case CLEAR_UPLOADS:
      return defaultState;
    case 'LOGOUT': // action из userReducer
      return defaultState;
    default:
      return state;
  }
}

export const addUpload = (file) => ({ type: ADD_UPLOAD, payload: file });
// payload: { id, ...поля, которые нужно обновить }
export const updateUpload = (patch) => ({ type: UPDATE_UPLOAD, payload: patch });
export const clearUploads = () => ({ type: CLEAR_UPLOADS });
