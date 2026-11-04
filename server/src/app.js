import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import corsOptions from './config/cors.js';
import requestLogger from './middleware/requestLogger.js';
import { defaultRateLimiter } from './middleware/rateLimitMiddleware.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorMiddleware.js';
import apiV1Router from './routes/index.js';

const app = express();

// Security headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// End-to-end request tracing and latency logging
app.use(requestLogger);

// Request body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiting across API routes
app.use('/api', defaultRateLimiter);

// API Versioning: Primary versioned mount
app.use('/api/v1', apiV1Router);

// Backward-compatible alias for existing clients and tests
app.use('/api', apiV1Router);

// Centralized 404 Route Not Found Handler
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(globalErrorHandler);

export default app;
