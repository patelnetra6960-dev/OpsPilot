import env from './env.js';

export const corsOptions = {
  origin: (origin, callback) => {
    // Dynamically parse allowed origins from environment (comma-separated)
    const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    const allowedOrigins = [
      env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      ...envOrigins
    ];

    // Allow requests with no origin (like mobile apps, curl, server-to-server healthchecks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow production domains and tenant subdomains matching *.opspilot.com / *.opspilot.app
    if (/^https?:\/\/([a-zA-Z0-9-]+\.)*opspilot\.(com|io|app|internal)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy violation: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-Id',
    'X-Request-Id',
    'X-Correlation-ID',
    'X-Test-Rate-Limit'
  ],
  exposedHeaders: [
    'X-Request-Id',
    'X-Correlation-ID',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'Retry-After'
  ],
  maxAge: 86400 // 24 hours
};

export default corsOptions;
