import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

// Middleware para proteger rutas (Verificar JWT)
export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        throw new AppError('No estás logueado. Por favor inicia sesión.', 401);
    }

    // 2) Verificación del token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Verificar si el usuario aún existe
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        throw new AppError('El usuario de este token ya no existe.', 401);
    }

    // 4) Verificar si el usuario cambió la contraseña después de emitir el token
    // (Opcional: implementar campo passwordChangedAt en modelo User si se requiere esta seguridad extra)
    // if (currentUser.changedPasswordAfter(decoded.iat)) {
    //   throw new AppError('Usuario cambió contraseña recientemente. Por favor logueate de nuevo.', 401);
    // }

    // RANT: Inyectar usuario en la request
    req.user = currentUser;
    next();
};

// Middleware para restringir acceso por roles (RBAC)
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'accountant']. role='user'
        if (!roles.includes(req.user.role)) {
            throw new AppError('No tienes permiso para realizar esta acción', 403);
        }
        next();
    };
};
