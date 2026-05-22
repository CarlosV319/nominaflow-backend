import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { checkTxtExportFeature } from '../middleware/checkSubscriptionLimit.js';
import { exportConceptsTxt, exportLiquidationsTxt, exportSingleReceiptTxt } from '../controllers/lsdController.js';

const router = express.Router();

// Aplica autenticación y validación de plan de pago a todas las rutas de LSD
router.use(protect);
router.use(checkTxtExportFeature);

// Rutas de Exportación
router.get('/concepts/export/:companyId', exportConceptsTxt);
router.get('/liquidations/export/:companyId', exportLiquidationsTxt);
router.get('/liquidations/export/receipt/:receiptId', exportSingleReceiptTxt);

export default router;
