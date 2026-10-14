import './input.css'; // стили для инпута при необходимости

const Input = (props) => {
  return (
    <input
      onChange={(e) => props.setValue(e.target.value)}
      value={props.value}
      type={props.type}
      placeholder={props.placeholder}
    />
  );
};

export default Input;
