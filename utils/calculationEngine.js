/**
 * ============================================================
 * MOTOR DE CÁLCULO DE LIQUIDACIÓN — ARGENTINA 2026
 * ============================================================
 * Funciones para calcular automáticamente todos los componentes
 * de un recibo de sueldo argentino conforme a la legislación vigente.
 * ============================================================
 */

import {
    APORTES_TRABAJADOR,
    CONTRIBUCIONES_PATRONALES,
    TOPE_VIGENTE,
    SEGUROS,
    ART_FFEP_VIGENTE,
    VACACIONES,
    HORAS_EXTRAS,
    INDEMNIZACION,
    SAC,
    CCT,
    GANANCIAS,
} from './laborConstants2026.js';

// ─── HELPERS ────────────────────────────────────────────────

/**
 * Aplica topes de base imponible al sueldo bruto.
 * Los aportes del trabajador se calculan sobre el bruto TOPEADO.
 * @param {number} bruto - Sueldo bruto remunerativo
 * @param {object} topes - { MINIMA, MAXIMA }
 * @returns {number} Base imponible topeada
 */
const aplicarTopes = (bruto, topes = TOPE_VIGENTE) => {
    if (bruto < topes.MINIMA) return topes.MINIMA;
    if (bruto > topes.MAXIMA) return topes.MAXIMA;
    return bruto;
};

/**
 * Calcula la antigüedad en años completos.
 * @param {Date|string} fechaIngreso
 * @param {object} periodo - { mes, anio }
 * @returns {number}
 */
export const calcularAntiguedad = (fechaIngreso, periodo) => {
    const ingreso = new Date(fechaIngreso);
    const fechaCalculo = new Date(periodo.anio, periodo.mes, 0); // Último día del mes
    let antiguedad = fechaCalculo.getFullYear() - ingreso.getFullYear();
    const m = fechaCalculo.getMonth() - ingreso.getMonth();
    if (m < 0 || (m === 0 && fechaCalculo.getDate() < ingreso.getDate())) {
        antiguedad--;
    }
    return Math.max(0, antiguedad);
};

/**
 * Obtiene los días de vacaciones según la antigüedad.
 * @param {number} antiguedadAnios
 * @returns {number}
 */
export const getDiasVacaciones = (antiguedadAnios) => {
    for (const tramo of VACACIONES.DIAS_POR_ANTIGUEDAD) {
        if (antiguedadAnios <= tramo.hastaAnios) return tramo.dias;
    }
    return 35; // Fallback
};

// ─── CÁLCULO DE APORTES DEL TRABAJADOR ──────────────────────

/**
 * Genera los ítems de deducciones (aportes del trabajador).
 * Aplica topes de base imponible.
 * @param {number} brutoRemunerativo - Total de haberes remunerativos
 * @param {object} options - { cuotaSindical, cuotaSindicalPorcentaje, esSAC }
 * @returns {Array} Array de ítems de deducción
 */
