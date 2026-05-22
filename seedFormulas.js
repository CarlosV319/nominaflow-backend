import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Formula from './models/Formula.js';

dotenv.config();

const formulas = [
    {
        name: 'Jubilación (SIPA)',
        type: 'Deducción',
        expression: 'salario_base * 0.11',
        description: 'Aporte jubilatorio del empleado (11%)',
        requiredVariables: ['salario_base'],
        isActive: true,
        isGlobal: true,
    },
    {
        name: 'Obra Social',
        type: 'Deducción',
        expression: 'salario_base * 0.03',
        description: 'Aporte de Obra Social del empleado (3%)',
        requiredVariables: ['salario_base'],
        isActive: true,
        isGlobal: true,
    },
    {
        name: 'PAMI (INSSJP)',
        type: 'Deducción',
        expression: 'salario_base * 0.03',
        description: 'Aporte a PAMI del empleado (3%)',
        requiredVariables: ['salario_base'],
        isActive: true,
        isGlobal: true,
    },
    {
        name: 'Horas Extras 50%',
        type: 'Percepción',
        expression: '(salario_base / 200) * 1.50 * horas_extras_50',
        description: 'Recargo del 50% por horas extras en días comunes',
        requiredVariables: ['salario_base', 'horas_extras_50'],
        isActive: true,
        isGlobal: true,
    },
    {
        name: 'Horas Extras 100%',
        type: 'Percepción',
        expression: '(salario_base / 200) * 2.00 * horas_extras_100',
        description: 'Recargo del 100% por horas extras en fines de semana y feriados',
        requiredVariables: ['salario_base', 'horas_extras_100'],
        isActive: true,
        isGlobal: true,
    }
];

const seedFormulas = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nominaflow');
        console.log('MongoDB Connected');

        // Eliminar las fórmulas globales anteriores para evitar duplicados si se corre varias veces
        await Formula.deleteMany({ isGlobal: true });
        console.log('Fórmulas globales anteriores eliminadas');

        await Formula.insertMany(formulas);
        console.log('Fórmulas base creadas correctamente!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding formulas:', error);
        process.exit(1);
    }
};

seedFormulas();
