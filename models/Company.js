import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true // Índice para buscar rápidamente todas las empresas de un usuario
    },
    razonSocial: {
        type: String,
        required: [true, 'La Razón Social es requerida'],
        trim: true
    },
    cuit: {
        type: String,
        required: [true, 'El CUIT es requerido'],
        unique: true,
        length: 11,
        match: [/^\d{11}$/, 'El CUIT debe contener solo 11 números']
    },
    domicilio: {
        type: String,
        required: [true, 'El domicilio es requerido']
    },
    inicioActividades: {
        type: Date
    },
    rubro: {
        type: String
    },
    logoUrl: {
        type: String
    },
    // ─── Nuevos campos Fase 1 (Normativa 2026) ──────────
    tipoEmpleador: {
        type: String,
        enum: ['mipyme', 'gran_empresa_servicios'],
        default: 'mipyme'   // MiPyME = alícuota patronal 18%, Gran Empresa = 20.40%
    },
    cct: {
        type: String,
        default: ''         // Convenio Colectivo de Trabajo (ej: '130/75', '260/75', '40/89')
    },
    falAdhesionDate: {
        type: Date          // Fecha en la que la empresa se adhirió al Fondo de Asistencia Laboral (FAL)
    },
    // ─── Fin campos Fase 1 ──────────────────────────────
    conceptosPersonalizados: [
        {
            codigo: { type: String, required: true },
            concepto: { type: String, required: true },
            tipoCalculo: {
                type: String,
                enum: ['unidades', 'porcentaje'],
                default: 'unidades'
            },
            tipoConcepto: {
                type: String,
                enum: ['remunerativo', 'no_remunerativo', 'deduccion'],
                required: true
            }
        }
    ],
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Company = mongoose.model('Company', companySchema);
export default Company;
