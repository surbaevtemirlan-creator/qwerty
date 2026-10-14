import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  getFiles,
  rejectUpload,
  searchFiles,
  syncDir,
  uploadFiles,
} from '../../actions/file';
import { extractDroppedFiles, hasFiles } from '../../utils/dropFiles';
import { setPopupDisplay, setSort } from '../../reducers/fileReducer';
import Breadcrumbs from './breadcrumbs/Breadcrumbs';
import DiskSpace from './diskSpace/DiskSpace';
import FileList from './fileList/FileList';
import Popup from './Popup';
import Uploader from './uploader/Uploader';
import './disk.css';

const Disk = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { dirId } = useParams(); // есть только на /folder/:dirId; на «/» — undefined (корень)
  const target = dirId ?? null;
  const currentDir = useSelector((state) => state.files.currentDir);
  const sort = useSelector((state) => state.files.sort);
  const popupDisplay = useSelector((state) => state.files.popupDisplay);
  const [isDragging, setIsDragging] = useState(false);

  // Папка из адреса уже определена (для вложенной после F5 сначала нужен запрос пути).
  // Пока нет, не грузим список и не принимаем загрузки: иначе они ушли бы в корень
  const ready = target === currentDir;

  // Адрес — источник правды: при любой его смене (клик, крошки, «назад/вперёд», F5)
  // подстраиваем текущую папку и путь для крошек. Несуществующая папка → корень с сообщением
  useEffect(() => {
    let cancelled = false;
    dispatch(syncDir(target)).then((status) => {
      if (cancelled || status === 'ok' || status === 'stale') return;
      const notice =
        status === 'not-found'
          ? 'Папка не найдена, открыт корень диска'
          : 'Не удалось открыть папку, открыт корень диска';
      navigate('/', { replace: true, state: { notice } });
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate, target]);

  const notice = location.state?.notice;

  const [search, setSearch] = useState('');
  // Смена папки (например, двойной клик по найденной папке или «Назад») сбрасывает поиск.
  // Состояние сбрасываем прямо во время рендера, это штатный приём React вместо setState в эффекте
  const [prevDir, setPrevDir] = useState(currentDir);
  if (prevDir !== currentDir) {
    setPrevDir(currentDir);
    setSearch('');
  }

  // Загружаем содержимое при входе на диск и при каждой смене папки
  useEffect(() => {
    if (ready) dispatch(getFiles(currentDir));
  }, [dispatch, currentDir, ready]);

  // Поиск с задержкой, чтобы не слать запрос на каждую букву
  useEffect(() => {
    const query = search.trim();
    if (!query) return;
    const timer = setTimeout(() => dispatch(searchFiles(query)), 400);
    return () => clearTimeout(timer);
  }, [dispatch, search]);

  // Drag-and-drop файлов с компьютера. Слушаем window, а не отдельный блок:
  // так файл, отпущенный мимо списка (на шапке, в пустой области), тоже не откроется
  // в браузере вместо загрузки. dragenter/dragleave срабатывают на каждом вложенном
  // элементе, поэтому считаем «глубину» входов, чтобы оверлей не мигал.
  useEffect(() => {
    // Пока открыто окно создания папки или папка ещё не определена, загрузки не принимаем,
    // но слушатели остаются: файл, брошенный на страницу, всё равно не должен открыться в браузере
    const popupOpen = popupDisplay !== 'none' || !ready;
    let depth = 0;

    const onDragEnter = (e) => {
      if (!hasFiles(e.dataTransfer)) return; // выделенный текст, ссылки и т.п.
      e.preventDefault();
      depth += 1;
      if (!popupOpen) setIsDragging(true);
    };
    const onDragOver = (e) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault(); // без этого браузер не разрешит drop на странице
      e.dataTransfer.dropEffect = popupOpen ? 'none' : 'copy';
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e.dataTransfer)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    };
    const onDrop = (e) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      depth = 0;
      setIsDragging(false);
      if (popupOpen) return;

      // dataTransfer читаем сразу, до любых await
      const { files, folders } = extractDroppedFiles(e.dataTransfer);
      folders.forEach((name) =>
        dispatch(rejectUpload(name, 'Загрузка папок не поддерживается')),
      );
      if (files.length > 0) dispatch(uploadFiles(files, currentDir));
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [dispatch, currentDir, popupDisplay, ready]);

  const searchChangeHandler = (e) => {
    const query = e.target.value;
    setSearch(query);
    // Строку очистили — возвращаем обычное содержимое текущей папки
    if (!query.trim()) {
      dispatch(getFiles(currentDir));
    }
  };

  const fileUploadHandler = (e) => {
    const files = [...e.target.files];
    e.target.value = ''; // чтобы тот же файл можно было выбрать повторно
    dispatch(uploadFiles(files, currentDir));
  };

  if (!ready) {
    return (
      <div className="disk">
        <div className="disk__loading">Загрузка папки…</div>
      </div>
    );
  }

  return (
    <div className="disk">
      {notice && (
        <div className="disk__notice" role="status">
          <span>{notice}</span>
          <button
            className="disk__notice-close"
            aria-label="Закрыть сообщение"
            onClick={() => navigate(location.pathname, { replace: true, state: null })}
          >
            ×
          </button>
        </div>
      )}
      <Breadcrumbs />
      <div className="disk__btns">
        <input
          className="disk__search"
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={searchChangeHandler}
        />
        <div className="disk__actions">
          <button
            className="disk__create"
            onClick={() => dispatch(setPopupDisplay('flex'))}
          >
            Создать папку
          </button>
          <label className="disk__upload">
            Загрузить файл
            <input type="file" multiple hidden onChange={fileUploadHandler} />
          </label>
        </div>
      </div>
      <div className="disk__info">
        <DiskSpace />
        <div className="disk__sort">
          <label htmlFor="disk-sort">Сортировка:</label>
          <select
            id="disk-sort"
            className="disk__sort-select"
            value={sort.by}
            onChange={(e) => dispatch(setSort({ by: e.target.value }))}
          >
            <option value="name">По имени</option>
            <option value="date">По дате</option>
            <option value="size">По размеру</option>
          </select>
          <button
            className="disk__sort-dir"
            title={sort.dir === 'asc' ? 'По возрастанию' : 'По убыванию'}
            onClick={() =>
              dispatch(setSort({ dir: sort.dir === 'asc' ? 'desc' : 'asc' }))
            }
          >
            {sort.dir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
      <FileList />
      <Popup />
      <Uploader />
      {isDragging && (
        <div className="dropzone">
          <div className="dropzone__box">
            <div className="dropzone__title">Перетащите файлы сюда</div>
            <div className="dropzone__hint">
              Отпустите, чтобы загрузить в текущую папку
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disk;
