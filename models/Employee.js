import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Company'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Redundancia para seguridad de aislamiento
    },
    legajo: {
        type: String,
        required: [true, 'El legajo es requerido'],
        trim: true
    },
    cuil: {
        type: String,
        required: [true, 'El CUIL es requerido'],
        match: [/^\d{11}$/, 'El CUIL debe contener solo 11 números']
    },
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    apellido: {
        type: String,
        required: true,
        trim: true
    },
    fechaNacimiento: {
        type: Date,
        required: true
    },
    fechaIngreso: {
        type: Date,
        required: true
    },
    cargo: {
        type: String,
        required: true
    },
    modalidadContratacion: {
        type: String, // E.g., 'Tiempo Indeterminado', 'Plazo Fijo'
        required: true
    },
    cbu: {
        type: String,
        required: true
    },
    banco: {
        type: String
    },
    sueldoBruto: {
        type: Number,
        required: [true, 'El sueldo bruto es requerido'],
        min: 0
    }
}, {
    timestamps: true
});

// Índice compuesto: Garantiza que no se repita el legajo dentro de la misma company
employeeSchema.index({ company: 1, legajo: 1 }, { unique: true });

// Índice compuesto opcional para evitar CUIL duplicado en la misma empresa
employeeSchema.index({ company: 1, cuil: 1 }, { unique: true });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