export const calcularAportesTrabajador = (brutoRemunerativo, options = {}) => {
    const { cuotaSindical = 0, cuotaSindicalPorcentaje = 0, esSAC = false } = options;

    // Aplicar topes de base imponible
    let topeMax = TOPE_VIGENTE.MAXIMA;
    if (esSAC) {
        topeMax = TOPE_VIGENTE.MAXIMA * SAC.TOPE_FACTOR; // 50% del tope para SAC
    }
    const baseImponible = Math.min(brutoRemunerativo, topeMax);
    // Si el bruto es menor al mínimo, igualmente se aplica sobre el bruto real
    // (el mínimo aplica para la base de contribuciones, no para aportes del trabajador en la práctica)
    const baseCalculo = Math.min(brutoRemunerativo, topeMax);

    const items = [];

    // Jubilación
    items.push({
        codigo: APORTES_TRABAJADOR.JUBILACION.codigo,
        concepto: APORTES_TRABAJADOR.JUBILACION.concepto,
        unidades: APORTES_TRABAJADOR.JUBILACION.alicuota * 100, // 11
        tipo: 'deduccion',
        monto: Math.round(baseCalculo * APORTES_TRABAJADOR.JUBILACION.alicuota * 100) / 100,
    });

    // PAMI
    items.push({
        codigo: APORTES_TRABAJADOR.PAMI.codigo,
        concepto: APORTES_TRABAJADOR.PAMI.concepto,
        unidades: APORTES_TRABAJADOR.PAMI.alicuota * 100, // 3
        tipo: 'deduccion',
        monto: Math.round(baseCalculo * APORTES_TRABAJADOR.PAMI.alicuota * 100) / 100,
    });

    // Obra Social
    items.push({
        codigo: APORTES_TRABAJADOR.OBRA_SOCIAL.codigo,
        concepto: APORTES_TRABAJADOR.OBRA_SOCIAL.concepto,
        unidades: APORTES_TRABAJADOR.OBRA_SOCIAL.alicuota * 100, // 3
        tipo: 'deduccion',
        monto: Math.round(baseCalculo * APORTES_TRABAJADOR.OBRA_SOCIAL.alicuota * 100) / 100,
    });

    // Cuota sindical (si aplica)
    if (cuotaSindicalPorcentaje > 0) {
        const montoCuota = Math.round(brutoRemunerativo * (cuotaSindicalPorcentaje / 100) * 100) / 100;
        items.push({
            codigo: '8400',
            concepto: 'Cuota Sindical',
            unidades: cuotaSindicalPorcentaje,
            tipo: 'deduccion',
            monto: montoCuota,
        });
    }

    return items;
};

// ─── CÁLCULO DE CONTRIBUCIONES PATRONALES ───────────────────

/**
 * Calcula las contribuciones patronales para un empleado.
 * @param {number} brutoRemunerativo - Total bruto remunerativo
 * @param {string} tipoEmpleador - 'mipyme' | 'gran_empresa_servicios'
 * @param {object} options - { esSAC: boolean, artVariable: number (%) }
 * @returns {object} Desglose de contribuciones patronales
 */
export const calcularContribucionesPatronales = (brutoRemunerativo, tipoEmpleador = 'mipyme', options = {}) => {
    const { esSAC = false, artVariable = 0 } = options;

    // Determinar alícuota según tipo de empleador
    const alicuota = tipoEmpleador === 'gran_empresa_servicios'
        ? CONTRIBUCIONES_PATRONALES.ALICUOTA_GRAN_EMPRESA_SERVICIOS
        : CONTRIBUCIONES_PATRONALES.ALICUOTA_MIPYME;

    // Calcular detracción
    let detraccion = CONTRIBUCIONES_PATRONALES.DETRACCION_MENSUAL;
    if (esSAC) {
        detraccion += CONTRIBUCIONES_PATRONALES.DETRACCION_EXTRA_SAC;
    }

    // Base para contribuciones de seguridad social = bruto - detracción (NO puede ser negativa)
    const baseContribucionSS = Math.max(0, brutoRemunerativo - detraccion);

    // Contribución de seguridad social (18% o 20.4%)
    const jubilacionPatronal = Math.round(baseContribucionSS * alicuota * 100) / 100;

    // Obra social patronal: se aplica sobre el bruto COMPLETO (sin detracción)
    const obraSocialPatronal = Math.round(brutoRemunerativo * CONTRIBUCIONES_PATRONALES.OBRA_SOCIAL_PATRONAL * 100) / 100;

    // SCVO
    const scvo = SEGUROS.SCVO.PRIMA_MENSUAL;

    // ART fijo (FFEP)
    const artFijo = ART_FFEP_VIGENTE;

    // ART variable (si se proporciona el %)
    const artVariableMonto = artVariable > 0
        ? Math.round(brutoRemunerativo * (artVariable / 100) * 100) / 100
        : 0;

    const total = Math.round((jubilacionPatronal + obraSocialPatronal + scvo + artFijo + artVariableMonto) * 100) / 100;

    return {
        jubilacion: jubilacionPatronal,
        obraSocial: obraSocialPatronal,
        scvo,
        artFijo,
        artVariable: artVariableMonto,
        detraccion,
        baseContribucion: baseContribucionSS,
        alicuotaUsada: alicuota,
        total,
    };
};

// ─── CÁLCULO DE LIQUIDACIÓN MENSUAL COMPLETA ────────────────

