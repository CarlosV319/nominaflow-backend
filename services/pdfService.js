import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper: Formatear moneda argentina
handlebars.registerHelper('fmtCurrency', function (value) {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(value);
});

// Helper simple para convertir números a letras (Simplificado para el caso de uso)
const numeroALetras = (num) => {
    if (!num) return 'CERO';
    // Esta función es un placeholder robusto. 
    // En producción se recomendaría una librería como 'numeros_a_letras'
    // Implementación básica para demo:
    const partes = parseFloat(num).toFixed(2).split('.');
    return `${partes[0]} con ${partes[1]}/100`;
    // Nota: El usuario pidió lógica compleja, pero implementar un parser completo aquí es extenso.
    // Usaré una versión simplificada pero funcional que cumple el requisito de "Son Pesos..."
    // Si el usuario exige conversión completa (ej: "Mil quinientos..."), se requeriría más código.
    // Voy a asumir que "Monto en números con centavos" es aceptable para MVP o agregaré una lib básica si es crítico.
    // Mejor: Agrego una función pequeña recursiva.
};

function Unidades(num) {
    switch (num) {
        case 1: return 'UN';
        case 2: return 'DOS';
        case 3: return 'TRES';
        case 4: return 'CUATRO';
        case 5: return 'CINCO';
        case 6: return 'SEIS';
        case 7: return 'SIETE';
        case 8: return 'OCHO';
        case 9: return 'NUEVE';
    }
    return '';
}

function Decenas(num) {
    let decena = Math.floor(num / 10);
    let unidad = num - (decena * 10);
    switch (decena) {
        case 1:
            switch (unidad) {
                case 0: return 'DIEZ';
                case 1: return 'ONCE';
                case 2: return 'DOCE';
                case 3: return 'TRECE';
                case 4: return 'CATORCE';
                case 5: return 'QUINCE';
                default: return 'DIECI' + Unidades(unidad);
            }
        case 2:
            switch (unidad) {
                case 0: return 'VEINTE';
                default: return 'VEINTI' + Unidades(unidad);
            }
        case 3: return DecenasY('TREINTA', unidad);
        case 4: return DecenasY('CUARENTA', unidad);
        case 5: return DecenasY('CINCUENTA', unidad);
        case 6: return DecenasY('SESENTA', unidad);
        case 7: return DecenasY('SETENTA', unidad);
        case 8: return DecenasY('OCHENTA', unidad);
        case 9: return DecenasY('NOVENTA', unidad);
        case 0: return Unidades(unidad);
    }
}

function DecenasY(strSin, numUnidades) {
    if (numUnidades > 0)
        return strSin + ' Y ' + Unidades(numUnidades)
    return strSin;
}

function Centenas(num) {
    let centenas = Math.floor(num / 100);
    let decenas = num - (centenas * 100);
    switch (centenas) {
        case 1:
            if (decenas > 0) return 'CIENTO ' + Decenas(decenas);
            return 'CIEN';
        case 2: return 'DOSCIENTOS ' + Decenas(decenas);
        case 3: return 'TRESCIENTOS ' + Decenas(decenas);
        case 4: return 'CUATROCIENTOS ' + Decenas(decenas);
        case 5: return 'QUINIENTOS ' + Decenas(decenas);
        case 6: return 'SEISCIENTOS ' + Decenas(decenas);
        case 7: return 'SETECIENTOS ' + Decenas(decenas);
        case 8: return 'OCHOCIENTOS ' + Decenas(decenas);
        case 9: return 'NOVECIENTOS ' + Decenas(decenas);
    }
    return Decenas(decenas);
}

function Seccion(num, divisor, strSingular, strPlural) {
    let cientos = Math.floor(num / divisor)
    let resto = num - (cientos * divisor)
    let letras = '';
    if (cientos > 0)
        if (cientos > 1) letras = Centenas(cientos) + ' ' + strPlural;
        else letras = strSingular;
    if (resto > 0) letras += '';
    return letras;
}

