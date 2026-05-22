import Company from '../models/Company.js';
import Receipt from '../models/Receipt.js';
import AppError from '../utils/AppError.js';

// Helper function to pad strings (left aligned, space padded)
const padString = (str, length) => {
    if (!str) return ' '.repeat(length);
    const s = String(str).substring(0, length);
    return s.padEnd(length, ' ');
};

// Helper function to pad numbers (right aligned, zero padded)
const padNumber = (num, length) => {
    if (!num && num !== 0) return '0'.repeat(length);
    const s = String(num).replace(/[.,]/g, '');
    return s.padStart(length, '0');
};

const formatDate = (date) => {
    if (!date) return '00000000';
    const d = new Date(date);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

export const exportConceptsTxt = async (req, res, next) => {
    try {
        const company = await Company.findOne({ _id: req.params.companyId, user: req.user.id });
        if (!company) return next(new AppError('Empresa no encontrada', 404));

        const concepts = company.conceptosPersonalizados || [];
        let txtOutput = '';
        
        concepts.forEach(concept => {
            const codigoStr = padString(concept.codigo, 10);
            const nombreStr = padString(concept.concepto, 50);
            const relleno = padString('', 135); 
            
            const line = codigoStr + nombreStr + relleno;
            if (line.length === 195) {
                txtOutput += line + '\r\n';
            }
        });

        res.setHeader('Content-disposition', 'attachment; filename=Conceptos_LSD.txt');
        res.setHeader('Content-type', 'text/plain; charset=windows-1252'); 
        res.send(txtOutput);

    } catch (error) {
        next(error);
    }
};

export const exportLiquidationsTxt = async (req, res, next) => {
    // Legacy export all, kept for compatibility if needed.
    res.status(501).json({ message: "Utilice el exportador individual por recibo." });
};

// @route   GET /api/v1/lsd/liquidations/export/receipt/:receiptId
export const exportSingleReceiptTxt = async (req, res, next) => {
    try {
        const { receiptId } = req.params;

        const receipt = await Receipt.findOne({ _id: receiptId, user: req.user.id })
            .populate('employee')
            .populate('company');
            
        if (!receipt) {
            return next(new AppError('Recibo no encontrado', 404));
        }

        let txtOutput = '';

        // Fechas y periodos
        const periodoStr = `${receipt.periodo?.anio || new Date().getFullYear()}${String(receipt.periodo?.mes || new Date().getMonth() + 1).padStart(2, '0')}`;
        const fechaPagoStr = formatDate(receipt.fechaPago || new Date());

        // ==========================================
        // REGISTRO 01: CABECERA (195 caracteres)
        // ==========================================
        let reg01 = '01'; // 1-2
        reg01 += padNumber(receipt.company.cuit, 11); // 3-13
        reg01 += 'SJ'; // 14-15
        reg01 += padString(periodoStr, 6); // 16-21
        reg01 += 'M'; // 22-22 (Mensual)
        reg01 += padNumber('1', 5); // 23-27 (Nro Liquidacion)
        reg01 += '30'; // 28-29 (Dias base)
        reg01 += padNumber('1', 6); // 30-35 (Cant Reg 04)
        reg01 += padString('', 160); // 36-195
        txtOutput += reg01 + '\r\n';

        // ==========================================
        // REGISTRO 02: TRABAJADOR (195 caracteres)
        // ==========================================
        let reg02 = '02'; // 1-2
        reg02 += padNumber(receipt.employee.cuil, 11); // 3-13
        reg02 += padString(receipt.employee.legajo, 10); // 14-23
        reg02 += padString(receipt.employee.lugarTrabajo, 50); // 24-73
        reg02 += padNumber(receipt.employee.cbu, 22); // 74-95
        reg02 += '030'; // 96-98 (Dias liquidados)
        reg02 += padString(fechaPagoStr, 8); // 99-106 (Fecha de pago)
        reg02 += padString('', 8); // 107-114 (Fecha de rubrica - optativo)
        reg02 += '3'; // 115-115 (Acreditacion)
        reg02 += padString('', 80); // 116-195
        txtOutput += reg02 + '\r\n';

        // ==========================================
        // REGISTRO 03: DETALLE CONCEPTOS (195 char c/u)
        // ==========================================
        receipt.items.forEach(c => {
            let reg03 = '03'; // 1-2
            reg03 += padNumber(receipt.employee.cuil, 11); // 3-13
            reg03 += padString(c.codigo, 10); // 14-23
            reg03 += padNumber((c.unidades || 1).toFixed(2), 5); // 24-28
            reg03 += padString(' ', 1); // 29-29 (Unidad)
            
            const monto = c.montoRemunerativo || c.montoNoRemunerativo || c.montoDeduccion;
            reg03 += padNumber(monto.toFixed(2), 15); // 30-44
            reg03 += c.montoDeduccion > 0 ? 'D' : 'C'; // 45-45 (Debito o Credito)
            reg03 += '000000'; // 46-51 (Periodo ajuste)
            reg03 += padString('', 144); // 52-195
            txtOutput += reg03 + '\r\n';
        });

        // ==========================================
        // REGISTRO 04: BASES IMPONIBLES (999 caracteres)
        // ==========================================
        const brutoTotal = receipt.totales?.totalBruto || 0;
        const brutoStr = padNumber(brutoTotal.toFixed(2), 15);
        
        let reg04 = '04'; // 1-2
        reg04 += padNumber(receipt.employee.cuil, 11); // 3-13
        reg04 += '0'; // 14-14 Conyuge
        reg04 += padNumber(receipt.employee.cargasFamilia?.hijos || 0, 2); // 15-16 Hijos
        reg04 += '1'; // 17-17 CCT
        reg04 += '0'; // 18-18 SCVO
        reg04 += '0'; // 19-19 Reduccion
        reg04 += '1'; // 20-20 Tipo Empresa
        reg04 += '0'; // 21-21 Tipo operacion
        reg04 += '01'; // 22-23 Cod. Situacion (Activo)
        reg04 += '01'; // 24-25 Cod. Condicion (Servicios)
        reg04 += '014'; // 26-28 Cod. Actividad
        reg04 += '008'; // 29-31 Modalidad contratacion
        reg04 += '00'; // 32-33 Siniestrado
        reg04 += '00'; // 34-35 Localidad
        reg04 += '01'; // 36-37 Sit. Revista 1
        reg04 += '01'; // 38-39 Dia inicio
        reg04 += '00000000'; // 40-47 Sit 2 y 3
        reg04 += '30'; // 48-49 Dias trab
        reg04 += '200'; // 50-52 Horas trab
        reg04 += padNumber(0, 5); // 53-57 Porcentaje adic SS
        reg04 += padNumber(0, 5); // 58-62 Contrib dif
        reg04 += padString(receipt.employee.obraSocial || '000000', 6); // 63-68 Obra Social
        reg04 += '00'; // 69-70 Adherentes
        reg04 += padNumber(0, 15); // 71-85 Aporte OS
        reg04 += padNumber(0, 15); // 86-100 Contrib OS
        reg04 += padNumber(0, 15); // 101-115 Base OS
        reg04 += padNumber(0, 15); // 116-130 Base OS
        reg04 += padNumber(0, 15); // 131-145 Base LRT
        reg04 += padNumber(0, 15); // 146-160 Rem Maternidad
        reg04 += brutoStr; // 161-175 Rem Bruta
        reg04 += brutoStr; // 176-190 Base 1
        reg04 += brutoStr; // 191-205 Base 2
        reg04 += brutoStr; // 206-220 Base 3
        reg04 += brutoStr; // 221-235 Base 4
        reg04 += brutoStr; // 236-250 Base 5
        reg04 += brutoStr; // 251-265 Base 6
        reg04 += brutoStr; // 266-280 Base 7
        reg04 += brutoStr; // 281-295 Base 8
        reg04 += brutoStr; // 296-310 Base 9
        reg04 += padString('', 30); // 311-340 Espacios
        reg04 += brutoStr; // 341-355 Base 10
        reg04 += padNumber(0, 15); // 356-370 Importe a detraer
        reg04 += padString('', 629); // 371-999 Resto
        
        txtOutput += reg04 + '\r\n';

        res.setHeader('Content-disposition', `attachment; filename=Recibo_LSD_${receipt.employee.cuil}.txt`);
        res.setHeader('Content-type', 'text/plain; charset=windows-1252'); 
        res.send(txtOutput);

    } catch (error) {
        next(error);
    }
};
