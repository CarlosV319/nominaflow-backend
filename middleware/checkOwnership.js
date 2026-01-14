import Company from '../models/Company.js';
import AppError from '../utils/AppError.js';

// Ejemplo para verificar propiedad de empresa antes de acciones críticas o sub-recursos
export const checkCompanyOwnership = async (req, res, next) => {
    // Asume que el ID de la empresa viene en params (:companyId) o en body
    const companyId = req.params.companyId || req.params.id || req.body.companyId;

    if (!companyId) return next(); // Si no hay ID, deja pasar (validación la hará el controller o validator)

    const company = await Company.findById(companyId);

    if (!company) {
        throw new AppError('Empresa no encontrada', 404);
    }

    if (company.user.toString() !== req.user.id) {
        throw new AppError('No tienes permiso sobre esta empresa', 403);
    }

    next();
};
