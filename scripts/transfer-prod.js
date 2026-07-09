#!/usr/bin/env node
/**
 * transfer-prod.js — envoltura segura sobre `strapi transfer` para mover datos
 * entre esta instancia LOCAL y Strapi Cloud (PROD).
 *
 * ⚠️  `strapi transfer` es DESTRUCTIVO: reemplaza TODA la base de datos del destino.
 *     No es incremental. Un `push` sobrescribe prod con lo que tengas en local.
 *
 * Variables de entorno (en .env del repo o en el shell):
 *   STRAPI_TRANSFER_URL        URL base de Strapi Cloud, ej. https://xxx.strapiapp.com
 *   STRAPI_TRANSFER_TOKEN  Transfer token de PROD (Admin → Settings → Transfer Tokens)
 *
 * Uso:
 *   node scripts/transfer-prod.js pull     # PROD  → LOCAL  (trae prod a tu máquina)
 *   node scripts/transfer-prod.js push     # LOCAL → PROD   (⚠️ reemplaza prod)
 *   node scripts/transfer-prod.js push --yes   # salta la confirmación extra
 *
 * Flujo recomendado para publicar contenido nuevo:
 *   1) pull   (parte del estado real de prod)
 *   2) crea/edita el post en local y apruébalo
 *   3) push   (sube todo a prod)
 */

const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

// Cargar .env del repo si dotenv está disponible (Strapi lo trae como dependencia).
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {
  /* si no está dotenv, se usan las variables ya presentes en el shell */
}

const direction = (process.argv[2] || '').toLowerCase();
const skipPrompt = process.argv.includes('--yes') || process.argv.includes('--force');

if (!['push', 'pull'].includes(direction)) {
  console.error('Uso: node scripts/transfer-prod.js <push|pull> [--yes]');
  console.error('  pull = PROD → LOCAL   |   push = LOCAL → PROD (destructivo en prod)');
  process.exit(1);
}

const RAW_URL = process.env.STRAPI_TRANSFER_URL;
const TOKEN = process.env.STRAPI_TRANSFER_TOKEN;

const missing = [];
if (!RAW_URL) missing.push('STRAPI_TRANSFER_URL');
if (!TOKEN) missing.push('STRAPI_TRANSFER_TOKEN');
if (missing.length) {
  console.error(`Faltan variables de entorno: ${missing.join(', ')}`);
  console.error('Defínelas en el .env del repo o expórtalas en el shell.');
  process.exit(1);
}

// La URL de transferencia debe apuntar al endpoint /admin.
const url = RAW_URL.replace(/\/+$/, '').endsWith('/admin')
  ? RAW_URL.replace(/\/+$/, '')
  : `${RAW_URL.replace(/\/+$/, '')}/admin`;

const host = (() => {
  try { return new URL(url).host; } catch { return url; }
})();

// Binario local de strapi
const strapiBin = path.join(__dirname, '..', 'node_modules', '.bin', 'strapi');

const args =
  direction === 'push'
    ? ['transfer', '--to', url, '--to-token', TOKEN]
    : ['transfer', '--from', url, '--from-token', TOKEN];

function run() {
  console.log('');
  console.log(`→ strapi transfer (${direction.toUpperCase()})`);
  console.log(`  ${direction === 'push' ? 'LOCAL  →  ' + host + '  (PROD)' : host + ' (PROD)  →  LOCAL'}`);
  console.log('');
  // Nota: strapi mostrará además su propia confirmación de "se borrará el destino".
  const res = spawnSync(strapiBin, args, { stdio: 'inherit' });
  process.exit(res.status == null ? 1 : res.status);
}

if (direction === 'push' && !skipPrompt) {
  console.log('');
  console.log('⚠️  PUSH A PRODUCCIÓN — esto REEMPLAZA toda la base de datos de:');
  console.log(`      ${host}`);
  console.log('    con el contenido de tu Strapi LOCAL. Se perderá cualquier dato que');
  console.log('    exista solo en prod. ¿Hiciste `pull` o backup antes?');
  console.log('');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`Para confirmar, escribe el host de prod exactamente ("${host}"): `, (answer) => {
    rl.close();
    if (answer.trim() !== host) {
      console.error('Confirmación no coincide. Cancelado.');
      process.exit(1);
    }
    run();
  });
} else {
  run();
}
