import express from 'express';
import multer from 'multer';
import * as Controller from '../../controllers/pastDueController/pastDueController.js';

const router = express.Router();
const upload = multer(); // in-memory storage

router.post('/upload-excel', upload.single('file'), Controller.uploadExcel);

export default router;