/**
 * Genera todos los ítems de un recibo de sueldo mensual.
 * @param {object} employee - Datos del empleado (sueldoBruto, fechaIngreso, cuotaSindical, etc.)
 * @param {object} company - Datos de la empresa (tipoEmpleador, cct)
 * @param {object} periodo - { mes, anio }
 * @param {object} options - Opciones adicionales
 * @returns {object} { items, totals, contribucionesPatronales }
 */
export const calculatePayroll = (employee, company, periodo, options = {}) => {
    const {
        horasExtra50 = 0,
        horasExtra100 = 0,
        diasTrabajados = 30,
        incluirPresentismo = false,
        incluirAntiguedad = true,
    } = options;

    const items = [];
    const bruto = employee.sueldoBruto || 0;
    const antiguedad = calcularAntiguedad(employee.fechaIngreso, periodo);

    // ─── HABERES REMUNERATIVOS ──────────────────────────

    // 1. Sueldo Básico
    items.push({
        codigo: '1000',
        concepto: 'Sueldo Básico',
        unidades: diasTrabajados,
        tipo: 'remunerativo',
        monto: bruto,
    });

    // 2. Antigüedad (si aplica y tiene años)
    if (incluirAntiguedad && antiguedad > 0) {
        const cctData = company.cct ? CCT[company.cct] : null;
        let baseAntiguedad = bruto;

        // Camioneros: antigüedad sobre total remunerativo
        if (cctData && cctData.antiguedadSobreTotal) {
            baseAntiguedad = bruto; // Se recalculará después si hay más haberes
        }

        const porcentajeAnt = cctData?.antiguedad || 0.01; // Default 1% por año
        const montoAntiguedad = Math.round(baseAntiguedad * porcentajeAnt * antiguedad * 100) / 100;

        if (montoAntiguedad > 0) {
            items.push({
                codigo: '2000',
                concepto: 'Antigüedad',
                unidades: antiguedad,
                tipo: 'remunerativo',
                monto: montoAntiguedad,
            });
        }
    }

    // 3. Presentismo (si aplica según CCT)
    if (incluirPresentismo) {
        const cctData = company.cct ? CCT[company.cct] : null;
        if (cctData && cctData.presentismo) {
            // Para Comercio: 8.33% de la remuneración total del mes
            // Para otros: porcentaje sobre básico
            const basePresentismo = cctData.nombre === 'Empleados de Comercio'
                ? items.reduce((acc, i) => acc + (i.tipo === 'remunerativo' ? i.monto : 0), 0)
                : bruto;
            const montoPresentismo = Math.round(basePresentismo * cctData.presentismo * 100) / 100;

            items.push({
                codigo: '3000',
                concepto: 'Presentismo',
                unidades: cctData.presentismo * 100,
                tipo: 'remunerativo',
                monto: montoPresentismo,
            });
        }
    }

    // 4. Horas Extra (si aplica)
    if (horasExtra50 > 0) {
        const valorHora = bruto / 200; // Sueldo mensual / 200 horas = valor hora normal
        const montoHE50 = Math.round(valorHora * HORAS_EXTRAS.RECARGO_50 * horasExtra50 * 100) / 100;
        items.push({
            codigo: '4050',
            concepto: 'Horas Extra 50%',
            unidades: horasExtra50,
            tipo: 'remunerativo',
            monto: montoHE50,
        });
    }

    if (horasExtra100 > 0) {
        const valorHora = bruto / 200;
        const montoHE100 = Math.round(valorHora * HORAS_EXTRAS.RECARGO_100 * horasExtra100 * 100) / 100;
        items.push({
            codigo: '4100',
            concepto: 'Horas Extra 100%',
            unidades: horasExtra100,
            tipo: 'remunerativo',
            monto: montoHE100,
        });
    }

    // ─── CALCULAR TOTALES DE HABERES ────────────────────
    const totalRemunerativo = items
        .filter(i => i.tipo === 'remunerativo')
        .reduce((acc, i) => acc + i.monto, 0);

    const totalNoRemunerativo = items
        .filter(i => i.tipo === 'no_remunerativo')
        .reduce((acc, i) => acc + i.monto, 0);

    // ─── DEDUCCIONES (APORTES DEL TRABAJADOR) ───────────
    const deduccionItems = calcularAportesTrabajador(totalRemunerativo, {
        cuotaSindicalPorcentaje: employee.cuotaSindical || 0,
    });

    items.push(...deduccionItems);

    // ─── TOTALES ────────────────────────────────────────
    const totalDeducciones = deduccionItems.reduce((acc, i) => acc + i.monto, 0);
    const totalBruto = totalRemunerativo + totalNoRemunerativo;
    const totalNeto = Math.round((totalBruto - totalDeducciones) * 100) / 100;

    // ─── CONTRIBUCIONES PATRONALES ──────────────────────
    const contribucionesPatronales = calcularContribucionesPatronales(
        totalRemunerativo,
        company.tipoEmpleador || 'mipyme'
    );

    return {
        items,
        totals: {
            totalRemunerativo: Math.round(totalRemunerativo * 100) / 100,
            totalNoRemunerativo: Math.round(totalNoRemunerativo * 100) / 100,
            totalBruto: Math.round(totalBruto * 100) / 100,
            totalDeducciones: Math.round(totalDeducciones * 100) / 100,
            totalNeto,
        },
        contribucionesPatronales,
        antiguedad,
    };
};

