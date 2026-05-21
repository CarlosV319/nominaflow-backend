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
        if (role) user.role = role;
        if (plan) user.plan = plan;
        if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;

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
