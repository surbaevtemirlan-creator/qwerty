import { useEffect } from 'react';
import Navbar from './components/navbar/Navbar';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import Registration from './components/authorization/Registration';
import Login from './components/authorization/Login';
import Disk from './components/disk/Disk';
import { useDispatch, useSelector } from 'react-redux';
import { auth } from './actions/user';

function App() {
  const isAuth = useSelector((state) => state.user.isAuth);
  const authChecked = useSelector((state) => state.user.authChecked);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(auth());
  }, [dispatch]);

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <div className="wrap">
          {!authChecked ? (
            // Токен проверяется. Маршруты пока не строим: иначе адрес /folder/<id> при обновлении
            // страницы успел бы смениться на /login (пользователь «ещё не авторизован»)
            <div className="app__loading">Загрузка…</div>
          ) : !isAuth ? (
            <Routes>
              <Route path="/registration" element={<Registration />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={<Disk />} />
              <Route path="/folder/:dirId" element={<Disk />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
