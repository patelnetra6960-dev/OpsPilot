import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorMiddleware.js';

// Import domain modules (Modular Monolith)
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import organizationRoutes from './modules/organizations/organization.routes.js';
import workforceRoutes from './modules/workforce/workforce.routes.js';
import storageRoutes from './modules/storage/storage.routes.js';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id']
  })
);

if (!env.isTest) {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount Modular Monolith Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/workforce', workforceRoutes);
app.use('/api/storage', storageRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
