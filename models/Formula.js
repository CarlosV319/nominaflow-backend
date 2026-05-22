import mongoose from 'mongoose';

const formulaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String, // e.g., 'Earning', 'Deduction', 'Tax'
    required: true,
  },
  expression: {
    type: String, // e.g., '(salario_base / 30) * horas_extras * 1.5'
    required: true,
  },
  description: {
    type: String,
  },
  requiredVariables: {
    type: [String], // e.g., ['salario_base', 'horas_extras']
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isGlobal: {
    type: Boolean,
    default: true, // If true, it applies to all companies/tenants unless overridden
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null, // If null, it's a global formula
  }
}, { timestamps: true });

// Ensure that a tenant cannot have two formulas with the same name if it's not global
formulaSchema.index({ name: 1, tenantId: 1 }, { unique: true });

const Formula = mongoose.model('Formula', formulaSchema);
export default Formula;
