import express from 'express';
import { createReceipt, getReceipts, downloadReceiptPDF } from '../controllers/receiptController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkReceiptLimit } from '../middleware/checkSubscriptionLimit.js';

const router = express.Router();

// @route   POST /api/receipts
router.route('/')
    .post(protect, checkReceiptLimit, createReceipt)
    .get(protect, getReceipts); // Snapshot generation logic

router.get('/:id/pdf', downloadReceiptPDF);

export default router;
