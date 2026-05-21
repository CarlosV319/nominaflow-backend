/**
 * ============================================================
 * MOTOR DE IMPUESTO A LAS GANANCIAS 4TA CATEGORÍA
 * ============================================================
 * Cálculo acumulativo mensual según escalas y normativas 2026.
 * ============================================================
 */

import { GANANCIAS } from './laborConstants2026.js';
import GananciasTracker from '../models/GananciasTracker.js';

/**
 * Calcula las deducciones acumuladas hasta un mes específico.
 * @param {object} employee - Datos del empleado con `cargasFamilia`
 * @param {number} mes - Mes de liquidación (1-12)
 * @returns {number} Deducciones acumuladas a descontar de la base
 */
export const calcularDeduccionesAcumuladas = (employee, mes) => {
    let deduccionMensual = 0;

    // Mínimo no imponible y Deducción especial (todo empleado en relación de dependencia lo tiene)
    deduccionMensual += GANANCIAS.DEDUCCIONES_MENSUALES.MINIMO_NO_IMPONIBLE;
    deduccionMensual += GANANCIAS.DEDUCCIONES_MENSUALES.DEDUCCION_ESPECIAL_REL_DEP;

    // Cargas de familia
    if (employee.cargasFamilia) {
        if (employee.cargasFamilia.conyuge) {
            deduccionMensual += GANANCIAS.DEDUCCIONES_MENSUALES.CONYUGE;
        }
        if (employee.cargasFamilia.hijos > 0) {
            deduccionMensual += (GANANCIAS.DEDUCCIONES_MENSUALES.HIJO_MENOR_18 * employee.cargasFamilia.hijos);
        }
        if (employee.cargasFamilia.hijosDiscapacitados > 0) {
            deduccionMensual += (GANANCIAS.DEDUCCIONES_MENSUALES.HIJO_INCAPACITADO * employee.cargasFamilia.hijosDiscapacitados);
        }
    }

    // El acumulado es la deducción mensual multiplicada por los meses transcurridos en el año
    return Math.round(deduccionMensual * mes * 100) / 100;
};

/**
 * Aplica la escala progresiva del Art. 94 de Ganancias acumulativa mensual.
 * @param {number} gananciaNetaSujetaAImpuesto - Base imponible acumulada del año
 * @param {number} mes - Mes de liquidación (1-12)
 * @returns {number} Impuesto determinado acumulado
 */
export const aplicarEscalaGanancias = (gananciaNetaSujetaAImpuesto, mes) => {
    if (gananciaNetaSujetaAImpuesto <= 0) return 0;

    // La escala en laborConstants2026.js es anual. Para hacerla acumulativa mensual, 
    // debemos dividir por 12 y multiplicar por el mes actual.
    const factorEscala = mes / 12;

    let impuestoDeterminado = 0;

    for (let i = 0; i < GANANCIAS.ESCALA_ANUAL.length; i++) {
        const tramo = GANANCIAS.ESCALA_ANUAL[i];
        
        const desdeMes = tramo.desde * factorEscala;
        const hastaMes = tramo.hasta === Infinity ? Infinity : tramo.hasta * factorEscala;
        const fijoMes = tramo.fijo * factorEscala;

        if (gananciaNetaSujetaAImpuesto > desdeMes && gananciaNetaSujetaAImpuesto <= hastaMes) {
            const excedente = gananciaNetaSujetaAImpuesto - desdeMes;
            impuestoDeterminado = fijoMes + (excedente * tramo.alicuota);
            break;
        }
    }

    return Math.round(impuestoDeterminado * 100) / 100;
};

/**
 * Calcula la retención del mes de Ganancias 4ta Categoría.
 * @param {object} employee - Empleado (mongoose document)
 * @param {number} anio - Año de liquidación
 * @param {number} mes - Mes de liquidación (1-12)
 * @param {number} totalRemunerativoMes - Suma de haberes remunerativos (brutos)
 * @param {number} totalDeduccionesMes - Suma de descuentos (jubilacion, OS, PAMI, etc.)
 * @returns {Promise<object>} Objeto con el detalle del cálculo y la retención del mes
 */