// ─── CÁLCULO DE SAC / AGUINALDO ─────────────────────────────

/**
 * Calcula el Sueldo Anual Complementario (Aguinaldo).
 * @param {number} mejorRemuneracion - Mejor remuneración mensual del semestre
 * @param {number} diasTrabajados - Días trabajados en el semestre (180 si completo)
 * @param {string} tipoEmpleador - 'mipyme' | 'gran_empresa_servicios'
 * @param {object} options - { cuotaSindicalPorcentaje }
 * @returns {object} { items, totals, contribucionesPatronales }
 */
export const calculateSAC = (mejorRemuneracion, diasTrabajados = 180, tipoEmpleador = 'mipyme', options = {}) => {
    const { cuotaSindicalPorcentaje = 0 } = options;

    // SAC = Mejor Remuneración / 2 * (días trabajados / 180)
    const sacBruto = Math.round((mejorRemuneracion / SAC.DIVISOR) * (diasTrabajados / SAC.DIAS_SEMESTRE) * 100) / 100;

    const items = [
        {
            codigo: '5000',
            concepto: 'S.A.C. (Aguinaldo)',
            unidades: diasTrabajados,
            tipo: 'remunerativo',
            monto: sacBruto,
        },
    ];

    // Aportes sobre SAC con tope especial (50% del tope máximo)
    const deduccionItems = calcularAportesTrabajador(sacBruto, {
        cuotaSindicalPorcentaje,
        esSAC: true,
    });

    items.push(...deduccionItems);

    const totalDeducciones = deduccionItems.reduce((acc, i) => acc + i.monto, 0);

    // Contribuciones patronales sobre SAC (con detracción extra)
    const contribucionesPatronales = calcularContribucionesPatronales(
        sacBruto,
        tipoEmpleador,
        { esSAC: true }
    );

    return {
        items,
        totals: {
            totalBruto: sacBruto,
            totalDeducciones: Math.round(totalDeducciones * 100) / 100,
            totalNeto: Math.round((sacBruto - totalDeducciones) * 100) / 100,
        },
        contribucionesPatronales,
    };
};

// ─── CÁLCULO DE VACACIONES ──────────────────────────────────

/**
 * Calcula la liquidación de vacaciones.
 * @param {number} sueldoMensual - Sueldo al momento del otorgamiento
 * @param {number} antiguedadAnios - Antigüedad en años
 * @param {string} tipoEmpleador
 * @param {object} options - { cuotaSindicalPorcentaje, diasProporcionales }
 * @returns {object} { items, totals, contribucionesPatronales, diasVacaciones }
 */
