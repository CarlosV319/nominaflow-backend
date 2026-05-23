import Receipt from '../models/Receipt.js';
import Employee from '../models/Employee.js';
import Company from '../models/Company.js';
import AppError from '../utils/AppError.js';
import { calculatePayroll, calculateSAC, calculateIndemnizacion, calculateVacaciones } from '../utils/calculationEngine.js';
import { calcularRetencionGanancias, saveGananciasTracker } from '../utils/gananciasEngine.js';

// @desc    Generar nuevo recibo de sueldo (Snapshot)
// @route   POST /api/receipts
// @access  Private
export const createReceipt = async (req, res) => {
    const { employeeId, periodo, items } = req.body; // items: [{codigo, concepto, unidades, montoRemunerativo, montoDeduccion...}]

    // Acción 1: Fetch (con seguridad de usuario)
    const employee = await Employee.findOne({ _id: employeeId, user: req.user.id });
    if (!employee) {
        throw new AppError('Empleado no encontrado', 404);
    }

    const company = await Company.findOne({ _id: employee.company, user: req.user.id });
    if (!company) {
        throw new AppError('Empresa asociada no encontrada', 404);
    }

    // Acción 3: Cálculo
    let totalRemunerativo = 0;
    let totalNoRemunerativo = 0;
    let totalDeducciones = 0;

    const processedItems = items.map(item => {
        totalRemunerativo += Number(item.montoRemunerativo || 0);
        totalNoRemunerativo += Number(item.montoNoRemunerativo || 0);
        totalDeducciones += Number(item.montoDeduccion || 0);
        return item;
    });

    const totalBruto = totalRemunerativo + totalNoRemunerativo;
    const totalNeto = totalBruto - totalDeducciones;

    // Cálculo de Antigüedad (Años completos)
    const fechaIngreso = new Date(employee.fechaIngreso);
    // Periodo es Objeto { mes, anio }
    // Asumimos fecha de cálculo como el último día del mes del periodo
    const fechaCalculo = new Date(periodo.anio, periodo.mes, 0); // Último día del mes
    let antiguedad = fechaCalculo.getFullYear() - fechaIngreso.getFullYear();
    const m = fechaCalculo.getMonth() - fechaIngreso.getMonth();
    if (m < 0 || (m === 0 && fechaCalculo.getDate() < fechaIngreso.getDate())) {
        antiguedad--;
    }
    antiguedad = Math.max(0, antiguedad);

    // Acción 2 y 4: Construcción del Snapshot y Guardado
    console.log('--- CREATING RECEIPT DEBUG ---');
    console.log('Employee:', employee.nombre);

    const { 
        fechaPago, 
        fechaDeposito, 
        bancoDeposito, 
        tipoLiquidacion = 'mensual',
        contribucionesPatronales = {
            jubilacion: 0, obraSocial: 0, scvo: 0, artFijo: 0, detraccion: 0, total: 0
        }
    } = req.body;

    const receiptData = {
        user: req.user.id,
        company: company._id,
        employee: employee._id,
        periodo,
        tipoLiquidacion,
        contribucionesPatronales,
        fechaPago: fechaPago || new Date().toLocaleDateString('es-AR'), // Default hoy si no viene
        fechaDeposito: fechaDeposito || new Date().toLocaleDateString('es-AR'), // Default hoy si no viene
        bancoDeposito: bancoDeposito || employee.banco || '',
        employeeSnapshot: {
            nombre: employee.nombre,
            apellido: employee.apellido,
            cuil: employee.cuil,
            cargo: employee.cargo,
            cbu: employee.cbu,
            fechaIngreso: employee.fechaIngreso,
            banco: employee.banco,
            legajo: employee.legajo,
            // Nuevos Campos
            centroCosto: employee.centroCosto,
            lugarTrabajo: employee.lugarTrabajo,
            categoria: employee.categoria,
            sueldoBasico: employee.sueldoBruto, // Usamos sueldoBruto como base/jornal
            antiguedad: antiguedad
        },
        companySnapshot: {
            razonSocial: company.razonSocial,
            cuit: company.cuit,
            domicilio: company.domicilio,
            tipoEmpleador: company.tipoEmpleador, // Add tipoEmpleador to snapshot
            cct: company.cct // Add cct to snapshot
        },
        items: processedItems,
        totales: {
            totalBruto,
            totalNeto,
            totalDescuentos: totalDeducciones,
            totalNoRemunerativo
        }
    };
    console.log('Receipt Data to Save:', JSON.stringify(receiptData, null, 2));

    try {
        const receipt = await Receipt.create(receiptData);
        
        // Guardar acumulado de ganancias si viene en el request
        const { gananciasDetalle } = req.body;
        if (gananciasDetalle) {
            await saveGananciasTracker(req.user.id, company._id, employee._id, periodo.anio, gananciasDetalle);
        }

        res.status(201).json({
            status: 'success',
            data: receipt
        });
    } catch (error) {
        console.error('MONGOOSE ERROR:', error);
        throw error; // Re-throw to be caught by global handler
    }
};

