import Formula from '../models/Formula.js';

// Crear una nueva fórmula
export const createFormula = async (req, res) => {
  try {
    const { name, type, expression, description, requiredVariables, isActive, isGlobal, tenantId } = req.body;
    
    const formula = new Formula({
      name,
      type,
      expression,
      description,
      requiredVariables,
      isActive,
      isGlobal,
      tenantId: isGlobal ? null : tenantId
    });

    await formula.save();
    res.status(201).json(formula);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la fórmula', error: error.message });
  }
};

// Obtener todas las fórmulas (globales + las específicas de un tenant)
export const getFormulas = async (req, res) => {
  try {
    const { tenantId } = req.query; // Puede venir o no
    let query = { isGlobal: true };
    
    if (tenantId) {
      query = { $or: [{ isGlobal: true }, { tenantId }] };
    }

    const formulas = await Formula.find(query);
    res.status(200).json(formulas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las fórmulas', error: error.message });
  }
};

// Obtener una sola fórmula por ID
export const getFormulaById = async (req, res) => {
  try {
    const formula = await Formula.findById(req.params.id);
    if (!formula) return res.status(404).json({ message: 'Fórmula no encontrada' });
    res.status(200).json(formula);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la fórmula', error: error.message });
  }
};

// Actualizar fórmula
export const updateFormula = async (req, res) => {
  try {
    const formula = await Formula.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!formula) return res.status(404).json({ message: 'Fórmula no encontrada' });
    res.status(200).json(formula);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la fórmula', error: error.message });
  }
};

// Eliminar fórmula
export const deleteFormula = async (req, res) => {
  try {
    const formula = await Formula.findByIdAndDelete(req.params.id);
    if (!formula) return res.status(404).json({ message: 'Fórmula no encontrada' });
    res.status(200).json({ message: 'Fórmula eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la fórmula', error: error.message });
  }
};
