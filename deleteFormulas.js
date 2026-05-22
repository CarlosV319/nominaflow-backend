import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Formula from './models/Formula.js';

dotenv.config();

const deleteFormulas = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nominaflow');
        console.log('MongoDB Connected');
        await Formula.deleteMany({});
        console.log('Todas las fórmulas han sido borradas.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

deleteFormulas();
