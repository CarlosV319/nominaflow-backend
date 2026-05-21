/**
 * ============================================================
 * CONSTANTES LEGALES LABORALES — ARGENTINA 2026
 * ============================================================
 * Fuente: NotebookLM "Argentina Labor Law and Social Security Updates 2024-2026"
 * Última actualización: Mayo 2026
 * 
 * IMPORTANTE: Estos valores deben actualizarse cuando ARCA/ANSES
 * publiquen nuevas resoluciones. Los topes de base imponible
 * se actualizan mensualmente.
 * ============================================================
 */

// ─── APORTES DEL TRABAJADOR (Retenciones) ───────────────────
export const APORTES_TRABAJADOR = {
    JUBILACION: { codigo: '8100', concepto: 'Jubilación (SIPA)', alicuota: 0.11 },
    PAMI:       { codigo: '8200', concepto: 'Ley 19.032 (PAMI)',  alicuota: 0.03 },
    OBRA_SOCIAL:{ codigo: '8300', concepto: 'Obra Social',        alicuota: 0.03 },
};

export const TOTAL_APORTES_TRABAJADOR = 0.17; // 11% + 3% + 3%

// ─── CONTRIBUCIONES PATRONALES ──────────────────────────────
export const CONTRIBUCIONES_PATRONALES = {
    // Alícuotas de seguridad social según tipo de empleador
    ALICUOTA_MIPYME: 0.18,                    // MiPyMEs y resto del sector privado
    ALICUOTA_GRAN_EMPRESA_SERVICIOS: 0.204,   // Grandes empresas de Servicios/Comercio
    OBRA_SOCIAL_PATRONAL: 0.06,               // 6% — se suma a cualquiera de las anteriores

    // Detracción: monto fijo que se resta del bruto ANTES de aplicar la alícuota patronal
    // (NO aplica a Obra Social patronal, que va sobre el bruto completo)
    DETRACCION_MENSUAL: 7003.68,              // Por empleado a jornada completa
    DETRACCION_EXTRA_SAC: 3501.84,            // Adicional en meses de liquidación de SAC
    DETRACCION_MEDIA_JORNADA_MAX: 4669.12,    // Máximo 2/3 de la detracción completa
};

// ─── TOPES DE BASE IMPONIBLE PREVISIONAL ────────────────────
// Actualizados por ANSES. Los aportes del trabajador tienen tope máximo.
// Las contribuciones patronales NO tienen tope máximo (excepto OS que tampoco).
export const TOPES_BASE_IMPONIBLE = {
    // Mayo 2026 (vigentes)
    MAYO_2026: {
        MINIMA: 132420.94,
        MAXIMA: 4303619.01,
    },
    // Abril 2026 (referencia)
    ABRIL_2026: {
        MINIMA: 128091.45,
        MAXIMA: 4162912.57,
    },
};

// Tope activo (cambiar cuando se publiquen nuevos valores)
export const TOPE_VIGENTE = TOPES_BASE_IMPONIBLE.MAYO_2026;

// ─── SEGUROS OBLIGATORIOS ───────────────────────────────────
export const SEGUROS = {
    // Seguro Colectivo de Vida Obligatorio (SCVO) — Decreto 1567/74
    SCVO: {
        SUMA_ASEGURADA: 2071300,
        PRIMA_MENSUAL: 424.62,    // Por trabajador, a cargo del empleador
    },
    // ART — Fondo Fiduciario de Enfermedades Profesionales (FFEP)
    ART_FFEP: {
        MAYO_2026: 1765.00,
        ABRIL_2026: 1724.00,
        MARZO_2026: 1637.00,
    },
};

export const ART_FFEP_VIGENTE = SEGUROS.ART_FFEP.MAYO_2026;

// ─── SALARIO MÍNIMO VITAL Y MÓVIL ──────────────────────────
export const SMVM = 363000;

// ─── IMPUESTO A LAS GANANCIAS 4TA CATEGORÍA ────────────────
// Primer semestre 2026 — Actualización 14.29% (IPC 2do semestre 2025)
// Retroactivo al 01/01/2026

