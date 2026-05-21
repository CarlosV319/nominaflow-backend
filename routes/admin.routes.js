import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { getAllUsers, updateUser, deleteUser } from '../controllers/adminController.js';

const router = express.Router();

// Todas las rutas de admin están protegidas y restringidas al rol SUPERADMIN
router.use(protect);
router.use(restrictTo('SUPERADMIN'));

router.route('/users')
    .get(getAllUsers);

router.route('/users/:id')
    .put(updateUser)
    .delete(deleteUser);

export default router;
