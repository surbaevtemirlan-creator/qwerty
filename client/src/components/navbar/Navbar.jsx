import { useEffect, useRef, useState } from 'react';
import './navbar.css';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../reducers/userReducer';
import { deleteAvatar, uploadAvatar } from '../../actions/user';
import { AVATAR_URL } from '../../config';

const Navbar = () => {
  const isAuth = useSelector((state) => state.user.isAuth);
  const user = useSelector((state) => state.user.currentUser);
  const dispatch = useDispatch();

  const [menuOpen, setMenuOpen] = useState(false);
  // имя аватара, который не удалось загрузить (сервер недоступен, файл пропал): показываем букву
  const [brokenAvatar, setBrokenAvatar] = useState(null);
  const profileRef = useRef(null);

  // Меню закрывается по клику вне него и по Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (!profileRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const showImage = Boolean(user.avatar) && brokenAvatar !== user.avatar;
  const initial = (user.email || '?').charAt(0).toUpperCase();

  const avatarChangeHandler = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // чтобы можно было выбрать тот же файл повторно
    setMenuOpen(false);
    if (file) dispatch(uploadAvatar(file));
  };

  const logoutHandler = () => {
    setMenuOpen(false);
    dispatch(logout());
  };

  return (
    <div className="navbar">
      <div className="container">
        <div className="navbar__header">MERN Cloud Disk</div>
        {!isAuth && (
          <>
            <div className="navbar__login">
              <NavLink to="/login">Войти</NavLink>
            </div>
            <div className="navbar__registration">
              <NavLink to="/registration">Регистрация</NavLink>
            </div>
          </>
        )}
        {isAuth && (
          <div className="navbar__profile" ref={profileRef}>
            <button
              className="navbar__avatar-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Профиль"
            >
              {showImage ? (
                <img
                  className="navbar__avatar-img"
                  src={`${AVATAR_URL}/${user.avatar}`}
                  alt="Аватар"
                  onError={() => setBrokenAvatar(user.avatar)}
                />
              ) : (
                <span className="navbar__avatar-fallback">{initial}</span>
              )}
            </button>
            {menuOpen && (
              <div className="navbar__menu" role="menu">
                <div className="navbar__menu-email" title={user.email}>
                  {user.email}
                </div>
                <label className="navbar__menu-item" role="menuitem">
                  {user.avatar ? 'Сменить аватар' : 'Загрузить аватар'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={avatarChangeHandler}
                  />
                </label>
                {user.avatar && (
                  <button
                    className="navbar__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      dispatch(deleteAvatar());
                    }}
                  >
                    Удалить аватар
                  </button>
                )}
                <button
                  className="navbar__menu-item"
                  role="menuitem"
                  onClick={logoutHandler}
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
