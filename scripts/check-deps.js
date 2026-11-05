import fs from 'fs';
import path from 'path';

function getImports(dir) {
  const pkgs = new Set();
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) {
        if (!['node_modules', 'dist', '.git'].includes(f)) walk(p);
      } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
        const text = fs.readFileSync(p, 'utf8');
        const matches = text.matchAll(/(?:import|export)\s+.*?from\s+['"]([^'".][^'"]*)['"]/g);
        for (const m of matches) {
          const raw = m[1];
          if (raw.includes('${') || raw.includes(' ')) continue;
          const name = raw.startsWith('@')
            ? raw.split('/').slice(0, 2).join('/')
            : raw.split('/')[0];
          pkgs.add(name);
        }
        const reqMatches = text.matchAll(/require\(['"]([^'".][^'"]*)['"]\)/g);
        for (const m of reqMatches) {
          const raw = m[1];
          if (raw.includes('${') || raw.includes(' ')) continue;
          const name = raw.startsWith('@')
            ? raw.split('/').slice(0, 2).join('/')
            : raw.split('/')[0];
          pkgs.add(name);
        }
      }
    }
  }
  walk(dir);
  return Array.from(pkgs);
}

const clientPkg = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
const clientDeclared = new Set([
  ...Object.keys(clientPkg.dependencies || {}),
  ...Object.keys(clientPkg.devDependencies || {})
]);

const serverPkg = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
const serverDeclared = new Set([
  ...Object.keys(serverPkg.dependencies || {}),
  ...Object.keys(serverPkg.devDependencies || {}),
  // Builtin node modules:
  'fs',
  'path',
  'http',
  'https',
  'url',
  'crypto',
  'events',
  'stream',
  'util',
  'os',
  'net',
  'tls',
  'child_process',
  'node:test',
  'node:assert',
  'assert'
]);

const clientImports = getImports('client/src');
const serverImports = getImports('server/src');

console.log('Client external packages imported:', clientImports);
const missingClient = clientImports.filter((p) => !clientDeclared.has(p));
console.log('Missing in client/package.json:', missingClient);

console.log('Server external packages imported:', serverImports);
const missingServer = serverImports.filter((p) => !serverDeclared.has(p));
console.log('Missing in server/package.json:', missingServer);

if (missingClient.length > 0 || missingServer.length > 0) {
  process.exit(1);
} else {
  console.log('Zero missing dependencies!');
}
