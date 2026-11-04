import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🚀 OpsPilot Multi-Tenant SaaS Development Launcher');
console.log('====================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const serverProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'server'),
  stdio: 'inherit',
  shell: true
});

const clientProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'client'),
  stdio: 'inherit',
  shell: true
});

const handleExit = (code) => {
  serverProcess.kill();
  clientProcess.kill();
  process.exit(code);
};

process.on('SIGINT', () => handleExit(0));
process.on('SIGTERM', () => handleExit(0));
