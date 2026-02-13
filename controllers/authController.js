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

// @desc    Actualizar detalles del usuario (nombre, email)
// @route   PUT /api/auth/updatedetails
// @access  Private
export const updateDetails = async (req, res) => {
    const fieldsToUpdate = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email
    };

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('Usuario no encontrado', 404);
    }

    // Si intenta cambiar el email, ver si ya existe otro
    if (fieldsToUpdate.email && fieldsToUpdate.email !== user.email) {
        const userExists = await User.findOne({ email: fieldsToUpdate.email });
        if (userExists) {
            throw new AppError('El email ya está en uso por otro usuario', 400);
        }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: updatedUser
    });
};

// @desc    Actualizar contraseña
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // 1. Obtener usuario con password
    const user = await User.findById(req.user.id).select('+password');

    // 2. Verificar password actual
    if (!(await user.matchPassword(currentPassword))) {
        throw new AppError('La contraseña actual es incorrecta', 401);
    }

    // 3. Actualizar password
    user.password = newPassword;
    await user.save(); // Middleware hash se encarga de encriptar

    // 4. Enviar respuesta (opcional: generar nuevo token)
    // Por simplicidad, solo confirmamos éxito y el cliente puede seguir usando su token actual si no expira
    // Opcionalmente podríamos enviar un nuevo token.
    const token = generateToken(user._id);

    res.status(200).json({
        status: 'success',
        token, // Enviamos nuevo token por si acaso
        message: 'Contraseña actualizada correctamente'
    });
};
