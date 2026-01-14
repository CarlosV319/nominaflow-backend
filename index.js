import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import connectDB from './config/db.js';

// Rutas
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import receiptRoutes from './routes/receipt.routes.js';

import AppError from './utils/AppError.js';

dotenv.config();

connectDB();

const app = express();

// --- Global Security Middlewares ---

// Set Security HTTP Headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
    max: 1000,
    windowMs: 15 * 60 * 1000,
    message: 'Demasiadas peticiones desde esta IP, intente de nuevo en 15 minutos!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize());

// CORS Policy
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

// --- Routes Mounting ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/receipts', receiptRoutes);

// Basic Root Route
app.get('/', (req, res) => {
    res.send('NominaFlow API is running...');
});

// --- Error Handling ---

// 404 Handler
app.all(/(.*)/, (req, res, next) => {
    next(new AppError(`No se encontró ${req.originalUrl} en este servidor`, 404));
});

// Global Error Handler
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        console.error('DEV ERROR 💥', err); // Added log
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production: Send clean message
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            console.error('ERROR 💥', err);
            res.status(500).json({
                status: 'error',
                message: 'Algo salió mal!'
            });
        }
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`MONGO_URI present: ${!!process.env.MONGO_URI}`);
});
