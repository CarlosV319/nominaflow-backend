import User from '../models/User.js';
import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import Receipt from '../models/Receipt.js';
import AppError from '../utils/AppError.js';

// @desc    Get all users with their stats
// @route   GET /api/v1/admin/users
// @access  Private/SUPERADMIN
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select('-password');
        
        // Obtenemos estadísticas agregadas para cada usuario
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const companiesCount = await Company.countDocuments({ user: user._id });
            const employeesCount = await Employee.countDocuments({ user: user._id });
            const receiptsCount = await Receipt.countDocuments({ user: user._id });
            
            return {
                ...user._doc,
                stats: {
                    companies: companiesCount,
                    employees: employeesCount,
                    receipts: receiptsCount
                }
            };
        }));

        res.status(200).json({
            status: 'success',
            results: usersWithStats.length,
            data: {
                users: usersWithStats
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user details (plan, status, role, etc)
// @route   PUT /api/v1/admin/users/:id
// @access  Private/SUPERADMIN
export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, role, plan, subscriptionStatus } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return next(new AppError('No se encontró el usuario con ese ID', 404));
        }

        // Prevent modifying the superadmin making the request (optional safety measure)
        // if (user._id.toString() === req.user._id.toString() && role !== 'SUPERADMIN') {
        //     return next(new AppError('No puedes quitarte el rol de SUPERADMIN a ti mismo', 400));
        // }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;
        if (role) user.role = role === 'user' ? 'ADMIN' : role;
        if (plan) user.plan = plan;
        if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;

        // Hotfix for legacy users
        if (!user.firstName) user.firstName = 'Usuario';
        if (!user.lastName) user.lastName = 'Registrado';
        if (user.role === 'user') user.role = 'ADMIN';

        const updatedUser = await user.save();

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/SUPERADMIN
export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return next(new AppError('No se encontró el usuario con ese ID', 404));
        }

        if (user._id.toString() === req.user._id.toString()) {
            return next(new AppError('No puedes eliminar tu propia cuenta de SUPERADMIN', 400));
        }

        // Para evitar huerfanos, podríamos borrar sus empresas, empleados y recibos.
        // Opcional: Implementar soft-delete en User.js.
        await Company.deleteMany({ user: user._id });
        await Employee.deleteMany({ user: user._id });
        await Receipt.deleteMany({ user: user._id });
        
        await user.deleteOne();

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get SaaS Analytics
// @route   GET /api/v1/admin/analytics
// @access  Private/SUPERADMIN
export const getAnalytics = async (req, res, next) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Agregación de usuarios por mes
        const usersByMonth = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Agregación de recibos por mes
        const receiptsByMonth = await Receipt.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Agregación de empleados por mes
        const employeesByMonth = await Employee.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Totales históricos
        const totalUsers = await User.countDocuments();
        const totalReceipts = await Receipt.countDocuments();
        const totalEmployees = await Employee.countDocuments();
        const totalCompanies = await Company.countDocuments();

        // Formatear para el frontend (asegurarse de tener meses continuos)
        const formatData = (agg) => {
            const data = {};
            agg.forEach(item => {
                data[item._id] = item.count;
            });
            return data;
        };

        const uData = formatData(usersByMonth);
        const rData = formatData(receiptsByMonth);
        const eData = formatData(employeesByMonth);

        // Generar array de últimos 6 meses para gráfica combinada
        const chartData = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            
            // Mes en formato corto (ej: "May")
            const monthLabel = d.toLocaleString('es-ES', { month: 'short' }).substring(0, 3).toUpperCase();

            chartData.push({
                name: monthLabel,
                sortKey: monthStr,
                usuarios: uData[monthStr] || 0,
                recibos: rData[monthStr] || 0,
                empleados: eData[monthStr] || 0
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                totals: {
                    users: totalUsers,
                    receipts: totalReceipts,
                    employees: totalEmployees,
                    companies: totalCompanies
                },
                chartData
            }
        });

    } catch (error) {
        next(error);
    }
};
