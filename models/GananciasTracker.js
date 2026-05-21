import mongoose from 'mongoose';

const AcumuladoMesSchema = new mongoose.Schema({
    mes: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    // Ganancia bruta del mes (remunerativo + no remunerativo - deducciones no ganancias)
    gananciaBrutaMes: {
        type: Number,
        default: 0
    },
    // Incluye proyeccion de SAC (8.33% de la ganancia bruta)
    proyeccionSAC: {
        type: Number,
        default: 0
    },
    // Suma de la ganancia bruta acumulada desde enero hasta este mes
    gananciaBrutaAcumulada: {
        type: Number,
        default: 0
    },
    // Suma de las deducciones acumuladas desde enero hasta este mes (MNI, Cargas Familia, Especial, etc.)
    deduccionesAcumuladas: {
        type: Number,
        default: 0
    },
    // Base imponible final del mes acumulada = gananciaBrutaAcumulada - deduccionesAcumuladas
    gananciaNetaSujetaAImpuesto: {
        type: Number,
        default: 0
    },
    // Impuesto total determinado sobre la gananciaNetaSujetaAImpuesto (aplicando escala del Art. 94)
    impuestoDeterminado: {
        type: Number,
        default: 0
    },
    // Lo retenido en el mes = impuestoDeterminado - sum(retenciones meses anteriores)
    retencionDelMes: {
        type: Number,
        default: 0
    }
});

const GananciasTrackerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    anio: {
        type: Number,
        required: true
    },
    acumulados: [AcumuladoMesSchema]
}, {
    timestamps: true
});

// Índice para asegurar que solo haya un tracker por empleado por año
GananciasTrackerSchema.index({ employee: 1, anio: 1 }, { unique: true });

const GananciasTracker = mongoose.model('GananciasTracker', GananciasTrackerSchema);

export default GananciasTracker;
