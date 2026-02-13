import express from 'express';
import {
    createCompany,
    getCompanies,
    updateCompany,
    deleteCompany,
} from '../controllers/companyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkCompanyLimit } from '../middleware/checkSubscriptionLimit.js';
import validate from '../middleware/validateMiddleware.js';
import { createCompanySchema } from '../schemas/companySchemas.js';

const router = express.Router();

// Todas las rutas protegidas
router.use(protect);

router
    .route('/')
    .get(getCompanies)
    .post(validate(createCompanySchema), checkCompanyLimit, createCompany);

router
    .route('/:id')
    .put(updateCompany) // updateCompany valida propiedad internamente
    .delete(deleteCompany);

export default router;