export const GANANCIAS = {
    // Deducciones personales — Valores ANUALES (Art. 30)
    // En la liquidación mensual se computa 1/12 acumulado mes a mes
    DEDUCCIONES_ANUALES: {
        MINIMO_NO_IMPONIBLE:           5151802.50,
        CONYUGE:                       4851964.66,
        HIJO_MENOR_18:                 2446863.48,
        HIJO_INCAPACITADO:             4893726.96,
        DEDUCCION_ESPECIAL_REL_DEP:   24728652.02,  // Empleados en relación de dependencia
        DEDUCCION_ESPECIAL_AUTONOMOS: 18031308.76,
        DEDUCCION_ESPECIAL_NUEVOS:    20607210.01,  // Nuevos profesionales/emprendedores
    },

    // Valores MENSUALES precalculados (1/12 de los anuales)
    DEDUCCIONES_MENSUALES: {
        MINIMO_NO_IMPONIBLE:          429316.88,
        CONYUGE:                      404330.39,
        HIJO_MENOR_18:                203905.29,
        HIJO_INCAPACITADO:            407810.58,
        DEDUCCION_ESPECIAL_REL_DEP:  2060721.00,
    },

    // Escala progresiva Art. 94 — Valores ANUALES
    // Para liquidación mensual: dividir tramos por 12 y acumular
    ESCALA_ANUAL: [
        { desde: 0,            hasta: 2000030.09,   fijo: 0,            alicuota: 0.05 },
        { desde: 2000030.09,   hasta: 4000060.17,   fijo: 100001.50,    alicuota: 0.09 },
        { desde: 4000060.17,   hasta: 6000090.26,   fijo: 280004.21,    alicuota: 0.12 },
        { desde: 6000090.26,   hasta: 9000135.40,   fijo: 520007.82,    alicuota: 0.15 },
        { desde: 9000135.40,   hasta: 18000270.80,  fijo: 970014.59,    alicuota: 0.19 },
        { desde: 18000270.80,  hasta: 27000406.20,  fijo: 2680040.32,   alicuota: 0.23 },
        { desde: 27000406.20,  hasta: 40500609.30,  fijo: 4750071.46,   alicuota: 0.27 },
        { desde: 40500609.30,  hasta: 60750913.96,  fijo: 8395126.30,   alicuota: 0.31 },
        { desde: 60750913.96,  hasta: Infinity,     fijo: 14672720.74,  alicuota: 0.35 },
    ],

    // SAC y Ganancias: se adiciona 1/12 (8.33%) mensual proyectando el aguinaldo
    PROPORCION_SAC_MENSUAL: 1 / 12,
};

// ─── VACACIONES ─────────────────────────────────────────────
// LCT Art. 150 — Días corridos según antigüedad al 31/12
export const VACACIONES = {
    DIVISOR_VALOR_DIARIO: 25,  // Sueldo / 25 (NO /30) — genera "plus vacacional"
    DIAS_POR_ANTIGUEDAD: [
        { hastaAnios: 5,  dias: 14 },
        { hastaAnios: 10, dias: 21 },
        { hastaAnios: 20, dias: 28 },
        { hastaAnios: Infinity, dias: 35 },
    ],
};

// ─── HORAS EXTRAS ───────────────────────────────────────────
export const HORAS_EXTRAS = {
    RECARGO_50: 1.50,   // Días hábiles (Lun-Vie, Sáb hasta 13hs)
    RECARGO_100: 2.00,  // Sáb después de 13hs, Dom, Feriados
    TOPE_MENSUAL_MIN: 30,
    TOPE_MENSUAL_MAX: 48,
    TOPE_ANUAL_MIN: 200,
    TOPE_ANUAL_MAX: 320,
};

// ─── LICENCIAS ESPECIALES (LCT Art. 158) ────────────────────
export const LICENCIAS = {
    NACIMIENTO_HIJO: 2,
    MATRIMONIO: 10,
    FALLECIMIENTO_CONYUGE_HIJO_PADRE: 3,
    FALLECIMIENTO_HERMANO: 1,
    EXAMEN_POR_UNIDAD: 2,
    EXAMEN_MAXIMO_ANUAL: 10,
};

// ─── INDEMNIZACIONES (Art. 245 LCT + Ley 27.802) ───────────
export const INDEMNIZACION = {
    // Piso Vizzoti: la base nunca puede ser menor al 67% de la mejor remuneración
    PISO_VIZZOTI: 0.67,
    // Mínimo: nunca menor a 1 mes del mejor sueldo bruto
    MINIMO_MESES: 1,
    // Fracción mayor a 3 meses = año completo
    FRACCION_MINIMA_MESES: 3,
    // Preaviso según antigüedad
    PREAVISO: {
        HASTA_5_ANIOS: 1,   // 1 mes
        MAS_DE_5_ANIOS: 2,  // 2 meses
    },
    // SAC proporcional sobre preaviso, integración y vacaciones no gozadas
    SAC_PROPORCIONAL: 1 / 12,  // 8.33%
};

// ─── SAC / AGUINALDO ────────────────────────────────────────
export const SAC = {
    // SAC = Mejor remuneración mensual del semestre / 2
    DIVISOR: 2,
    // Semestres
    PRIMER_SEMESTRE:  { desde: 1, hasta: 6,  vencimiento_mes: 6, vencimiento_dia: 30 },
    SEGUNDO_SEMESTRE: { desde: 7, hasta: 12, vencimiento_mes: 12, vencimiento_dia: 18 },
    // Tope base imponible para aportes del SAC = 50% del tope máximo
    TOPE_FACTOR: 0.50,
    // Días del semestre para proporcionalidad
    DIAS_SEMESTRE: 180,
};

