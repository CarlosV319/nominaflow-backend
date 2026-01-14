import express from 'express';
import { createEmployee, getEmployees, getEmployeeById } from '../controllers/employeeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getEmployees)
    .post(createEmployee); // Controller ya valida company ownership

router.route('/:id').get(getEmployeeById);

export default router;
