import express from 'express';
import { register, login, getMe, updateDetails, updatePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { registerSchema, loginSchema } from '../schemas/authSchemas.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

export default router;
