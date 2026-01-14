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
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Company = mongoose.model('Company', companySchema);
export default Company;
