/* Data Transporte - dashboard. Lee data.json (solo agregados, sin datos personales). */
const $ = (s) => document.querySelector(s);
const CLP = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CL');
const NUM = (n) => Math.round(n).toLocaleString('es-CL');
const C = { p: '#4cd7f6', s: '#4edea3', t: '#ffb2b7', a: '#F59E0B', g: '#869397', grid: 'rgba(255,255,255,.07)' };
const VIEWS = [
  ['resumen', 'Resumen', 'dashboard'], ['ventas', 'Ventas', 'payments'], ['viajes', 'Viajes', 'route'],
  ['clientes', 'Clientes', 'group'], ['sectores', 'Sectores', 'map'], ['costos', 'Costos', 'account_balance_wallet'],
  ['marketing', 'Marketing', 'campaign'], ['calidad', 'Calidad de datos', 'database']];
let D, gran = 'mes'; const charts = {};

Chart.defaults.color = '#bcc9cd'; Chart.defaults.font.family = "'Plus Jakarta Sans',sans-serif";

function draw(id, cfg) {
  if (charts[id]) charts[id].destroy();
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {});
  charts[id] = new Chart($('#' + id), cfg);
}
const scales = (fmt) => ({ x: { grid: { display: false } }, y: { grid: { color: C.grid }, ticks: { callback: fmt || ((v) => NUM(v)) } } });

function semanaISO(fecha) {
  const d = new Date(fecha + 'T00:00:00'); const dia = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dia);
  return d.toISOString().slice(0, 10);
}
function agrupar(rows, g) {
  const m = new Map();
  for (const r of rows) {
    const k = g === 'dia' ? r.fecha : g === 'semana' ? semanaISO(r.fecha) : r.fecha.slice(0, 7);
    const o = m.get(k) || { k, viajes: 0, monto: 0 }; o.viajes += r.viajes || 0; o.monto += r.monto || 0; m.set(k, o);
  }
  return [...m.values()].sort((a, b) => a.k.localeCompare(b.k));
}
const kpi = (t, v, sub, ic) => `<div class="card p-5 flex flex-col gap-3"><div class="flex justify-between items-start"><span class="text-[11px] text-on-surface-variant font-semibold tracking-wide uppercase">${t}</span><span class="p-2 rounded-lg bg-primary/10 text-primary border border-primary/30"><span class="material-symbols-outlined text-lg">${ic}</span></span></div><div class="mono text-2xl font-semibold">${v}</div><div class="text-xs text-on-surface-variant">${sub}</div></div>`;
const tabla = (cols, rows) => `<table class="t"><thead><tr>${cols.map((c, i) => `<th class="${i ? 'n' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? 'n mono' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

