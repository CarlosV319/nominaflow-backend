import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        firstName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
        lastName: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
        email: z.string().email('Email inválido'),
        password: z.string()
            .min(5, 'Contraseña debe tener al menos 5 caracteres')
            .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
            .regex(/[0-9]/, 'Debe contener al menos un número')
            .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Contraseña es requerida'),
    }),
});
