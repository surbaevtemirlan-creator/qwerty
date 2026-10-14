import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { folderUrl } from '../../../utils/routes';
import './breadcrumbs.css';

// Диск › Фото › Отчёты. Каждая крошка, кроме последней, — настоящая ссылка на папку
// (/folder/<id>): работает «назад/вперёд», открытие в новой вкладке и копирование адреса
const Breadcrumbs = () => {
  const dirStack = useSelector((state) => state.files.dirStack);

  // Корень диска — всегда первая крошка; остальные — папки из dirStack
  const crumbs = [{ id: null, name: 'Диск' }, ...dirStack];

  return (
    <nav className="breadcrumbs" aria-label="Путь к текущей папке">
      {crumbs.map((crumb, index) => {
        const isCurrent = index === crumbs.length - 1;
        return (
          <span className="breadcrumbs__item" key={crumb.id ?? 'root'}>
            {index > 0 && <span className="breadcrumbs__sep">›</span>}
            {isCurrent ? (
              <span
                className="breadcrumbs__current"
                aria-current="page"
                title={crumb.name}
              >
                {crumb.name}
              </span>
            ) : (
              <Link
                className="breadcrumbs__link"
                title={crumb.name}
                to={folderUrl(crumb.id)}
              >
                {crumb.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