export const calcularRetencionGanancias = async (employee, anio, mes, totalRemunerativoMes, totalDeduccionesMes) => {
    // 1. Ganancia neta bruta del mes (remuneraciones brutas menos aportes de seguridad social)
    // Se proyecta el SAC sumando 1/12 (8.33%) a la ganancia
    const gananciaNetaPreviaSAC = totalRemunerativoMes - totalDeduccionesMes;
    const proyeccionSAC = gananciaNetaPreviaSAC * GANANCIAS.PROPORCION_SAC_MENSUAL;
    const gananciaBrutaMes = gananciaNetaPreviaSAC + proyeccionSAC;

    // 2. Obtener historial del año del tracker
    let tracker = await GananciasTracker.findOne({ employee: employee._id, anio });
    
    let gananciaBrutaAcumulada = 0;
    let retencionesAnteriores = 0;

    if (tracker && tracker.acumulados.length > 0) {
        // Sumamos lo acumulado hasta el mes anterior
        const mesesAnteriores = tracker.acumulados.filter(a => a.mes < mes);
        gananciaBrutaAcumulada = mesesAnteriores.reduce((acc, a) => acc + a.gananciaBrutaMes, 0);
        retencionesAnteriores = mesesAnteriores.reduce((acc, a) => acc + a.retencionDelMes, 0);
    }

    // Acumulamos lo de este mes
    gananciaBrutaAcumulada += gananciaBrutaMes;

    // 3. Calcular Deducciones Personales acumuladas al mes actual
    const deduccionesAcumuladas = calcularDeduccionesAcumuladas(employee, mes);

    // 4. Determinar Ganancia Neta Sujeta a Impuesto
    const gananciaNetaSujetaAImpuesto = Math.max(0, gananciaBrutaAcumulada - deduccionesAcumuladas);

    // 5. Aplicar Escala del Art. 94 y obtener el impuesto anual determinado acumulado a la fecha
    const impuestoDeterminado = aplicarEscalaGanancias(gananciaNetaSujetaAImpuesto, mes);

    // 6. La retención de este mes es la diferencia entre el impuesto determinado acumulado y lo ya retenido
    let retencionDelMes = impuestoDeterminado - retencionesAnteriores;
    
    // Si la retención da negativa, es devolución. Por convención legal, si no hay despido se compensa luego.
    // (A fines prácticos de esta versión base de la app, permitimos retención negativa/devolución)
    retencionDelMes = Math.round(retencionDelMes * 100) / 100;

    return {
        mes,
        gananciaBrutaMes: Math.round(gananciaBrutaMes * 100) / 100,
        proyeccionSAC: Math.round(proyeccionSAC * 100) / 100,
        gananciaBrutaAcumulada: Math.round(gananciaBrutaAcumulada * 100) / 100,
        deduccionesAcumuladas: deduccionesAcumuladas,
        gananciaNetaSujetaAImpuesto: Math.round(gananciaNetaSujetaAImpuesto * 100) / 100,
        impuestoDeterminado: impuestoDeterminado,
        retencionDelMes: retencionDelMes
    };
};

/**
 * Guarda el acumulado mensual en el Tracker de Ganancias tras confirmar un recibo.
 */
export const saveGananciasTracker = async (userId, companyId, employeeId, anio, acumuladoData) => {
    let tracker = await GananciasTracker.findOne({ employee: employeeId, anio });

    if (!tracker) {
        tracker = new GananciasTracker({
            user: userId,
            company: companyId,
            employee: employeeId,
            anio,
            acumulados: []
        });
    }

    // Reemplazar o agregar el mes
    const existingIndex = tracker.acumulados.findIndex(a => a.mes === acumuladoData.mes);
    if (existingIndex >= 0) {
        tracker.acumulados[existingIndex] = acumuladoData;
    } else {
        tracker.acumulados.push(acumuladoData);
    }

    await tracker.save();
    return tracker;
};