// ─── CONVENIOS COLECTIVOS DE TRABAJO ────────────────────────
// Escalas salariales parciales — principales CCTs
export const CCT = {
    // Empleados de Comercio (CCT 130/75) — Abril-Junio 2026
    '130/75': {
        nombre: 'Empleados de Comercio',
        sindicato: 'SEC',
        presentismo: 0.0833,        // 8.33% de la remuneración total del mes
        antiguedad: 0.01,           // 1% por año sobre básico
        cuotaSindicalDefault: 0.02, // 2%
        sumaNoRemunerativa: 120000, // $120.000 (abril-junio 2026)
        basicos: {
            'Maestranza A':      1078911,
            'Administrativo A':  1090613,
            'Cajeros A':         1094513,
            'Vendedores A':      1094513,
            'Vendedores D':      1142890,
        },
    },
    // Metalúrgicos UOM (CCT 260/75) — Marzo 2026
    '260/75': {
        nombre: 'Metalúrgicos (UOM)',
        sindicato: 'UOM',
        antiguedad: 0.01,           // 1% por año sobre jornal
        cuotaSindicalDefault: 0.02,
        imgr: 1036390,              // Ingreso Mínimo Global de Referencia (jornada completa)
        basicosHora: {
            'Ingresante':           4163,
            'Operario calificado':  4529,
            'Medio oficial':        4861,
            'Operario especializado': 5210,
            'Oficial':              5751,
            'Oficial múltiple':     6212,
        },
    },
    // Camioneros (CCT 40/89) — Mayo 2026
    '40/89': {
        nombre: 'Camioneros',
        sindicato: 'Camioneros',
        antiguedad: 0.01,           // 1% por año sobre total remunerativo
        antiguedadSobreTotal: true, // Se calcula sobre TOTAL remunerativo, no solo básico
        cuotaSindicalDefault: 0.025,
        basicos: {
            'Conductor 1ª':              1001073,
            'Conductor 2ª':               983232,
            'Peón general':               914291,
            'Administrativo 1ª':          996199,
        },
        viaticos: {
            comida: 14038.64,
            viaticoEspecial: 7044.57,
            pernoctada: 16351.12,
        },
    },
    // Gastronomía UTHGRA (CCT 389/04) — Mayo 2026 (3 estrellas)
    '389/04': {
        nombre: 'Gastronomía (UTHGRA)',
        sindicato: 'UTHGRA',
        presentismo: 0.10,          // 10%
        cuotaSindicalDefault: 0.02,
        basicos: {
            'Categoría 1': 999420,
            'Categoría 2': 1061224,
            'Categoría 6': 1332989,
        },
        sumasNoRemunerativas: {
            'Categoría 1': 38700,
            'Categoría 2': 41100,
            'Categoría 6': 51700,
        },
    },
    // Construcción UOCRA (CCT 76/75)
    '76/75': {
        nombre: 'Construcción (UOCRA)',
        sindicato: 'UOCRA',
        presentismo: 0.20,          // 20% sobre básico (quincenal)
        fondoCeseLaboralPrimerAnio: 0.12,   // 12% primer año
        fondoCeseLaboralDespues: 0.08,      // 8% a partir del segundo año
        cuotaSindicalDefault: 0.025,
        // Básicos no disponibles en fuentes — quedan para carga manual
    },
};

// ─── ASIGNACIONES FAMILIARES SUAF (Resolución 380/2025) ─────
// Las paga ANSES directamente al trabajador, NO el empleador.
// Se incluyen como referencia informativa.
export const ASIGNACIONES_FAMILIARES = {
    TOPE_INGRESO_FAMILIAR: 5146094,
    TOPE_INGRESO_INDIVIDUAL: 2573047,
    POR_HIJO: {
        GRUPO_I:  { hastaIngreso:  971786, monto: 62765 },
        GRUPO_II: { hastaIngreso: 1425219, monto: 42337 },
        GRUPO_III:{ hastaIngreso: 1645464, monto: 25608 },
        GRUPO_IV: { hastaIngreso: 5146094, monto: 13211 },
    },
    NACIMIENTO: 73160,
    MATRIMONIO: 109545,
    ADOPCION: 437421,
    CONYUGE: 15227,
    AYUDA_ESCOLAR: 85000,  // Mínimo garantizado (normativamente $42.039)
};

// ─── RECIBO DIGITAL (Ley 27.802 + Decreto 847/2024) ────────
export const RECIBO_DIGITAL = {
    // Datos obligatorios del Art. 140 LCT actualizado
    DATOS_EMPLEADOR: ['razonSocial', 'cuit', 'domicilio'],
    DATOS_TRABAJADOR: ['nombre', 'apellido', 'cuil', 'cargo', 'fechaIngreso', 'antiguedad'],
    REQUIERE_COSTO_LABORAL_TRANSPARENTE: true,  // Decreto 847/2024
    CONSERVACION_LABORAL_ANIOS: 2,
    CONSERVACION_PREVISIONAL_ANIOS: 10,
    LUGAR_FECHA_PAGO_OBLIGATORIO: false,  // Ya no obligatorio (trazabilidad CBU)
};
