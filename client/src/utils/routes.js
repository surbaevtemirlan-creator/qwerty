// Адрес папки: корень диска — "/", остальные — "/folder/<id>"
export const folderUrl = (id) => (id ? `/folder/${id}` : '/');
