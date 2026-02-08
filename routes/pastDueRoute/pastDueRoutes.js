import express from 'express';
import multer from 'multer';
import * as Controller from '../../controllers/pastDueController/pastDueController.js';
import { authenticateJWT } from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/permissionMiddleware.js';

const router = express.Router();
const upload = multer();

// Upload → Department 1
router.post(
    '/upload-excel',
    authenticateJWT,
    requirePermission('canUpload'),
    upload.single('file'),
    Controller.uploadExcel
);

// Export → Department 2
router.get(
    '/export-excel',
    authenticateJWT,
    requirePermission('canExport'),
    Controller.exportExcel
);

export default router;
