import User from '../models/User.js';
import Company from '../models/Company.js';
import Receipt from '../models/Receipt.js';
import { PLAN_LIMITS } from '../middleware/checkSubscriptionLimit.js';
import AppError from '../utils/AppError.js';

// @desc    Obtener estado de la suscripción y uso
// @route   GET /api/subscription/status
// @access  Private
export const getSubscriptionStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return next(new AppError('Usuario no encontrado', 404));

        const plan = user.plan || 'FREE';
        // Get limits based on plan or default to FREE
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

        // 1. Uso de Empresas
        const companiesUsed = await Company.countDocuments({ user: req.user.id });

        // 2. Uso de Recibos (Mes Actual)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const receiptsUsed = await Receipt.countDocuments({
            user: req.user.id,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // 3. Cálculo de Porcentajes
        const calcPercentage = (used, limit) => {
            if (limit === Infinity) return 0;
            if (limit === 0) return 100;
            return Math.min(Math.round((used / limit) * 100), 100);
        };

        const statusResponse = {
            plan: {
                name: plan,
                status: user.subscriptionStatus || 'ACTIVE'
            },
            usage: {
                companies: {
                    used: companiesUsed,
                    limit: limits.companies,
                    percentage: calcPercentage(companiesUsed, limits.companies),
                    isUnlimited: limits.companies === Infinity
                },
                receipts: {
                    used: receiptsUsed,
                    limit: limits.receipts,
                    percentage: calcPercentage(receiptsUsed, limits.receipts),
                    period: {
                        month: now.getMonth() + 1,
                        year: now.getFullYear()
                    },
                    isUnlimited: limits.receipts === Infinity
                }
            }
        };

        res.status(200).json({
            status: 'success',
            data: statusResponse
        });

    } catch (error) {
        next(error);
    }
};