function Miles(num) {
    let divisor = 1000;
    let cientos = Math.floor(num / divisor)
    let resto = num - (cientos * divisor)
    let strMiles = Seccion(num, divisor, 'UN MIL', 'MIL');
    let strCentenas = Centenas(resto);
    if (strMiles == '') return strCentenas;
    return strMiles + ' ' + strCentenas;
}

function NumeroALetras(num) {
    let data = {
        numero: num,
        enteros: Math.floor(num),
        centavos: (((Math.round(num * 100)) - (Math.floor(num) * 100))),
        letrasCentavos: '',
        letrasMonedaPlural: 'PESOS',
        letrasMonedaSingular: 'PESO',
        letrasMonedaCentavoPlural: 'CENTAVOS',
        letrasMonedaCentavoSingular: 'CENTAVO'
    };

    if (data.centavos > 0) {
        data.letrasCentavos = 'CON ' + (function () {
            if (data.centavos == 1) return Unidades(data.centavos) + ' ' + data.letrasMonedaCentavoSingular;
            else return Decenas(data.centavos) + ' ' + data.letrasMonedaCentavoPlural;
        })();
    };

    if (data.enteros == 0) return 'CERO ' + data.letrasMonedaPlural + ' ' + data.letrasCentavos;
    if (data.enteros == 1) return Miles(data.enteros) + ' ' + data.letrasMonedaSingular + ' ' + data.letrasCentavos;
    else return Miles(data.enteros) + ' ' + data.letrasMonedaPlural + ' ' + data.letrasCentavos;
}

handlebars.registerHelper('numberToWords', function (value) {
    return NumeroALetras(value);
});


export const generateReceiptPDF = async (receiptData) => {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const templatePath = path.join(__dirname, '../templates/receipt.hbs');

        const templateHtml = fs.readFileSync(templatePath, 'utf-8');
        const template = handlebars.compile(templateHtml);

        // Formatear fecha de ingreso
        const fechaIngreso = new Date(receiptData.employeeSnapshot.fechaIngreso);
        const formattedFechaIngreso = `${fechaIngreso.getDate().toString().padStart(2, '0')}/${(fechaIngreso.getMonth() + 1).toString().padStart(2, '0')}/${fechaIngreso.getFullYear()}`;

        const context = {
            company: receiptData.companySnapshot,
            // Construimos objeto de empleado aplanado para fácil acceso
            employee: {
                ...receiptData.employeeSnapshot,
                fullName: `${receiptData.employeeSnapshot.apellido}, ${receiptData.employeeSnapshot.nombre}`,
                fechaIngreso: formattedFechaIngreso,
                // Si no hay banco, usar guión
                bancoInfo: receiptData.employeeSnapshot.banco ? receiptData.employeeSnapshot.banco : '-',
                fechaUltimoDeposito: '-' // Placeholder, el modelo no tiene este dato real aún
            },
            periodo: {
                mes: receiptData.periodo.mes.toString().padStart(2, '0'),
                anio: receiptData.periodo.anio
            },
            nroRecibo: String(receiptData._id).slice(-8).toUpperCase(), // Simulado con ID
            items: receiptData.items.map(item => ({
                ...item,
                isRemunerativo: item.montoRemunerativo > 0,
                isNoRemunerativo: item.montoNoRemunerativo > 0,
                isDeduccion: item.montoDeduccion > 0
            })),
            totals: {
                bruto: receiptData.totales.totalBruto,
                neto: receiptData.totales.totalNeto,
                descuentos: receiptData.totales.totalDescuentos,
                noRemunerativo: receiptData.items.reduce((acc, item) => acc + (item.montoNoRemunerativo || 0), 0)
            },
            isFinal: true
        };

        const html = template(context);

        // Instancia Puppeteer
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Vital para entornos limitados como Render/Docker
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Opcional si se usa Chrome del sistema
        });

        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: 'networkidle0'
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        });

        await browser.close();

        return pdfBuffer;

    } catch (error) {
        console.error('Error generando PDF de recibo:', error);
        throw new Error('Falló la generación del PDF');
    }
};
