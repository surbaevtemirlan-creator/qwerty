import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { downloadFile, deleteFile } from '../../../../actions/file';
import sizeFormat from '../../../../utils/sizeFormat';
import { folderUrl } from '../../../../utils/routes';
import './file.css';

const File = ({ file }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dirStack = useSelector((state) => state.files.dirStack);
  const isDir = file.type === 'dir';

  // Двойной клик по папке меняет адрес на /folder/<id>; состояние (путь для крошек, список)
  // подстраивается под адрес в Disk
  const openDirHandler = () => {
    if (!isDir) return;
    navigate(folderUrl(file._id));
  };

  const deleteHandler = async () => {
    const warning = isDir ? ' Всё содержимое папки тоже будет удалено.' : '';
    if (!window.confirm(`Удалить «${file.name}»?${warning}`)) return;

    // Папка из результатов поиска может оказаться той, внутри которой мы сейчас находимся:
    // после её удаления адрес /folder/<id> указывал бы в никуда, поэтому уходим на уровень выше
    const index = dirStack.findIndex((dir) => dir.id === file._id);
    const deleted = await dispatch(deleteFile(file));
    if (deleted && index !== -1) {
      navigate(folderUrl(index > 0 ? dirStack[index - 1].id : null), { replace: true });
    }
  };

  return (
    <div
      className={`file ${isDir ? 'file--dir' : ''}`}
      onDoubleClick={openDirHandler}
    >
      <div className="file__icon">{isDir ? '📁' : '📄'}</div>
      <div className="file__name">{file.name}</div>
      <div className="file__date">
        {new Date(file.date).toLocaleDateString('ru-RU')}
      </div>
      <div className="file__size">{isDir ? '—' : sizeFormat(file.size)}</div>
      {/* двойной клик по кнопкам не должен открывать папку */}
      <div className="file__actions" onDoubleClick={(e) => e.stopPropagation()}>
        {!isDir && (
          <button
            className="file__btn"
            title="Скачать"
            onClick={() => downloadFile(file)}
          >
            ⬇
          </button>
        )}
        <button
          className="file__btn file__btn--delete"
          title="Удалить"
          onClick={deleteHandler}
        >
          🗑
        </button>
      </div>
    </div>
  );
};

export default File;
