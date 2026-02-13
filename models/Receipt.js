import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema({
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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // PATRÓN SNAPSHOT: Copia de datos históricos
    periodo: {
        mes: { type: Number, required: true },
        anio: { type: Number, required: true }
    },
    employeeSnapshot: {
        nombre: { type: String, required: true },
        apellido: { type: String, required: true },
        cuil: { type: String, required: true },
        cargo: { type: String, required: true },
        cbu: { type: String, required: true },
        banco: { type: String }, // Opcional
        fechaIngreso: { type: Date, required: true },
        legajo: { type: String, required: true }, // Agregado para recibo
        centroCosto: { type: String },
        lugarTrabajo: { type: String },
        categoria: { type: String },
        sueldoBasico: { type: Number },
        antiguedad: { type: Number } // Años calculados
    },
    fechaPago: { type: String }, // DD/MM/AAAA
    fechaDeposito: { type: String }, // DD/MM/AAAA
    bancoDeposito: { type: String }, // Banco de depósito (si difiere o es para mostrar abajo)
    companySnapshot: {
        razonSocial: { type: String, required: true },
        cuit: { type: String, required: true },
        domicilio: { type: String, required: true }
    },
    items: [{
        codigo: { type: String, required: true },
        concepto: { type: String, required: true },
        unidades: { type: Number, default: 0 },
        montoRemunerativo: { type: Number, default: 0 },
        montoNoRemunerativo: { type: Number, default: 0 }, // Agregado común
        montoDeduccion: { type: Number, default: 0 }
    }],
    totales: {
        totalBruto: { type: Number, default: 0 },
        totalNeto: { type: Number, default: 0 },
        totalDescuentos: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Índices
receiptSchema.index({ company: 1, 'periodo.anio': 1, 'periodo.mes': 1 }); // Búsqueda rápida por periodo y empresa
receiptSchema.index({ employee: 1 }); // Historial de recibos del empleado

const Receipt = mongoose.model('Receipt', receiptSchema);
export default Receipt;
