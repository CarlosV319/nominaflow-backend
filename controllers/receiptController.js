import Receipt from '../models/Receipt.js';
import Employee from '../models/Employee.js';
import Company from '../models/Company.js';
import AppError from '../utils/AppError.js';

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

    // Acción 2 y 4: Construcción del Snapshot y Guardado
    console.log('--- CREATING RECEIPT DEBUG ---');
    console.log('Employee:', employee.nombre);
    console.log('Company:', company.razonSocial);
    console.log('Company Domicilio Type:', typeof company.domicilio, company.domicilio);

    const receiptData = {
        user: req.user.id,
        company: company._id,
        employee: employee._id,
        periodo,
        employeeSnapshot: {
            nombre: employee.nombre,
            apellido: employee.apellido,
            cuil: employee.cuil,
            cargo: employee.cargo,
            cbu: employee.cbu,
            fechaIngreso: employee.fechaIngreso,
            banco: employee.banco // Aseguramos que pase el banco
        },
        companySnapshot: {
            razonSocial: company.razonSocial,
            cuit: company.cuit,
            domicilio: company.domicilio
        },
        items: processedItems,
        totales: {
            totalBruto,
            totalNeto,
            totalDescuentos: totalDeducciones
        }
    };
    console.log('Receipt Data to Save:', JSON.stringify(receiptData, null, 2));

    try {
        const receipt = await Receipt.create(receiptData);
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
        const pdfBuffer = await generateReceiptPDF(receipt);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="recibo-${receipt.employeeSnapshot.apellido}-${receipt.periodo.mes}-${receipt.periodo.anio}.pdf"`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF Gen Error:', error);
        throw new AppError('Error generando el PDF', 500);
    }
};
