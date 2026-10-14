import {
  applyMiddleware,
  combineReducers,
  legacy_createStore as createStore,
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { thunk } from 'redux-thunk';
import userReducer from './userReducer.js';
import fileReducer from './fileReducer.js';
import uploadReducer from './uploadReducer.js';

const rootReducer = combineReducers({
  user: userReducer,
  files: fileReducer,
  upload: uploadReducer,
});

export const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(thunk)),
);
