import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import AppError from '../utils/AppError.js';

// @desc    Registrar nuevo usuario/tenant
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        throw new AppError('El usuario ya existe', 400);
    }

    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
    });

    if (user) {
        res.status(201).json({
            status: 'success',
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            },
        });
    } else {
        throw new AppError('Datos de usuario inválidos', 400);
    }
};

// @desc    Autenticar usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
        res.json({
            status: 'success',
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            },
        });
    } else {
        throw new AppError('Email o contraseña inválidos', 401);
    }
};

// @desc    Obtener perfil del usuario actual
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    // req.user ya está inyectado por middleware de auth
    const user = await User.findById(req.user.id);

    res.status(200).json({
        status: 'success',
        data: user,
    });
};
