import { z } from 'zod';

export const createCompanySchema = z.object({
    body: z.object({
        razonSocial: z.string().min(1, 'Razón Social requerida'),
        cuit: z.string()
            .transform(val => val.replace(/\D/g, '')) // Strip non-digits
            .refine(val => val.length === 11, 'CUIT debe tener 11 dígitos'),
        domicilio: z.string().min(1, 'Domicilio requerido'), // String instead of object
        inicioActividades: z.string().optional() // Make optional or validate date string
    }),
});