// @desc    Obtener recibos
// @route   GET /api/receipts
// @access  Private
export const getReceipts = async (req, res) => {
    const { companyId, mes, anio } = req.query;

    const query = { user: req.user.id }; // Seguridad Base

    if (companyId) query.company = companyId;
    if (req.query.employeeId) query.employee = req.query.employeeId;
    if (mes) query['periodo.mes'] = mes;
    if (anio) query['periodo.anio'] = anio;

    const receipts = await Receipt.find(query)
        .populate('employee', 'nombre apellido') // Solo referencia ligera, la data real está en snapshot
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: receipts.length,
        data: receipts
    });
};

// @desc    Descargar PDF de recibo
// @route   GET /api/receipts/:id/pdf
// @access  Private
export const downloadReceiptPDF = async (req, res) => {
    const { id } = req.params;

    const receipt = await Receipt.findOne({ _id: id, user: req.user.id }).lean();
    if (!receipt) {
        throw new AppError('Recibo no encontrado', 404);
    }

    try {
        const { generateReceiptPDF } = await import('../services/pdfService.js');
        const pdfBuffer = await generateReceiptPDF(receipt, req.user.plan);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="recibo-${receipt.employeeSnapshot.apellido}-${receipt.periodo.mes}-${receipt.periodo.anio}.pdf"`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF Gen Error:', error);
        throw new AppError(`Error generando el PDF: ${error.message}`, 500);
    }
};

// @desc    Firmar recibo y guardarlo localmente
// @route   POST /api/receipts/:id/sign
// @access  Private
export const signReceipt = async (req, res) => {
    const { id } = req.params;
    const { signedInDisagreement, disagreementComment } = req.body;

    const receipt = await Receipt.findOne({ _id: id, user: req.user.id });
    if (!receipt) {
        throw new AppError('Recibo no encontrado', 404);
    }

    if (receipt.firmaTrabajador) {
        throw new AppError('El recibo ya fue firmado anteriormente', 400);
    }

    // Actualizar receipt
    receipt.firmaTrabajador = true;
    if (signedInDisagreement) {
        receipt.signedInDisagreement = true;
        receipt.disagreementComment = disagreementComment;
    }

    try {
        // Generar PDF
        const { generateReceiptPDF } = await import('../services/pdfService.js');
        const pdfBuffer = await generateReceiptPDF(receipt.toObject(), req.user.plan);

        // Guardar localmente
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'receipts');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `recibo-${receipt._id}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        
        fs.writeFileSync(filePath, pdfBuffer);
        
        receipt.pdfPath = `/uploads/receipts/${fileName}`;
        await receipt.save();

        res.status(200).json({
            status: 'success',
            message: 'Recibo firmado y guardado exitosamente',
            data: receipt
        });
    } catch (error) {
        console.error('Sign Receipt Error:', error);
        throw new AppError(`Error firmando el recibo: ${error.message}`, 500);
    }
};

import Formula from '../models/Formula.js';

