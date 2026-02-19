import express from 'express';
import multer from 'multer';
import * as Controller from '../../controllers/pastDueController/pastDueController.js';
import { authenticateJWT } from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/permissionMiddleware.js';

const router = express.Router();
const upload = multer();

// Upload → Department 1
router.post('/upload-excel', authenticateJWT, requirePermission('canUpload'), upload.single('file'), Controller.uploadExcel);

// Export → Department 2
router.get('/export-excel', authenticateJWT, requirePermission(['canExport', 'canImport']), Controller.exportExcel);

// Admin-only view
router.get('/admin-view',  authenticateJWT, requirePermission(['canExport', 'canImport', 'viewOnly']), Controller.getAdminReports);

// View → Department 3
router.get('/department-view/', authenticateJWT, requirePermission('viewOnly'), Controller.getDepartmentReports);

//
router.get('/load-due-details', authenticateJWT, requirePermission('viewOnly'), Controller.getLoanDueDetails)

// // Department view: view-only allowed
// router.get(
//     '/department-view',
//     authenticateJWT,
//     requirePermission(['viewOnly', 'canUpload', 'canImport', 'canExport']),
//     Controller.getDepartmentReports
// );

// // Upload Excel: only PLA/LMG
// router.post(
//     '/upload-excel',
//     authenticateJWT,
//     requirePermission(['canUpload']),
//     Controller.uploadExcel
// );

// // Export Excel: only LMG, MD, Admin
// router.get(
//     '/export-excel',
//     authenticateJWT,
//     requirePermission(['canExport']),
//     Controller.exportExcel
// );

// // Transaction: only FC
// router.post(
//     '/transaction',
//     authenticateJWT,
//     requirePermission(['canTransaction']),
//     Controller.handleTransaction
// );


export default router;
