const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

const byName = (a, b) => collator.compare(a.name, b.name);

const comparators = {
  name: byName,
  date: (a, b) => new Date(a.date) - new Date(b.date),
  size: (a, b) => (a.size || 0) - (b.size || 0),
};

// Возвращает новый отсортированный массив (исходный не меняется).
// Папки всегда выше файлов, направление dir ('asc' | 'desc') действует внутри каждой группы.
// Имена сравниваются «естественно» (file2 раньше file10, регистр не важен),
// при равенстве значений порядок определяет имя.
export default function sortFiles(files, by = 'name', dir = 'asc') {
  const compare = comparators[by] || byName;
  const sign = dir === 'desc' ? -1 : 1;

  return [...files].sort((a, b) => {
    const aIsDir = a.type === 'dir';
    const bIsDir = b.type === 'dir';
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;

    // У папок размера нет: при сортировке по размеру они идут по имени в любом направлении
    if (by === 'size' && aIsDir) return byName(a, b);

    return compare(a, b) * sign || byName(a, b);
  });
}