export const calculateVacaciones = (sueldoMensual, antiguedadAnios, tipoEmpleador = 'mipyme', options = {}) => {
    const { cuotaSindicalPorcentaje = 0, diasProporcionales } = options;

    const diasVacaciones = diasProporcionales || getDiasVacaciones(antiguedadAnios);
    const valorDiario = sueldoMensual / VACACIONES.DIVISOR_VALOR_DIARIO; // Sueldo / 25
    const montoVacaciones = Math.round(valorDiario * diasVacaciones * 100) / 100;

    const items = [
        {
            codigo: '6000',
            concepto: 'Vacaciones Gozadas',
            unidades: diasVacaciones,
            tipo: 'remunerativo',
            monto: montoVacaciones,
        },
    ];

    const deduccionItems = calcularAportesTrabajador(montoVacaciones, { cuotaSindicalPorcentaje });
    items.push(...deduccionItems);

    const totalDeducciones = deduccionItems.reduce((acc, i) => acc + i.monto, 0);

    const contribucionesPatronales = calcularContribucionesPatronales(
        montoVacaciones,
        tipoEmpleador
    );

    return {
        items,
        totals: {
            totalBruto: montoVacaciones,
            totalDeducciones: Math.round(totalDeducciones * 100) / 100,
            totalNeto: Math.round((montoVacaciones - totalDeducciones) * 100) / 100,
        },
        contribucionesPatronales,
        diasVacaciones,
        valorDiario: Math.round(valorDiario * 100) / 100,
    };
};

// ─── CÁLCULO DE HORAS EXTRA ─────────────────────────────────

/**
 * Calcula el monto de horas extras.
 * @param {number} sueldoMensual - Sueldo base mensual
 * @param {number} cantidad - Cantidad de horas extra
 * @param {'50'|'100'} tipo - Tipo de recargo
 * @returns {object} { monto, valorHora, recargo }
 */
export const calculateHorasExtra = (sueldoMensual, cantidad, tipo = '50') => {
    const valorHora = sueldoMensual / 200; // Jornada de 8hs × 25 días = 200hs
    const recargo = tipo === '100' ? HORAS_EXTRAS.RECARGO_100 : HORAS_EXTRAS.RECARGO_50;
    const monto = Math.round(valorHora * recargo * cantidad * 100) / 100;

    return {
        monto,
        valorHora: Math.round(valorHora * 100) / 100,
        recargo,
    };
};

// ─── CÁLCULO DE INDEMNIZACIÓN POR DESPIDO ───────────────────

/**
 * Calcula la liquidación final por despido sin causa (Art. 245 LCT + Ley 27.802).
 * @param {object} employee - { sueldoBruto, fechaIngreso, mejorRemuneracion }
 * @param {object} periodo - { mes, anio } - Mes del despido
 * @param {object} options - { topeConvencional, diasTrabjadosMes, sueldoMesDespido }
 * @returns {object} Desglose completo de liquidación final
 */
