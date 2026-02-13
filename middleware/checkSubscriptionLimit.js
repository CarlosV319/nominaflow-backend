import User from '../models/User.js';
import Company from '../models/Company.js';
import Receipt from '../models/Receipt.js';
import AppError from '../utils/AppError.js';

// 1. Configuración de Límites
// 1. Configuración de Límites
const PLAN_LIMITS = {
    INICIAL: { companies: 1, receipts: 5 },
    PROFESIONAL: { companies: 10, receipts: 50 },
    ESTUDIO: { companies: 50, receipts: 500 },
    CORPORATE: { companies: Infinity, receipts: 2000 }
};

// Helper para obtener límites según el usuario
const getLimits = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);

    // Default a INICIAL si el plan no existe o es inválido
    const plan = user.plan || 'INICIAL';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.INICIAL;

    return { plan, limits };
};

// 2. Middleware para Limite de Empresas
export const checkCompanyLimit = async (req, res, next) => {
    try {
        const { plan, limits } = await getLimits(req.user.id);

        // Si es ilimitado, pasar
        if (limits.companies === Infinity) return next();

        const count = await Company.countDocuments({ user: req.user.id });

        if (count >= limits.companies) {
            return next(new AppError(
                `Has alcanzado el límite de ${limits.companies} empresas para tu plan ${plan}. Actualiza a PRO para más capacidad.`,
                403
            ));
        }

        next();
    } catch (error) {
        next(error);
    }
};

// 3. Middleware para Limite de Recibos (Mensual)
export const checkReceiptLimit = async (req, res, next) => {
    try {
        const { plan, limits } = await getLimits(req.user.id);

        if (limits.receipts === Infinity) return next();

        // Rango de fechas: Primer y último día del mes actual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const count = await Receipt.countDocuments({
            user: req.user.id,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        if (count >= limits.receipts) {
            return next(new AppError(
                `Has alcanzado el límite de ${limits.receipts} recibos este mes para tu plan ${plan}. Actualiza tu plan para continuar.`,
                403
            ));
        }

        next();
    } catch (error) {
        next(error);
    }
};

export { PLAN_LIMITS }; // Exportar para uso en controlador
