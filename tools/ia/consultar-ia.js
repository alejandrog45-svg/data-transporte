#!/usr/bin/env node
// Consulta puntual a otras IAs (segunda opinión). Herramienta manual: no se llama desde ningún flujo del producto.
//
//   node tools/ia/consultar-ia.js gemini  "pregunta"
//   node tools/ia/consultar-ia.js chatgpt "pregunta"
//   node tools/ia/consultar-ia.js meta    "pregunta"
//   (la pregunta también puede venir por stdin; --no-abrir no abre el navegador)
//
// - gemini: llama a la API si hay GEMINI_API_KEY (entorno o .env de la raíz, que está en .gitignore).
// - chatgpt / meta (y gemini sin clave): no hay API gratuita; copia la pregunta al portapapeles y abre la web.
//   Si el navegador pide iniciar sesión, usar la cuenta alejandrog45. Último recurso: extensión de Chrome.
// Nunca se guardan ni se imprimen claves.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SITES = {
  gemini: 'https://gemini.google.com/app',
  chatgpt: 'https://chatgpt.com/',
  meta: 'https://www.meta.ai/'
};

function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith('--'));
  const rest = argv.filter((a) => !a.startsWith('--'));
  return { ia: (rest[0] || '').toLowerCase(), question: rest.slice(1).join(' ').trim(), noOpen: flags.includes('--no-abrir') };
}

function loadEnvFile(envPath, env = process.env) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const eq = t.indexOf('=');
    const key = t.slice(0, eq).trim();
    if (!(key in env)) env[key] = t.slice(eq + 1).trim();
  }
}

// Decide cómo se atiende la consulta: 'api' solo para Gemini con clave; el resto va por web.
function chooseMode(ia, env = process.env) {
  if (!SITES[ia]) throw new Error(`IA desconocida "${ia}". Usar: gemini, chatgpt o meta`);
  return ia === 'gemini' && env.GEMINI_API_KEY ? 'api' : 'web';
}

async function askGemini(question, env = process.env) {
  const model = env.GEMINI_MODEL || 'gemini-3.6-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: question }] }] })
  });
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || JSON.stringify(data, null, 2);
}

function copyToClipboard(text) {
  // La pregunta viaja por variable de entorno para conservar tildes y ñ.
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Set-Clipboard -Value $env:IA_PREGUNTA'], { env: { ...process.env, IA_PREGUNTA: text } });
  return r.status === 0;
}

function openBrowser(url) {
  spawnSync('cmd.exe', ['/c', 'start', '', url], { stdio: 'ignore' });
}

async function main() {
  const { ia, question: argQuestion, noOpen } = parseArgs(process.argv.slice(2));
  loadEnvFile(path.join(__dirname, '..', '..', '.env'));
  let question = argQuestion;
  if (!question && !process.stdin.isTTY) question = fs.readFileSync(0, 'utf8').trim();
  if (!ia || !question) {
    console.error('Uso: node tools/ia/consultar-ia.js <gemini|chatgpt|meta> "pregunta"');
    process.exit(1);
  }
  const mode = chooseMode(ia);
  if (mode === 'api') {
    console.log(await askGemini(question));
    return;
  }
  const copied = noOpen ? false : copyToClipboard(question);
  if (!noOpen) openBrowser(SITES[ia]);
  console.log(`Modo web (${ia}): ${noOpen ? 'sin abrir navegador' : 'navegador abierto'}.`);
  console.log(copied ? 'La pregunta quedó copiada: pégala con Ctrl+V en el chat y envía.' : 'Copia la pregunta manualmente:\n\n' + question);
  if (ia === 'gemini') console.log('Para respuestas directas en la terminal: crear una clave gratuita en Google AI Studio (cuenta alejandrog45) y guardar GEMINI_API_KEY en el .env de la raíz.');
}

module.exports = { parseArgs, chooseMode, loadEnvFile, SITES };

if (require.main === module) {
  main().catch((err) => { console.error('Error:', err.message); process.exit(1); });
}
