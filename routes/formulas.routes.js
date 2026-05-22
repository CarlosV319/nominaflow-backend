import express from 'express';
import {
  createFormula,
  getFormulas,
  getFormulaById,
  updateFormula,
  deleteFormula
} from '../controllers/formulaController.js';

const router = express.Router();

router.post('/', createFormula);
router.get('/', getFormulas);
router.get('/:id', getFormulaById);
router.put('/:id', updateFormula);
router.delete('/:id', deleteFormula);

export default router;
