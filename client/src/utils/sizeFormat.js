export default function sizeFormat(size) {
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(1)} ГБ`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} МБ`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${size} Б`;
}
