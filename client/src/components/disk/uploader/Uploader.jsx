import { useDispatch, useSelector } from 'react-redux';
import { clearUploads } from '../../../reducers/uploadReducer';
import './uploader.css';

const Uploader = () => {
  const dispatch = useDispatch();
  const { isVisible, files } = useSelector((state) => state.upload);

  if (!isVisible) return null;

  return (
    <div className="uploader">
      <div className="uploader__header">
        <div className="uploader__title">Загрузки</div>
        <button className="uploader__close" onClick={() => dispatch(clearUploads())}>
          ×
        </button>
      </div>
      {files.map((f) => (
        <div className="uploader__file" key={f.id}>
          <div className="uploader__name">{f.name}</div>
          <div className="uploader__bar">
            <div
              className={`uploader__progress uploader__progress--${f.status}`}
              style={{ width: `${f.progress}%` }}
            />
          </div>
          <div
            className={`uploader__status ${f.status === 'error' ? 'uploader__status--error' : ''}`}
          >
            {f.status === 'error' ? f.error : `${f.progress}%`}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Uploader;
