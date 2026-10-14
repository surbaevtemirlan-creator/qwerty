import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Input from '../input/Input';
import { createDir } from '../../actions/file';
import { setPopupDisplay } from '../../reducers/fileReducer';

const Popup = () => {
  const [dirName, setDirName] = useState('');
  const popupDisplay = useSelector((state) => state.files.popupDisplay);
  const currentDir = useSelector((state) => state.files.currentDir);
  const dispatch = useDispatch();

  const close = () => dispatch(setPopupDisplay('none'));

  const createHandler = async () => {
    const name = dirName.trim();
    if (!name) return;
    const created = await dispatch(createDir(currentDir, name));
    if (created) {
      setDirName('');
      close();
    }
  };

  return (
    <div
      className="popup"
      style={{ display: popupDisplay }}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Enter') createHandler();
      }}
    >
      <div className="popup__content" onClick={(e) => e.stopPropagation()}>
        <div className="popup__header">
          <div className="popup__title">Создать новую папку</div>
          <button className="popup__close" onClick={close}>
            ×
          </button>
        </div>
        <Input
          type="text"
          placeholder="Введите название папки..."
          value={dirName}
          setValue={setDirName}
        />
        <button
          className="popup__create"
          onClick={createHandler}
          disabled={!dirName.trim()}
        >
          Создать
        </button>
      </div>
    </div>
  );
};

export default Popup;
