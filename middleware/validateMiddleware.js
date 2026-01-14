import { z } from 'zod';
import AppError from '../utils/AppError.js';

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            const errorMessages = err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message
            }));

            // Retorna 400 Bad Request con detalles limpios
            return res.status(400).json({
                status: 'fail',
                message: 'Error de validación',
                errors: errorMessages
            });
        }
        next(err);
    }
};

export default validate;
