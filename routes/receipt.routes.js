import express from 'express';
import { createReceipt, getReceipts, downloadReceiptPDF } from '../controllers/receiptController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getReceipts)
    .post(createReceipt); // Snapshot generation logic

router.get('/:id/pdf', downloadReceiptPDF);

export default router;
