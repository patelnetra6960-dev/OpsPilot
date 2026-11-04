import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.resolve(__dirname, '../docs/openapi.json');

let openApiSpec = {};
try {
  openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
} catch {
  // Fallback if file read fails
  openApiSpec = {
    openapi: '3.0.3',
    info: { title: 'OpsPilot API', version: '1.0.0' },
    paths: {}
  };
}

const router = Router();

// Expose raw OpenAPI JSON specification
router.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json(openApiSpec);
});

// Swagger UI configuration options
const swaggerUiOptions = {
  customSiteTitle: 'OpsPilot Enterprise API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true
  }
};

// Serve interactive Swagger UI documentation
router.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerUiOptions));

export const docsRouter = router;
export default router;