function resumen() {
  const v = D.viajes, f = D.finanzas.meses.filter((m) => m.venta > 0), vta = f.reduce((a, m) => a + m.venta, 0), gas = f.reduce((a, m) => a + m.gasto, 0);
  $('#kpis').innerHTML =
    kpi('Ingresos por viajes', CLP(v.ingresos), `${D.meta.periodo_viajes[0]} al ${D.meta.periodo_viajes[1]}`, 'payments') +
    kpi('Viajes realizados', NUM(v.total), `${NUM(v.pasajeros)} pasajeros`, 'route') +
    kpi('Ticket promedio', CLP(v.ticket_promedio), `${NUM(v.no_cobrados)} viajes sin cobro`, 'receipt_long') +
    kpi(`Margen ${f[0].nombre}-${f[f.length - 1].nombre} 2026`, CLP(vta - gas), `Ventas ${CLP(vta)} · Gastos ${CLP(gas)} (meses con ventas)`, 'account_balance');
  const m = agrupar(v.por_dia, gran);
  $('#sub-ing').textContent = 'Agrupado por ' + { dia: 'día', semana: 'semana', mes: 'mes' }[gran];
  draw('c-ing', { type: gran === 'dia' ? 'line' : 'bar', data: { labels: m.map((x) => x.k), datasets: [{ label: 'Ingresos', data: m.map((x) => x.monto), backgroundColor: C.p, borderColor: C.p, borderRadius: 6, pointRadius: 0, tension: .3 }] }, options: { plugins: { legend: { display: false } }, scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
  const pagos = v.pagos.filter((p) => p.viajes);
  draw('c-pago', { type: 'doughnut', data: { labels: pagos.map((p) => p.nombre), datasets: [{ data: pagos.map((p) => p.viajes), backgroundColor: [C.p, C.s, C.a, C.g, C.t, '#a78bfa'], borderWidth: 0 }] }, options: { cutout: '65%', plugins: { legend: { position: 'bottom' } } } });
  draw('c-dow', { type: 'bar', data: { labels: v.por_dow.map((d) => d.nombre), datasets: [{ data: v.por_dow.map((d) => d.viajes), backgroundColor: C.s, borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: scales() } });
  const sec = v.sectores.filter((s) => s.nombre !== 'Sin identificar').slice(0, 6), mx = sec[0].viajes;
  $('#top-sec').innerHTML = sec.map((s) => `<div><div class="flex justify-between text-sm"><span>${s.nombre}</span><span class="mono text-primary">${NUM(s.viajes)}</span></div><div class="bar mt-1"><i style="width:${s.viajes / mx * 100}%"></i></div></div>`).join('');
}
function ventas() {
  const m = agrupar(D.viajes.por_dia, gran);
  draw('c-flujo', { type: gran === 'dia' ? 'line' : 'bar', data: { labels: m.map((x) => x.k), datasets: [{ label: 'Ingresos', data: m.map((x) => x.monto), backgroundColor: C.p, borderColor: C.p, borderRadius: 6, pointRadius: 0, tension: .3, yAxisID: 'y' }, { label: 'Viajes', type: 'line', data: m.map((x) => x.viajes), borderColor: C.a, pointRadius: 0, tension: .3, yAxisID: 'y2' }] }, options: { scales: { x: { grid: { display: false } }, y: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e6) + 'M' } }, y2: { position: 'right', grid: { display: false } } } } });
  const f = D.finanzas.meses;
  draw('c-fin', { type: 'bar', data: { labels: f.map((x) => x.nombre), datasets: [{ label: 'Ventas', data: f.map((x) => x.venta), backgroundColor: C.s, borderRadius: 6 }, { label: 'Gastos', data: f.map((x) => x.gasto), backgroundColor: C.t, borderRadius: 6 }] }, options: { scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
}
function viajes() {
  const h = D.viajes.heatmap, mx = Math.max(...h.valores.flat());
  let html = '<div class="lab"></div>' + h.horas.map((x) => `<div class="lab" style="justify-content:center">${x}</div>`).join('');
  h.valores.forEach((row, i) => { html += `<div class="lab">${h.dias[i]}</div>` + row.map((n) => `<div title="${n} viajes" style="background:rgba(76,215,246,${n ? .12 + .88 * n / mx : .04})">${n || ''}</div>`).join(''); });
  $('#heat').innerHTML = html;
  $('#t-cond').innerHTML = tabla(['Conductor', 'Viajes', 'Ingresos'], D.viajes.conductores.map((c) => [c.nombre, NUM(c.viajes), CLP(c.monto)]));
  const s = D.viajes.sentido.filter((x) => x.viajes);
  draw('c-sent', { type: 'doughnut', data: { labels: s.map((x) => x.nombre), datasets: [{ data: s.map((x) => x.viajes), backgroundColor: [C.p, C.s, C.g], borderWidth: 0 }] }, options: { cutout: '65%', plugins: { legend: { position: 'bottom' } } } });
}
function clientes() {
  const c = D.viajes.clientes;
  $('#kpi-cli').innerHTML = kpi('Clientes únicos', NUM(c.unicos), 'identificados por teléfono', 'group') + kpi('Clientes recurrentes', NUM(c.recurrentes), '2 o más viajes', 'repeat') +
    kpi('Viajes de recurrentes', Math.round(c.viajes_de_recurrentes / D.viajes.total * 100) + '%', `${NUM(c.viajes_de_recurrentes)} de ${NUM(D.viajes.total)} viajes`, 'percent');
  $('#t-cli').innerHTML = tabla(['Cliente', 'Viajes', 'Gasto total'], c.top_anonimo.map((x) => [x.id, x.viajes, CLP(x.monto)]));
}
function sectores() { $('#t-sec').innerHTML = tabla(['Sector', 'Viajes', 'Ingresos', 'Ticket prom.'], D.viajes.sectores.map((s) => [s.nombre, NUM(s.viajes), CLP(s.monto), CLP(s.monto / s.viajes)])); }
function costos() {
  const tot = {}; D.finanzas.meses.forEach((m) => Object.entries(m.gastos).forEach(([k, v]) => (tot[k] = (tot[k] || 0) + v)));
  const e = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  draw('c-gastos', { type: 'bar', data: { labels: e.map((x) => x[0]), datasets: [{ data: e.map((x) => x[1]), backgroundColor: C.t, borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e6) + 'M' } }, y: { grid: { display: false } } } } });
  $('#t-mes').innerHTML = tabla(['Mes', 'Ventas', 'Gastos', 'Margen'], D.finanzas.meses.map((m) => [m.nombre, CLP(m.venta), CLP(m.gasto), `<span style="color:${m.margen < 0 ? '#fb7185' : '#34d399'}">${CLP(m.margen)}</span>`]));
}
function marketing() {
  const v = D.viajes, c = v.clientes, h = v.heatmap, horas = h.horas.map((x, i) => ({ x, n: h.valores.reduce((a, r) => a + r[i], 0) }));
  const valle = horas.filter((o) => o.n > 0).sort((a, b) => a.n - b.n).slice(0, 3).map((o) => o.x + ':00').join(', ');
  const dow = [...v.por_dow].sort((a, b) => a.viajes - b.viajes)[0], dowTop = [...v.por_dow].sort((a, b) => b.viajes - a.viajes)[0];
  const sec = v.sectores.filter((s) => s.nombre !== 'Sin identificar').slice(0, 3).map((s) => s.nombre);
  const pagoNo = v.pagos.find((p) => p.nombre === 'No cobrado');
  const op = [
    ['repeat', 'Fidelizar clientes recurrentes', `${NUM(c.recurrentes)} clientes ya viajaron 2 o más veces y generan el ${Math.round(c.viajes_de_recurrentes / v.total * 100)}% de los viajes. Ofrece un descuento por el próximo viaje o un pase de ida y vuelta.`, `Hola, gracias por viajar con nosotros. Por ser cliente frecuente tienes un beneficio en tu próximo traslado al aeropuerto. ¿Te reservamos tu viaje?`],
    ['schedule', 'Promoción en horas valle', `Las horas con menos demanda son ${valle}. Una tarifa especial en esos horarios llena la flota sin competir con la hora punta.`, `Viaja entre las ${valle.split(',')[0]} y obtén tarifa preferente al aeropuerto. Reserva por WhatsApp.`],
    ['calendar_month', `Reforzar el día ${dow.nombre}`, `${dow.nombre} es el día más flojo (${NUM(dow.viajes)} viajes) y ${dowTop.nombre} el más fuerte (${NUM(dowTop.viajes)}). Lanza una oferta de ${dow.nombre} en redes sociales.`, `Los ${dow.nombre} tu traslado al aeropuerto con descuento. Reserva con anticipación.`],
    ['map', 'Publicidad por sector', `Los sectores con más viajes son ${sec.join(', ')}. Segmenta anuncios de Google y Meta a esas comunas con la promesa de recogida en la puerta.`, `Traslados al aeropuerto desde ${sec[0]}: puntualidad y tarifa clara. Reserva hoy.`],
    ['payments', 'Cobros pendientes o cortesías', pagoNo ? `${NUM(pagoNo.viajes)} viajes figuran como "no cobrado" (${CLP(pagoNo.monto)} en tarifa). Revisa si son convenios, cortesías o cobros por regularizar.` : 'Sin viajes marcados como no cobrados.', null],
    ['share', 'Contenido para redes sociales', `Publica el ranking de comunas más atendidas, tips de viaje al aeropuerto y testimonios de clientes recurrentes. Calendario sugerido: 3 publicaciones por semana, reforzando ${dow.nombre}.`, null]];
  $('#ops').innerHTML = op.map((o, i) => `<div class="card p-5 flex flex-col gap-3"><div class="flex items-center gap-2 text-primary"><span class="material-symbols-outlined">${o[0]}</span><h3 class="font-semibold">${o[1]}</h3></div><p class="text-sm text-on-surface-variant">${o[2]}</p>${o[3] ? `<button data-i="${i}" class="cp self-start text-sm font-semibold px-3 py-2 rounded-lg bg-primary-container text-on-primary">Copiar mensaje de promoción</button>` : ''}</div>`).join('');
  document.querySelectorAll('.cp').forEach((b) => b.addEventListener('click', () => { navigator.clipboard.writeText(op[b.dataset.i][3]); b.textContent = '¡Copiado!'; setTimeout(() => (b.textContent = 'Copiar mensaje de promoción'), 1500); }));
}
function calidad() {
  const q = D.meta.calidad, n = D.viajes.total;
  const filas = [['Viajes duplicados eliminados', q.viajes.duplicados_eliminados], ['Viajes sin tarifa', q.viajes.sin_tarifa], ['Viajes sin hora', q.viajes.sin_hora], ['Viajes sin sector identificado', q.sin_sector], ['Viajes sin medio de pago', q.pago_sin_dato], ['Celdas con texto (xxx) en gastos', q.finanzas['texto_en_gastos(xxx)'] || 0], ['Hojas ignoradas (ej. reservas futuras)', q.viajes.hojas_ignoradas]];
  $('#t-cal').innerHTML = tabla(['Control', 'Casos', '% de viajes'], filas.map(([a, b]) => [a, NUM(b || 0), (b / n * 100).toFixed(1) + '%']));
}
const RENDER = { resumen, ventas, viajes, clientes, sectores, costos, marketing, calidad };
function show(id) {
  if (!RENDER[id]) id = 'resumen';
  document.querySelectorAll('.view').forEach((e) => e.classList.toggle('active', e.id === 'v-' + id));
  document.querySelectorAll('[data-v]').forEach((e) => e.classList.toggle('active', e.dataset.v === id));
  $('#titulo').textContent = VIEWS.find((x) => x[0] === id)[1];
  $('#gran').style.display = ['resumen', 'ventas'].includes(id) ? '' : 'none';
  RENDER[id](); history.replaceState(null, '', '#' + id);
}
async function init() {
  const nav = VIEWS.map(([id, t, ic]) => `<a class="navlink" data-v="${id}"><span class="material-symbols-outlined text-xl">${ic}</span><span>${t}</span></a>`).join('');
  $('#nav').innerHTML = nav; $('#mnav').innerHTML = nav;
  document.querySelectorAll('[data-v]').forEach((e) => e.addEventListener('click', () => show(e.dataset.v)));
  $('#gran').addEventListener('click', (e) => { if (!e.target.dataset.g) return; gran = e.target.dataset.g; document.querySelectorAll('#gran button').forEach((b) => b.classList.toggle('on', b === e.target)); show(location.hash.slice(1) || 'resumen'); });
  D = await (await fetch('data.json?v=' + Date.now())).json();
  $('#gen').textContent = D.meta.generado.replace('T', ' ').slice(0, 16);
  show(location.hash.slice(1) || 'resumen');
}
init().catch((e) => { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:1rem;color:#fb7185">No se pudieron cargar los datos: ' + e.message + '</p>'); });