export const calculateIndemnizacion = (employee, periodo, options = {}) => {
    const { topeConvencional, diasTrabajadosMes = 30 } = options;

    const mejorRemun = employee.mejorRemuneracion || employee.sueldoBruto;
    const antiguedad = calcularAntiguedad(employee.fechaIngreso, periodo);

    // ─── Base de cálculo (Art. 245) ─────────────────
    let baseCalculo = mejorRemun;

    // Aplicar tope convencional si existe
    if (topeConvencional && baseCalculo > topeConvencional) {
        baseCalculo = topeConvencional;
    }

    // Piso Vizzoti: la base nunca puede ser menor al 67% de la mejor remuneración
    const pisoVizzoti = mejorRemun * INDEMNIZACION.PISO_VIZZOTI;
    if (baseCalculo < pisoVizzoti) {
        baseCalculo = pisoVizzoti;
    }

    // ─── Antigüedad para indemnización ──────────────
    // 1 mes por año o fracción > 3 meses
    let aniosIndemnizacion = antiguedad;
    const fechaIngreso = new Date(employee.fechaIngreso);
    const fechaDespido = new Date(periodo.anio, periodo.mes - 1, diasTrabajadosMes);
    const mesesFraccion = (fechaDespido.getMonth() - fechaIngreso.getMonth() + 12) % 12;
    if (mesesFraccion > INDEMNIZACION.FRACCION_MINIMA_MESES) {
        aniosIndemnizacion++;
    }
    aniosIndemnizacion = Math.max(INDEMNIZACION.MINIMO_MESES, aniosIndemnizacion);

    // ─── Indemnización por antigüedad ───────────────
    const indemnizacionAntiguedad = Math.round(baseCalculo * aniosIndemnizacion * 100) / 100;

    // ─── Preaviso ───────────────────────────────────
    const mesesPreaviso = antiguedad > 5
        ? INDEMNIZACION.PREAVISO.MAS_DE_5_ANIOS
        : INDEMNIZACION.PREAVISO.HASTA_5_ANIOS;
    const indemnizacionPreaviso = Math.round(mejorRemun * mesesPreaviso * 100) / 100;

    // ─── Integración mes de despido ─────────────────
    const diasRestantes = 30 - diasTrabajadosMes;
    const valorDiario = mejorRemun / 30;
    const integracionMes = Math.round(valorDiario * diasRestantes * 100) / 100;

    // ─── Vacaciones no gozadas (proporcionales) ─────
    const diasVac = getDiasVacaciones(antiguedad);
    const mesActual = periodo.mes;
    const diasProporcionales = Math.round(diasVac * (mesActual / 12) * 100) / 100;
    const valorDiarioVac = mejorRemun / VACACIONES.DIVISOR_VALOR_DIARIO;
    const vacacionesNoGozadas = Math.round(valorDiarioVac * diasProporcionales * 100) / 100;

    // ─── SAC proporcional ───────────────────────────
    // Sobre: preaviso + integración + vacaciones no gozadas
    const baseSACProp = indemnizacionPreaviso + integracionMes + vacacionesNoGozadas;
    const sacProporcional = Math.round(baseSACProp * INDEMNIZACION.SAC_PROPORCIONAL * 100) / 100;

    // ─── Días trabajados del mes ────────────────────
    const sueldoProporcional = Math.round(valorDiario * diasTrabajadosMes * 100) / 100;

    // ─── SAC proporcional del semestre ───────────────
    const semestre = mesActual <= 6 ? SAC.PRIMER_SEMESTRE : SAC.SEGUNDO_SEMESTRE;
    const mesesEnSemestre = mesActual - semestre.desde + 1;
    const diasSemestre = mesesEnSemestre * 30;
    const sacSemestre = Math.round((mejorRemun / SAC.DIVISOR) * (diasSemestre / SAC.DIAS_SEMESTRE) * 100) / 100;

    const totalFinal = Math.round((
        indemnizacionAntiguedad +
        indemnizacionPreaviso +
        integracionMes +
        vacacionesNoGozadas +
        sacProporcional +
        sueldoProporcional +
        sacSemestre
    ) * 100) / 100;

    return {
        desglose: {
            indemnizacionAntiguedad: { concepto: 'Indemnización por Antigüedad (Art. 245)', monto: indemnizacionAntiguedad, detalle: `${aniosIndemnizacion} año(s) × $${baseCalculo.toLocaleString()}` },
            indemnizacionPreaviso: { concepto: 'Indemnización Sustitutiva de Preaviso', monto: indemnizacionPreaviso, detalle: `${mesesPreaviso} mes(es)` },
            integracionMes: { concepto: 'Integración Mes de Despido', monto: integracionMes, detalle: `${diasRestantes} día(s)` },
            vacacionesNoGozadas: { concepto: 'Vacaciones No Gozadas (Proporcionales)', monto: vacacionesNoGozadas, detalle: `${Math.round(diasProporcionales)} día(s)` },
            sacProporcional: { concepto: 'SAC s/Preaviso, Integración y Vacaciones', monto: sacProporcional, detalle: '8.33%' },
            sueldoProporcional: { concepto: 'Sueldo Proporcional (Días Trabajados)', monto: sueldoProporcional, detalle: `${diasTrabajadosMes} día(s)` },
            sacSemestre: { concepto: 'SAC Proporcional del Semestre', monto: sacSemestre, detalle: `${mesesEnSemestre} mes(es)` },
        },
        total: totalFinal,
        antiguedad,
        baseCalculo,
        pisoVizzotiAplicado: baseCalculo === pisoVizzoti,
    };
};
