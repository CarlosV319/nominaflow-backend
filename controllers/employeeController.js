import Employee from '../models/Employee.js';
import Company from '../models/Company.js';
import AppError from '../utils/AppError.js';

// @desc    Crear nuevo empleado
// @route   POST /api/employees
// @access  Private
export const createEmployee = async (req, res) => {
    const { company } = req.body;

    // Validación Extra de Seguridad: Verificar que la empresa pertenece al usuario
    const companyExists = await Company.findOne({ _id: company, user: req.user.id });

    if (!companyExists) {
        throw new AppError('Empresa no encontrada o no autorizada', 404);
    }

    // Seguridad: Inyección redundante de user para aislamiento
    const employee = await Employee.create({
        ...req.body,
        user: req.user.id
    });

    res.status(201).json({
        status: 'success',
        data: employee
    });
};

// @desc    Obtener empleados (con filtros y paginación simple)
// @route   GET /api/employees
// @access  Private
export const getEmployees = async (req, res) => {
    const { companyId, page = 1, limit = 10 } = req.query;

    const query = { user: req.user.id }; // Seguridad Base

    if (companyId) {
        query.company = companyId;
    }

    const employees = await Employee.find(query)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('company', 'razonSocial');

    const total = await Employee.countDocuments(query);

    res.status(200).json({
        status: 'success',
        results: employees.length,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: employees
    });
};

// @desc    Obtener un empleado por ID
// @route   GET /api/employees/:id
// @access  Private
export const getEmployeeById = async (req, res) => {
    const employee = await Employee.findOne({ _id: req.params.id, user: req.user.id })
        .populate('company', 'razonSocial');

    if (!employee) {
        throw new AppError('Empleado no encontrado', 404);
    }

    res.status(200).json({
        status: 'success',
        data: employee
    });
};
