import { useSelector } from 'react-redux';
import sizeFormat from '../../../utils/sizeFormat';
import './diskSpace.css';

const DiskSpace = () => {
  const { usedSpace = 0, diskSpace = 0 } = useSelector(
    (state) => state.user.currentUser,
  );

  if (!diskSpace) return null;

  const percent = Math.min(100, (usedSpace / diskSpace) * 100);

  return (
    <div className="diskspace">
      <div className="diskspace__text">
        Использовано {sizeFormat(usedSpace)} из {sizeFormat(diskSpace)}
      </div>
      <div className="diskspace__bar">
        <div
          className={`diskspace__used ${percent >= 90 ? 'diskspace__used--full' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default DiskSpace;
