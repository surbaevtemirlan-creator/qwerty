import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import sortFiles from '../../../utils/sortFiles';
import File from './file/File';
import './fileList.css';

const FileList = () => {
  const files = useSelector((state) => state.files.files);
  const { by, dir } = useSelector((state) => state.files.sort);

  const sortedFiles = useMemo(() => sortFiles(files, by, dir), [files, by, dir]);

  if (sortedFiles.length === 0) {
    return <div className="filelist__empty">Файлы не найдены</div>;
  }

  return (
    <div className="filelist">
      <div className="filelist__header">
        <div className="filelist__name">Название</div>
        <div className="filelist__date">Дата</div>
        <div className="filelist__size">Размер</div>
        <div className="filelist__actions" />
      </div>
      {sortedFiles.map((file) => (
        <File key={file._id} file={file} />
      ))}
    </div>
  );
};

export default FileList;
