import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

export const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));
app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' }, message: 'Nexus API online' }));
app.use('/api', routes);
app.use(errorHandler);
