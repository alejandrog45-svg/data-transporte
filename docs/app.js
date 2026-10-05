/* Data Transporte - dashboard. Lee data.json (solo agregados, sin datos personales). */
const $ = (s) => document.querySelector(s);
const CLP = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CL');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NUM = (n) => Math.round(n).toLocaleString('es-CL');
const C = { p: '#4cd7f6', s: '#4edea3', t: '#ffb2b7', a: '#F59E0B', g: '#869397', grid: 'rgba(255,255,255,.07)' };
const VIEWS = [
  ['resumen', 'Resumen', 'dashboard'], ['ventas', 'Ventas', 'payments'], ['viajes', 'Viajes', 'route'],
  ['clientes', 'Clientes', 'group'], ['sectores', 'Sectores', 'map'], ['convenios', 'Convenios', 'handshake'], ['anulados', 'Anulados', 'event_busy'], ['costos', 'Costos', 'account_balance_wallet'],
  ['marketing', 'Marketing', 'campaign'], ['calidad', 'Calidad de datos', 'database']];
let D, gran = 'mes'; const charts = {};


const F = { conductor: '', pago: '', sentido: '', sector: '', desde: '', hasta: '' };
const DOWN = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
/* Agregados de viajes calculados en el navegador desde el cubo, respetando los filtros. */
function W(cube = D.cubo, pred = null) {
  const c = cube, i = Object.fromEntries(c.cols.map((n, k) => [n, k]));
  const rows = c.rows.filter((r) => (!F.conductor || r[i.conductor] === F.conductor) && (!F.pago || r[i.pago] === F.pago) && (!F.sentido || r[i.sentido] === F.sentido) && (!F.sector || r[i.sector] === F.sector) && (!F.desde || r[i.fecha] >= F.desde) && (!F.hasta || r[i.fecha] <= F.hasta) && (!pred || pred(r, i)));
  const grp = (key) => { const m = new Map(); for (const r of rows) { const k = key(r); const o = m.get(k) || { nombre: k, viajes: 0, monto: 0, tarifa: 0 }; o.viajes += r[i.viajes]; o.monto += r[i.monto]; o.tarifa += r[i.tarifa]; m.set(k, o); } return [...m.values()]; };
  const out = { total: 0, ingresos: 0, tarifa: 0, pasajeros: 0, convenios: 0, cobrados: 0 };
  const heat = DOWN.map(() => Array(24).fill(0)), dow = DOWN.map((n) => ({ nombre: n, viajes: 0, monto: 0 })), dia = new Map();
  for (const r of rows) {
    out.total += r[i.viajes]; out.ingresos += r[i.monto]; out.pasajeros += r[i.pax]; out.cobrados += r[i.cobrados]; out.tarifa += r[i.tarifa];
    if (r[i.pago].startsWith('Convenio')) out.convenios += r[i.viajes];
    const d = (new Date(r[i.fecha] + 'T00:00:00').getDay() + 6) % 7;
    dow[d].viajes += r[i.viajes]; dow[d].monto += r[i.monto];
    if (r[i.hora] !== null) heat[d][r[i.hora]] += r[i.viajes];
    const o = dia.get(r[i.fecha]) || { fecha: r[i.fecha], viajes: 0, monto: 0, tarifa: 0 }; o.viajes += r[i.viajes]; o.monto += r[i.monto]; o.tarifa += r[i.tarifa]; dia.set(r[i.fecha], o);
  }
  out.ticket_promedio = out.cobrados ? out.ingresos / out.cobrados : 0;
  out.por_dia = [...dia.values()].sort((x, y) => x.fecha.localeCompare(y.fecha));
  out.por_dow = dow; out.heatmap = { dias: DOWN, horas: [...Array(24).keys()], valores: heat };
  const by = (f) => f.sort((x, y) => y.viajes - x.viajes);
  out.conductores = grp((r) => r[i.conductor]).sort((x, y) => y.monto - x.monto).slice(0, 12);
  out.pagos = by(grp((r) => r[i.pago])); out.sectores = by(grp((r) => r[i.sector])); out.sentido = by(grp((r) => r[i.sentido]));
  out._g = (col) => grp((r) => r[i[col]]);
  return out;
}

