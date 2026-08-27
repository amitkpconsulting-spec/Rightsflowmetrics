// Script to verify Node environment and dependencies safely across all platforms (Windows/macOS/Linux)
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

console.log('-------------------------------------------------------------------------------');
console.log('              RightsFlow Metrics - Pre-flight Verification Engine');
console.log('-------------------------------------------------------------------------------');

let hasErrors = false;

// 1. Node.js Version Check
const majorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (majorVersion < 18) {
  console.warn(`[WARNING] Detected Node.js ${process.version}. Node.js v18.0.0 or higher is recommended for Vite 6.`);
} else {
  console.log(`[OK] Node.js version: ${process.version} (supported)`);
}

// 2. package.json Check
const pkgPath = path.join(projectRoot, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('[ERROR] package.json not found in current directory!');
  hasErrors = true;
} else {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const requiredScripts = ['dev', 'build', 'start'];
    const missingScripts = requiredScripts.filter((s) => !pkg.scripts || !pkg.scripts[s]);
    if (missingScripts.length > 0) {
      console.error(`[ERROR] Missing required scripts in package.json: ${missingScripts.join(', ')}`);
      hasErrors = true;
    } else {
      console.log(`[OK] package.json verified with scripts: ${Object.keys(pkg.scripts || {}).join(', ')}`);
    }
  } catch (err) {
    console.error('[ERROR] Could not parse package.json:', err.message);
    hasErrors = true;
  }
}

// 3. .env Configuration Check
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');
if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('[OK] Created .env configuration from .env.example.');
  } else {
    fs.writeFileSync(envPath, 'PORT=3000\n');
    console.log('[OK] Created default .env file.');
  }
} else {
  console.log('[OK] .env configuration file exists.');
}

// 4. Core Dependencies Verification (when checking post-install)
const isPostInstall = process.argv.includes('--check-deps');
if (isPostInstall) {
  const coreDeps = [
    'express',
    'vite',
    'vite-node',
    'esbuild',
    'react',
    'react-dom',
    'lucide-react',
    'recharts',
    'sql.js'
  ];
  const missingDeps = coreDeps.filter((dep) => !fs.existsSync(path.join(projectRoot, 'node_modules', dep)));
  if (missingDeps.length > 0) {
    console.error(`[ERROR] Missing installed modules: ${missingDeps.join(', ')}`);
    hasErrors = true;
  } else {
    console.log(`[OK] All ${coreDeps.length} core dependencies verified in node_modules.`);
  }
}

console.log('-------------------------------------------------------------------------------');
if (hasErrors) {
  process.exit(1);
} else {
  process.exit(0);
}
