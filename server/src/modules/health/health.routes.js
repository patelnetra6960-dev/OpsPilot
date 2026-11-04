import { Router } from 'express';
import { sendSuccess } from '../../utils/responseHandler.js';
import env from '../../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  return sendSuccess(
    res,
    {
      service: 'OpsPilot API',
      status: 'healthy',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      features: {
        multiTenancy: 'active',
        databaseRLS: 'enforced',
        authProvider: 'Supabase Auth'
      }
    },
    'OpsPilot Modular Monolith API is operational'
  );
});

export default router;