// @desc    Pre-calcular ítems de liquidación mensual
// @route   POST /api/receipts/calculate
// @access  Private
export const calculateReceipt = async (req, res) => {
    const { employeeId, periodo, options } = req.body;

    const employee = await Employee.findOne({ _id: employeeId, user: req.user.id });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const company = await Company.findOne({ _id: employee.company, user: req.user.id });
    if (!company) throw new AppError('Empresa asociada no encontrada', 404);

    // Obtener las fórmulas activas globales y del tenant
    const formulas = await Formula.find({
        isActive: true,
        $or: [{ isGlobal: true }, { tenantId: company._id }]
    });

    const calculationOptions = {
        ...options,
        formulas
    };

    const result = calculatePayroll(employee, company, periodo, calculationOptions);

    if (options && options.calcularGanancias) {
        const ganancias = await calcularRetencionGanancias(
            employee,
            periodo.anio,
            periodo.mes,
            result.totals.totalRemunerativo,
            result.totals.totalDeducciones
        );
        
        result.gananciasDetalle = ganancias;

        if (ganancias.retencionDelMes > 0) {
            result.items.push({
                codigo: '8500',
                concepto: 'Retención Imp. a las Ganancias',
                unidades: 0,
                tipo: 'deduccion',
                monto: ganancias.retencionDelMes
            });
            result.totals.totalDeducciones += ganancias.retencionDelMes;
            result.totals.totalDeducciones = Math.round(result.totals.totalDeducciones * 100) / 100;
            result.totals.totalNeto = Math.round((result.totals.totalBruto - result.totals.totalDeducciones) * 100) / 100;
        }
    }

    res.status(200).json({
        status: 'success',
        data: result
    });
};

// @desc    Pre-calcular SAC
// @route   POST /api/receipts/calculate-sac
// @access  Private
export const calculateSACReceipt = async (req, res) => {
    const { employeeId, mejorRemuneracion, diasTrabajados, options } = req.body;

    const employee = await Employee.findOne({ _id: employeeId, user: req.user.id });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const company = await Company.findOne({ _id: employee.company, user: req.user.id });
    if (!company) throw new AppError('Empresa asociada no encontrada', 404);

    const result = calculateSAC(
        mejorRemuneracion || employee.sueldoBruto,
        diasTrabajados || 180,
        company.tipoEmpleador,
        { ...options, falActivo: !!company.falAdhesionDate }
    );

    res.status(200).json({
        status: 'success',
        data: result
    });
};

// @desc    Pre-calcular Vacaciones
// @route   POST /api/receipts/calculate-vacaciones
// @access  Private
export const calculateVacacionesReceipt = async (req, res) => {
    const { employeeId, periodo, sueldoMensual, options } = req.body;

    const employee = await Employee.findOne({ _id: employeeId, user: req.user.id });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const company = await Company.findOne({ _id: employee.company, user: req.user.id });
    if (!company) throw new AppError('Empresa asociada no encontrada', 404);

    const ingreso = new Date(employee.fechaIngreso);
    const fechaCalculo = new Date(periodo?.anio || new Date().getFullYear(), (periodo?.mes || new Date().getMonth() + 1), 0);
    let antiguedad = fechaCalculo.getFullYear() - ingreso.getFullYear();
    const m = fechaCalculo.getMonth() - ingreso.getMonth();
    if (m < 0 || (m === 0 && fechaCalculo.getDate() < ingreso.getDate())) {
        antiguedad--;
    }
    antiguedad = Math.max(0, antiguedad);

    const result = calculateVacaciones(
        sueldoMensual || employee.sueldoBruto,
        antiguedad,
        company.tipoEmpleador,
        { ...options, falActivo: !!company.falAdhesionDate }
    );

    res.status(200).json({
        status: 'success',
        data: result
    });
};

// @desc    Pre-calcular Liquidación Final
// @route   POST /api/receipts/calculate-final
// @access  Private
export const calculateFinalReceipt = async (req, res) => {
    const { employeeId, periodo, options } = req.body;

    const employee = await Employee.findOne({ _id: employeeId, user: req.user.id });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const company = await Company.findOne({ _id: employee.company, user: req.user.id });
    if (!company) throw new AppError('Empresa asociada no encontrada', 404);

    const result = calculateIndemnizacion(employee, company, periodo, options);

    res.status(200).json({
        status: 'success',
        data: result
    });
};

