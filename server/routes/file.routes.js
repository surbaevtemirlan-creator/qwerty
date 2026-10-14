import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import fileController from '../controllers/fileController.js';
import { uploadFiles } from '../middleware/upload.middleware.js';

const router = new Router();

router.post('', authMiddleware, fileController.createDir);
router.get('', authMiddleware, fileController.getFiles);
// сначала авторизация, потом разбор multipart: неавторизованный запрос не буферизуется в памяти
router.post('/upload', authMiddleware, uploadFiles, fileController.uploadFile);
router.get('/download-link', authMiddleware, fileController.createDownloadLink);
// без authMiddleware: браузер не шлёт Authorization при скачивании, доступ даёт токен из ссылки
router.get('/download', fileController.downloadFile);
router.get('/search', authMiddleware, fileController.searchFiles);
router.get('/breadcrumbs', authMiddleware, fileController.getBreadcrumbs);
router.delete('', authMiddleware, fileController.deleteFile);

export default router;
