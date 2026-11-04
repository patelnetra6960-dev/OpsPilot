import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';

const traverse = _traverse.default || _traverse;

const standardGlobals = new Set([
  'console',
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'fetch',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'Blob',
  'File',
  'URL',
  'URLSearchParams',
  'CustomEvent',
  'Event',
  'Promise',
  'Set',
  'Map',
  'WeakSet',
  'WeakMap',
  'Intl',
  'Math',
  'Date',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'RegExp',
  'Error',
  'TypeError',
  'RangeError',
  'JSON',
  'Infinity',
  'NaN',
  'undefined',
  'process',
  'Buffer',
  'global',
  'globalThis',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'import',
  'alert',
  'confirm',
  'prompt',
  'React'
]);

function getFiles(dir, exts = ['.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'coverage' && file !== '.git') {
        results = results.concat(getFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }
  return results;
}

const clientFiles = getFiles('client/src');
const serverFiles = getFiles('server/src');
const allFiles = [...clientFiles, ...serverFiles];

let totalIssues = 0;
const report = {};

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx']
    });

    const fileUndeclared = [];
    traverse(ast, {
      Program(programPath) {
        programPath.traverse({
          Identifier(idPath) {
            if (!idPath.isReferencedIdentifier()) return;
            const name = idPath.node.name;
            if (standardGlobals.has(name)) return;
            if (!idPath.scope.hasBinding(name)) {
              // Ignore JSX pragma if handled
              fileUndeclared.push({
                name,
                line: idPath.node.loc.start.line,
                col: idPath.node.loc.start.column
              });
            }
          }
        });
      }
    });

    if (fileUndeclared.length > 0) {
      report[filePath] = fileUndeclared;
      totalIssues += fileUndeclared.length;
    }
  } catch (err) {
    console.error(`Parse error in ${filePath}:`, err.message);
  }
}

console.log('=== UNDECLARED IDENTIFIERS SCAN RESULT ===');
console.log(`Total issues found: ${totalIssues}`);
for (const [file, issues] of Object.entries(report)) {
  console.log(`\nFile: ${file}`);
  for (const issue of issues) {
    console.log(`  - Line ${issue.line}:${issue.col} -> ${issue.name}`);
  }
}

if (totalIssues > 0) {
  process.exit(1);
} else {
  console.log('All files passed scope analysis with zero undeclared identifiers!');
  process.exit(0);
}
