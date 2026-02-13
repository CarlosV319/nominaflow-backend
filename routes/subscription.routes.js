import express from 'express';
import { getSubscriptionStatus } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/status', protect, getSubscriptionStatus);

export default router;
