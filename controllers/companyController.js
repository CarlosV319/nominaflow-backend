import Company from '../models/Company.js';
import AppError from '../utils/AppError.js';

// @desc    Crear nueva empresa
// @route   POST /api/companies
// @access  Private
export const createCompany = async (req, res) => {
    try {
        console.log('Creating Company with body:', req.body);
        console.log('User ID:', req.user.id);

        const company = await Company.create({
            ...req.body,
            user: req.user.id
        });

        res.status(201).json({
            status: 'success',
            data: company
        });
    } catch (error) {
        console.error('Create Company Error:', error);
        throw error; // Let global handler catch it
    }
};

// @desc    Obtener todas las empresas del usuario
// @route   GET /api/companies
// @access  Private
export const getCompanies = async (req, res) => {
    // Seguridad: Filtra estrictamente por el ID del usuario
    const companies = await Company.find({ user: req.user.id });

    res.status(200).json({
        status: 'success',
        results: companies.length,
        data: companies
    });
};

// @desc    Actualizar empresa
// @route   PUT /api/companies/:id
// @access  Private
export const updateCompany = async (req, res) => {
    let company = await Company.findById(req.params.id);

    if (!company) {
        throw new AppError('Empresa no encontrada', 404);
    }

    // Seguridad: Verifica propiedad
    if (company.user.toString() !== req.user.id) {
        throw new AppError('No autorizado para editar esta empresa', 401);
    }

    company = await Company.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: company
    });
};

// @desc    Eliminar empresa
// @route   DELETE /api/companies/:id
// @access  Private
export const deleteCompany = async (req, res) => {
    const company = await Company.findById(req.params.id);

    if (!company) {
        throw new AppError('Empresa no encontrada', 404);
    }

    // Seguridad: Verifica propiedad
    if (company.user.toString() !== req.user.id) {
        throw new AppError('No autorizado para eliminar esta empresa', 401);
    }

    await company.deleteOne();

    res.status(200).json({
        status: 'success',
        data: null
    });
};
