const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs, chooseMode, loadEnvFile } = require('./consultar-ia.js');

test('parseArgs separa IA, pregunta y banderas', () => {
  assert.deepEqual(parseArgs(['Gemini', 'qué', 'es', 'ñandú', '--no-abrir']), { ia: 'gemini', question: 'qué es ñandú', noOpen: true });
  assert.deepEqual(parseArgs([]), { ia: '', question: '', noOpen: false });
});

test('chooseMode: API solo para gemini con clave; el resto va por web', () => {
  assert.equal(chooseMode('gemini', { GEMINI_API_KEY: 'x' }), 'api');
  assert.equal(chooseMode('gemini', {}), 'web');
  assert.equal(chooseMode('chatgpt', { GEMINI_API_KEY: 'x' }), 'web');
  assert.equal(chooseMode('meta', {}), 'web');
  assert.throws(() => chooseMode('otra', {}), /desconocida/);
});

test('loadEnvFile lee .env sin pisar variables ya definidas', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ia-')), '.env');
  fs.writeFileSync(file, '# nota\nGEMINI_API_KEY=abc\nGEMINI_MODEL=m1\n');
  const env = { GEMINI_MODEL: 'previo' };
  loadEnvFile(file, env);
  assert.deepEqual(env, { GEMINI_MODEL: 'previo', GEMINI_API_KEY: 'abc' });
});