/* Finanzas 2026 (ventas y gastos) dentro del rango de fechas. */
function FIN() {
  const dias = D.finanzas.dias.filter((d) => (!F.desde || d.fecha >= F.desde) && (!F.hasta || d.fecha <= F.hasta));
  const m = new Map();
  for (const d of dias) {
    const k = +d.fecha.slice(5, 7), o = m.get(k) || { mes: k, nombre: MESN[k], venta: 0, gasto: 0, margen: 0, gastos: {} };
    o.venta += d.venta; o.gasto += d.gasto;
    for (const [c, x] of Object.entries(d.gastos || {})) o.gastos[c] = (o.gastos[c] || 0) + x;
    m.set(k, o);
  }
  const meses = [...m.values()].sort((x, y) => x.mes - y.mes); meses.forEach((o) => (o.margen = o.venta - o.gasto));
  return { dias, meses };
}
/* Clientes (anonimos) dentro del rango de fechas, desde las listas de viajes por cliente. */
function CL() {
  const ok = (f) => (!F.desde || f >= F.desde) && (!F.hasta || f <= F.hasta);
  const lista = D.clientes_viajes.map((vs) => vs.filter((v) => ok(v[0]))).filter((vs) => vs.length), rec = lista.filter((vs) => vs.length >= 2);
  return { unicos: lista.length, recurrentes: rec.length, viajes_de_recurrentes: rec.reduce((s, vs) => s + vs.length, 0), total: lista.reduce((s, vs) => s + vs.length, 0),
    top_anonimo: [...rec].sort((x, y) => y.length - x.length).slice(0, 10).map((vs, i) => ({ id: 'Cliente ' + String(i + 1).padStart(2, '0'), viajes: vs.length, monto: vs.reduce((s, v) => s + v[1], 0) })) };
}
function opciones(col) { const i = D.cubo.cols.indexOf(col); return [...new Set(D.cubo.rows.map((r) => r[i]))].sort((a, b) => String(a).localeCompare(String(b))); }

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
  const v = W(), f = FIN().meses.filter((m) => m.venta > 0), vta = f.reduce((a, m) => a + m.venta, 0), gas = f.reduce((a, m) => a + m.gasto, 0);
  $('#kpis').innerHTML =
    kpi('Ingresos por viajes', CLP(v.ingresos), `${D.meta.periodo_viajes[0]} al ${D.meta.periodo_viajes[1]}`, 'payments') +
    kpi('Viajes realizados', NUM(v.total), `${NUM(v.pasajeros)} pasajeros`, 'route') +
    kpi('Ticket promedio', CLP(v.ticket_promedio), `${NUM(v.convenios)} bajo convenio · ${NUM(D.cubo_anulados.rows.reduce((s, r) => s + r[6], 0))} anulados aparte`, 'receipt_long') +
    (f.length ? kpi(`Margen ${f[0].nombre}-${f[f.length - 1].nombre} 2026`, CLP(vta - gas), `Ventas ${CLP(vta)} · Gastos ${CLP(gas)} (meses con ventas)`, 'account_balance') : kpi('Margen 2026', '—', 'sin datos de 2026 en el rango de fechas', 'account_balance'));
  const m = agrupar(v.por_dia, gran);
  $('#sub-ing').textContent = 'Agrupado por ' + { dia: 'día', semana: 'semana', mes: 'mes' }[gran];
  draw('c-ing', { type: gran === 'dia' ? 'line' : 'bar', data: { labels: m.map((x) => x.k), datasets: [{ label: 'Ingresos', data: m.map((x) => x.monto), backgroundColor: C.p, borderColor: C.p, borderRadius: 6, pointRadius: 0, tension: .3 }] }, options: { plugins: { legend: { display: false } }, scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
  const pagos = v.pagos.filter((p) => p.viajes);
  draw('c-pago', { type: 'doughnut', data: { labels: pagos.map((p) => p.nombre), datasets: [{ data: pagos.map((p) => p.viajes), backgroundColor: [C.p, C.s, C.a, C.g, C.t, '#a78bfa'], borderWidth: 0 }] }, options: { cutout: '65%', plugins: { legend: { position: 'bottom' } } } });
  draw('c-dow', { type: 'bar', data: { labels: v.por_dow.map((d) => d.nombre), datasets: [{ data: v.por_dow.map((d) => d.viajes), backgroundColor: C.s, borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: scales() } });
  const sec = v.sectores.filter((s) => s.nombre !== 'Sin identificar').slice(0, 6), mx = sec[0]?.viajes || 1;
  $('#top-sec').innerHTML = sec.map((s) => `<div><div class="flex justify-between text-sm"><span>${esc(s.nombre)}</span><span class="mono text-primary">${NUM(s.viajes)}</span></div><div class="bar mt-1"><i style="width:${s.viajes / mx * 100}%"></i></div></div>`).join('');
}
function ventas() {
  const m = agrupar(W().por_dia, gran);
  draw('c-flujo', { type: gran === 'dia' ? 'line' : 'bar', data: { labels: m.map((x) => x.k), datasets: [{ label: 'Ingresos', data: m.map((x) => x.monto), backgroundColor: C.p, borderColor: C.p, borderRadius: 6, pointRadius: 0, tension: .3, yAxisID: 'y' }, { label: 'Viajes', type: 'line', data: m.map((x) => x.viajes), borderColor: C.a, pointRadius: 0, tension: .3, yAxisID: 'y2' }] }, options: { scales: { x: { grid: { display: false } }, y: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e6) + 'M' } }, y2: { position: 'right', grid: { display: false } } } } });
  const f = FIN().meses;
  draw('c-fin', { type: 'bar', data: { labels: f.map((x) => x.nombre), datasets: [{ label: 'Ventas', data: f.map((x) => x.venta), backgroundColor: C.s, borderRadius: 6 }, { label: 'Gastos', data: f.map((x) => x.gasto), backgroundColor: C.t, borderRadius: 6 }] }, options: { scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
}
function viajes() {
  const V = W(), h = V.heatmap, mx = Math.max(1, ...h.valores.flat());
  let html = '<div class="lab"></div>' + h.horas.map((x) => `<div class="lab" style="justify-content:center">${x}</div>`).join('');
  h.valores.forEach((row, i) => { html += `<div class="lab">${h.dias[i]}</div>` + row.map((n) => `<div title="${n} viajes" style="background:rgba(76,215,246,${n ? .12 + .88 * n / mx : .04})">${n || ''}</div>`).join(''); });
  $('#heat').innerHTML = html;
  $('#t-cond').innerHTML = tabla(['Conductor', 'Viajes', 'Ingresos'], V.conductores.map((c) => [esc(c.nombre), NUM(c.viajes), CLP(c.monto)]));
  const s = V.sentido.filter((x) => x.viajes);
  draw('c-sent', { type: 'doughnut', data: { labels: s.map((x) => x.nombre), datasets: [{ data: s.map((x) => x.viajes), backgroundColor: [C.p, C.s, C.g], borderWidth: 0 }] }, options: { cutout: '65%', plugins: { legend: { position: 'bottom' } } } });
}
function clientes() {
  const c = CL();
  $('#kpi-cli').innerHTML = kpi('Clientes únicos', NUM(c.unicos), 'identificados por teléfono', 'group') + kpi('Clientes recurrentes', NUM(c.recurrentes), '2 o más viajes', 'repeat') +
    kpi('Viajes de recurrentes', Math.round(c.viajes_de_recurrentes / Math.max(1, c.total) * 100) + '%', `${NUM(c.viajes_de_recurrentes)} de ${NUM(c.total)} viajes`, 'percent');
  $('#t-cli').innerHTML = tabla(['Cliente', 'Viajes', 'Gasto total'], c.top_anonimo.map((x) => [esc(x.id), x.viajes, CLP(x.monto)]));
}
function sectores() { $('#t-sec').innerHTML = tabla(['Sector', 'Viajes', 'Ingresos', 'Ticket prom.'], W().sectores.map((s) => [esc(s.nombre), NUM(s.viajes), CLP(s.monto), CLP(s.monto / s.viajes)])); }
function costos() {
  const tot = {}; FIN().meses.forEach((m) => Object.entries(m.gastos).forEach(([k, v]) => (tot[k] = (tot[k] || 0) + v)));
  const e = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  draw('c-gastos', { type: 'bar', data: { labels: e.map((x) => x[0]), datasets: [{ data: e.map((x) => x[1]), backgroundColor: C.t, borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e6) + 'M' } }, y: { grid: { display: false } } } } });
  $('#t-mes').innerHTML = tabla(['Mes', 'Ventas', 'Gastos', 'Margen'], FIN().meses.map((m) => [m.nombre, CLP(m.venta), CLP(m.gasto), `<span style="color:${m.margen < 0 ? '#fb7185' : '#34d399'}">${CLP(m.margen)}</span>`]));
}
function marketing() {
  const v = W(), c = CL(), h = v.heatmap, horas = h.horas.map((x, i) => ({ x, n: h.valores.reduce((a, r) => a + r[i], 0) }));
  const valle = horas.filter((o) => o.n > 0).sort((a, b) => a.n - b.n).slice(0, 3).map((o) => o.x + ':00').join(', ');
  const dow = [...v.por_dow].sort((a, b) => a.viajes - b.viajes)[0], dowTop = [...v.por_dow].sort((a, b) => b.viajes - a.viajes)[0];
  const sec = v.sectores.filter((s) => s.nombre !== 'Sin identificar').slice(0, 3).map((s) => s.nombre);
  const cv = W(D.cubo, (r, i) => r[i.pago].startsWith('Convenio')), an = W(D.cubo_anulados), totR = D.viajes.total;
  const op = [
    ['repeat', 'Fidelizar clientes recurrentes', `${NUM(c.recurrentes)} clientes ya viajaron 2 o más veces y generan el ${Math.round(c.viajes_de_recurrentes / Math.max(1, c.total) * 100)}% de los viajes. Ofrece un descuento por el próximo viaje o un pase de ida y vuelta.`, `Hola, gracias por viajar con nosotros. Por ser cliente frecuente tienes un beneficio en tu próximo traslado al aeropuerto. ¿Te reservamos tu viaje?`],
    ['schedule', 'Promoción en horas valle', `Las horas con menos demanda son ${valle}. Una tarifa especial en esos horarios llena la flota sin competir con la hora punta.`, `Viaja entre las ${valle.split(',')[0]} y obtén tarifa preferente al aeropuerto. Reserva por WhatsApp.`],
    ['calendar_month', `Reforzar el día ${dow.nombre}`, `${dow.nombre} es el día más flojo (${NUM(dow.viajes)} viajes) y ${dowTop.nombre} el más fuerte (${NUM(dowTop.viajes)}). Lanza una oferta de ${dow.nombre} en redes sociales.`, `Los ${dow.nombre} tu traslado al aeropuerto con descuento. Reserva con anticipación.`],
    ['map', 'Publicidad por sector', `Los sectores con más viajes son ${sec.join(', ')}. Segmenta anuncios de Google y Meta a esas comunas con la promesa de recogida en la puerta.`, `Traslados al aeropuerto desde ${sec[0] || 'tu zona'}: puntualidad y tarifa clara. Reserva hoy.`],
    ['handshake', 'Convenios', `${NUM(cv.total)} viajes bajo convenio (${(cv.total / Math.max(1, totR) * 100).toFixed(1)}% de los viajes), valorizados en ${CLP(cv.tarifa)}. Renegocia tarifas de los convenios que más mueven, ofrece nuevos convenios a empresas y hoteles de los mismos sectores, y vigila que el pago diferido llegue a tiempo.`, null],
    ['event_busy', 'Reducir anulaciones', `${NUM(an.total)} viajes anulados (${(an.total / Math.max(1, totR + an.total) * 100).toFixed(1)}% de los registros). Reconfirma por WhatsApp 24 horas antes del viaje y ofrece reprogramar en vez de anular.`, `Hola, te recordamos tu traslado de mañana. ¿Nos confirmas la hora y la dirección? Si necesitas cambiarlo, lo reprogramamos sin problema.`],
    ['share', 'Contenido para redes sociales', `Publica el ranking de comunas más atendidas, tips de viaje al aeropuerto y testimonios de clientes recurrentes. Calendario sugerido: 3 publicaciones por semana, reforzando ${dow.nombre}.`, null]];
  $('#ops').innerHTML = op.map((o, i) => `<div class="card p-5 flex flex-col gap-3"><div class="flex items-center gap-2 text-primary"><span class="material-symbols-outlined">${o[0]}</span><h3 class="font-semibold">${o[1]}</h3></div><p class="text-sm text-on-surface-variant">${esc(o[2])}</p>${o[3] ? `<button data-i="${i}" class="cp self-start text-sm font-semibold px-3 py-2 rounded-lg bg-primary-container text-on-primary">Copiar mensaje de promoción</button>` : ''}</div>`).join('');
  document.querySelectorAll('.cp').forEach((b) => b.addEventListener('click', () => { navigator.clipboard.writeText(op[b.dataset.i][3]); b.textContent = '¡Copiado!'; setTimeout(() => (b.textContent = 'Copiar mensaje de promoción'), 1500); }));
}
function calidad() {
  const q = D.meta.calidad, n = D.viajes.total;
  const filas = [['Viajes duplicados eliminados', q.viajes.duplicados_eliminados], ['Viajes sin tarifa', q.viajes.sin_tarifa], ['Viajes sin hora', q.viajes.sin_hora], ['Viajes anulados ("Nulo"), excluidos de ventas', q.viajes.anulados], ['Viajes sin sector identificado', q.sin_sector], ['Viajes sin medio de pago', q.pago_sin_dato], ['Celdas con texto (xxx) en gastos', q.finanzas['texto_en_gastos(xxx)'] || 0], ['Hojas ignoradas (ej. reservas futuras)', q.viajes.hojas_ignoradas]];
  $('#t-cal').innerHTML = tabla(['Control', 'Casos', '% de viajes'], filas.map(([a, b]) => [a, NUM(b || 0), (b / n * 100).toFixed(1) + '%']));
  const ver = D.meta.verificaciones || [], ok = ver.filter((c) => c.ok).length;
  $('#t-ver').innerHTML = `<p class="text-sm mb-3">${ok === ver.length ? '<span style="color:#34d399">Todos los controles pasaron</span>' : '<span style="color:#fbbf24">' + ok + ' de ' + ver.length + ' controles sin observaciones</span>'} (${ok}/${ver.length}). Se recalculan en cada actualización.</p>` +
    tabla(['Control', 'Estado', 'Detalle'], ver.map((c) => [esc(c.control), c.ok ? '<span style="color:#34d399">OK</span>' : (c.critico ? '<span style="color:#fb7185">FALLA</span>' : '<span style="color:#fbbf24">Aviso</span>'), esc(c.detalle)]));
}

const MESN = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function subvista(p, cube, pred, anulado) {
  const v = W(cube, pred), totalAnul = D.cubo_anulados.rows.reduce((s, r) => s + r[6], 0);
  const pct = v.total / (D.viajes.total + (anulado ? totalAnul : 0)) * 100;
  $('#k-' + p).innerHTML =
    kpi(anulado ? 'Viajes anulados' : 'Viajes bajo convenio', NUM(v.total), pct.toFixed(1) + '% de los registros', anulado ? 'event_busy' : 'handshake') +
    kpi('Tarifa valorizada', CLP(v.tarifa), anulado ? 'solo los que traen tarifa' : 'a tarifa normal, no suma a ingresos', 'payments') +
    kpi('Tarifa promedio', CLP(v.tarifa / Math.max(1, v.total)), 'por viaje registrado', 'receipt_long') +
    kpi('Pasajeros', NUM(v.pasajeros), 'transportados o reservados', 'group');
  const m = agrupar(v.por_dia.map((x) => ({ fecha: x.fecha, viajes: x.viajes, monto: x.tarifa })), 'mes');
  draw('c-' + p + '-mes', { type: 'bar', data: { labels: m.map((x) => { const [y, mm] = x.k.split('-'); return MESN[+mm] + ' ' + y; }), datasets: [{ label: 'Viajes', data: m.map((x) => x.viajes), backgroundColor: anulado ? C.t : C.a, borderRadius: 6, yAxisID: 'y' }, { label: 'Tarifa valorizada', type: 'line', data: m.map((x) => x.monto), borderColor: C.p, tension: .3, yAxisID: 'y2' }] }, options: { scales: { x: { grid: { display: false } }, y: { grid: { color: C.grid } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (x) => '$' + NUM(x / 1e3) + 'k' } } } } });
  const top = (col, n) => v._g(col).sort((x, y) => y.viajes - x.viajes).slice(0, n).map((x) => [esc(x.nombre), NUM(x.viajes), CLP(x.tarifa)]);
  $('#t-' + p + '-cond').innerHTML = tabla(['Conductor', 'Viajes', 'Tarifa'], top('conductor', 12));
  $('#t-' + p + '-sec').innerHTML = tabla(['Sector', 'Viajes', 'Tarifa'], top('sector', 12));
  if (!anulado) $('#t-convenios-tipo').innerHTML = tabla(['Tipo', 'Viajes', 'Tarifa'], top('pago', 5));
}
const convenios = () => subvista('convenios', D.cubo, (r, i) => r[i.pago].startsWith('Convenio'), false);
const anulados = () => subvista('anulados', D.cubo_anulados, null, true);
const RENDER = { resumen, ventas, viajes, clientes, sectores, convenios, anulados, costos, marketing, calidad };
function show(id) {
  if (!RENDER[id]) id = 'resumen';
  document.querySelectorAll('.view').forEach((e) => e.classList.toggle('active', e.id === 'v-' + id));
  document.querySelectorAll('[data-v]').forEach((e) => e.classList.toggle('active', e.dataset.v === id));
  $('#titulo').textContent = VIEWS.find((x) => x[0] === id)[1];
  $('#gran').style.display = ['resumen', 'ventas'].includes(id) ? '' : 'none';
  $('#filtros').style.display = id !== 'calidad' ? '' : 'none';
  RENDER[id](); history.replaceState(null, '', '#' + id);
}
async function init() {
  const nav = VIEWS.map(([id, t, ic]) => `<a class="navlink" data-v="${id}"><span class="material-symbols-outlined text-xl">${ic}</span><span>${t}</span></a>`).join('');
  $('#nav').innerHTML = nav; $('#mnav').innerHTML = nav;
  document.querySelectorAll('[data-v]').forEach((e) => e.addEventListener('click', () => show(e.dataset.v)));
  $('#gran').addEventListener('click', (e) => { if (!e.target.dataset.g) return; gran = e.target.dataset.g; document.querySelectorAll('#gran button').forEach((b) => b.classList.toggle('on', b === e.target)); show(location.hash.slice(1) || 'resumen'); });
  D = await (await fetch('data.json?v=' + Date.now())).json();
  for (const k of ['conductor', 'pago', 'sentido', 'sector']) {
    const el = $('#f-' + k); el.innerHTML = '<option value="">' + el.dataset.label + ': todos</option>' + opciones(k).map((o) => `<option>${esc(o)}</option>`).join('');
    el.addEventListener('change', () => { F[k] = el.value; $('#f-limpiar').style.display = Object.values(F).some(Boolean) ? '' : 'none'; show(location.hash.slice(1) || 'resumen'); });
  }
  const rango = { viajes: [D.meta.periodo_viajes[0], D.meta.periodo_viajes[1]], fin: [D.finanzas.dias[0]?.fecha || '', D.finanzas.dias[D.finanzas.dias.length - 1]?.fecha || ''], todo: ['', ''] };
  $('#rango-nota').textContent = `Viajes: ${rango.viajes[0]} a ${rango.viajes[1]} (2025) · Finanzas: ${rango.fin[0]} a ${rango.fin[1]} (2026). Las fechas aplican a todos los menús; conductor, pago, sentido y sector aplican solo a viajes. Calidad de datos es del archivo completo.`;
  const refrescar = () => { $('#f-limpiar').style.display = Object.values(F).some(Boolean) ? '' : 'none'; show(location.hash.slice(1) || 'resumen'); };
  for (const k of ['desde', 'hasta']) $('#f-' + k).addEventListener('change', (e) => { F[k] = e.target.value; refrescar(); });
  document.querySelectorAll('[data-rango]').forEach((bt) => bt.addEventListener('click', () => { [F.desde, F.hasta] = rango[bt.dataset.rango]; $('#f-desde').value = F.desde; $('#f-hasta').value = F.hasta; refrescar(); }));
  $('#f-toggle').addEventListener('click', () => { const o = $('#filtros').classList.toggle('abierto'); $('#f-chev').textContent = o ? 'expand_less' : 'expand_more'; });
  $('#f-limpiar').addEventListener('click', () => { Object.keys(F).forEach((k) => { F[k] = ''; $('#f-' + k).value = ''; }); $('#f-limpiar').style.display = 'none'; show(location.hash.slice(1) || 'resumen'); });
  $('#gen').textContent = D.meta.generado.replace('T', ' ').slice(0, 16);
  show(location.hash.slice(1) || 'resumen');
}
init().catch((e) => { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:1rem;color:#fb7185">No se pudieron cargar los datos: ' + e.message + '</p>'); });
