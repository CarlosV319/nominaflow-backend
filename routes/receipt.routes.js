import express from 'express';
import { 
    createReceipt, 
    getReceipts, 
    downloadReceiptPDF,
    calculateReceipt,
    calculateSACReceipt,
    calculateVacacionesReceipt,
    calculateFinalReceipt
} from '../controllers/receiptController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkReceiptLimit } from '../middleware/checkSubscriptionLimit.js';

const router = express.Router();

// Rutas de cálculo (Pre-liquidación)
router.post('/calculate', protect, calculateReceipt);
router.post('/calculate-sac', protect, calculateSACReceipt);
router.post('/calculate-vacaciones', protect, calculateVacacionesReceipt);
router.post('/calculate-final', protect, calculateFinalReceipt);

// @route   POST /api/receipts
router.route('/')
    .post(protect, checkReceiptLimit, createReceipt)
    .get(protect, getReceipts); // Snapshot generation logic

router.get('/:id/pdf', protect, downloadReceiptPDF);

export default router;
