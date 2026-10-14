import ReactDOM from 'react-dom/client';
import App from './App';
import { store } from './reducers/index.js'; // <--- Убедитесь, что путь указан так
import { Provider } from 'react-redux';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
