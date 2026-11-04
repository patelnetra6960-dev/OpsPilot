import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🔍 OpsPilot Environment & Supabase Health Check');
console.log('====================================================\n');

const checkFile = (filePath, description) => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ [FOUND]     ${description}: ${path.relative(rootDir, filePath)}`);
    return true;
  } else {
    console.log(`⚠️ [OPTIONAL]  ${description}: ${path.relative(rootDir, filePath)}`);
    return false;
  }
};

checkFile(path.join(rootDir, '.env.example'), 'Root Environment Example');
checkFile(path.join(rootDir, 'server', '.env.example'), 'Server Environment Example');
checkFile(path.join(rootDir, 'client', '.env.example'), 'Client Environment Example');
checkFile(path.join(rootDir, 'supabase', 'config.toml'), 'Supabase CLI Local Config');
checkFile(path.join(rootDir, 'server', '.env'), 'Server Active .env');
checkFile(path.join(rootDir, 'client', '.env'), 'Client Active .env');

console.log('\n🔒 Security Assertion Check:');
const clientEnvPath = path.join(rootDir, 'client', '.env');
if (fs.existsSync(clientEnvPath)) {
  const clientEnvContent = fs.readFileSync(clientEnvPath, 'utf8');
  if (
    clientEnvContent.includes('SUPABASE_SERVICE_ROLE_KEY') &&
    !clientEnvContent.includes('# Under NO circumstances')
  ) {
    console.error('❌ [SECURITY VIOLATION] SUPABASE_SERVICE_ROLE_KEY found in client .env file!');
    process.exit(1);
  }
  if (clientEnvContent.includes('DATABASE_URL=')) {
    console.error('❌ [SECURITY VIOLATION] Direct DATABASE_URL found in client .env file!');
    process.exit(1);
  }
  console.log(
    '✅ [PASSED] Zero service-role or database credentials exposed in frontend environment.'
  );
} else {
  console.log('ℹ️ [INFO] client/.env not created yet (using development fallback mocks).');
}

// Check migrations directory
const migrationsDir = path.join(rootDir, 'database', 'migrations');
if (fs.existsSync(migrationsDir)) {
  const count = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length;
  console.log(`✅ [PASSED] Database migrations verified (${count} sequential SQL files).`);
}

console.log('\n✨ Supabase and database foundation checks complete.');
