/* Data Transporte - dashboard. Lee data.json (solo agregados, sin datos personales). */
const $ = (s) => document.querySelector(s);
const CLP = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CL');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NUM = (n) => Math.round(n).toLocaleString('es-CL');
const C = { p: '#4cd7f6', s: '#4edea3', t: '#ffb2b7', a: '#F59E0B', g: '#869397', grid: 'rgba(255,255,255,.07)' };
const VIEWS = [
  ['resumen', 'Resumen', 'dashboard'], ['ventas', 'Ventas', 'payments'], ['viajes', 'Viajes', 'route'],
  ['clientes', 'Clientes', 'group'], ['sectores', 'Sectores', 'map'], ['convenios', 'Convenios', 'handshake'], ['anulados', 'Anulados', 'event_busy'], ['reservas', 'Reservas', 'event_upcoming'], ['costos', 'Costos', 'account_balance_wallet'],
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
  if (cfg.click) {
    cfg.options.onClick = (e, els) => { if (els.length) cfg.click(els[0].index, els[0].datasetIndex); };
    cfg.options.onHover = (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; };
  }
  if (cfg.tip) cfg.options.plugins = Object.assign({}, cfg.options.plugins, { tooltip: { callbacks: { afterBody: (items) => cfg.tip(items[0].dataIndex) } } });
  charts[id] = new Chart($('#' + id), cfg);
}
const scales = (fmt) => ({ x: { grid: { display: false } }, y: { grid: { color: C.grid }, ticks: { callback: fmt || ((v) => NUM(v)) } } });

function semanaISO(fecha) {
  const d = new Date(fecha + 'T00:00:00'); const dia = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dia);
  return d.toISOString().slice(0, 10);
}
function agruparFin(dias, g) {
  const m = new Map();
  for (const d of dias) { const k = g === 'dia' ? d.fecha : g === 'semana' ? semanaISO(d.fecha) : d.fecha.slice(0, 7); const o = m.get(k) || { k, venta: 0, gasto: 0 }; o.venta += d.venta; o.gasto += d.gasto; m.set(k, o); }
  return [...m.values()].sort((x, y) => x.k.localeCompare(y.k));
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
const tabla = (cols, rows, attrs) => `<table class="t"><thead><tr>${cols.map((c, i) => `<th class="${i ? 'n' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r, ri) => `<tr${(attrs && attrs[ri]) || ''}>${r.map((c, i) => `<td class="${i ? 'n mono' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

function resumen() {
  const v = W(), f = FIN().meses.filter((m) => m.venta > 0), vta = f.reduce((a, m) => a + m.venta, 0), gas = f.reduce((a, m) => a + m.gasto, 0);
  $('#kpis').innerHTML =
    kpi('Ingresos por viajes', CLP(v.ingresos), `Venta bruta con convenios: ${CLP(v.tarifa)}`, 'payments') +
    kpi('Viajes realizados', NUM(v.total), `${NUM(v.pasajeros)} pasajeros`, 'route') +
    kpi('Ticket promedio', CLP(v.ticket_promedio), `${NUM(v.convenios)} convenio · ${NUM(D.cubo_anulados.rows.reduce((s, r) => s + r[6], 0))} anulados · ${NUM(D.cubo_futuras.rows.reduce((s, r) => s + r[6], 0))} reservas futuras (aparte)`, 'receipt_long') +
    (f.length ? kpi(`Margen ${f[0].nombre}-${f[f.length - 1].nombre} 2026`, CLP(vta - gas), `Ventas ${CLP(vta)} · Gastos ${CLP(gas)} (meses con ventas)`, 'account_balance') : kpi('Margen 2026', '—', 'sin datos de 2026 en el rango de fechas', 'account_balance'));
  const m = agrupar(v.por_dia, gran);
  $('#sub-ing').textContent = 'Agrupado por ' + { dia: 'día', semana: 'semana', mes: 'mes' }[gran];
  draw('c-ing', { click: (k) => detalleBucket(m[k].k, gran), tip: (k) => ['Viajes: ' + NUM(m[k].viajes), 'Ticket: ' + CLP(m[k].monto / Math.max(1, m[k].viajes))], type: gran === 'dia' ? 'line' : 'bar', data: { labels: m.map((x) => x.k), datasets: [{ label: 'Ingresos', data: m.map((x) => x.monto), backgroundColor: C.p, borderColor: C.p, borderRadius: 6, pointRadius: 0, tension: .3 }] }, options: { plugins: { legend: { display: false } }, scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
  const pagos = v.pagos.filter((p) => p.viajes);
  draw('c-pago', { click: (k) => detalle('Pago: ' + pagos[k].nombre, (r, i) => r[i.pago] === pagos[k].nombre), tip: (k) => [pctS(pagos[k].viajes, v.total) + ' de los viajes', 'Ingresos: ' + CLP(pagos[k].monto)], type: 'doughnut', data: { labels: pagos.map((p) => p.nombre), datasets: [{ data: pagos.map((p) => p.viajes), backgroundColor: [C.p, C.s, C.a, C.g, C.t, '#a78bfa'], borderWidth: 0 }] }, options: { cutout: '65%', plugins: { legend: { position: 'bottom' } } } });
  draw('c-dow', { click: (k) => detalle('Día: ' + v.por_dow[k].nombre, (r, i) => dowDe(r[i.fecha]) === k), tip: (k) => ['Ingresos: ' + CLP(v.por_dow[k].monto), 'Ticket: ' + CLP(v.por_dow[k].monto / Math.max(1, v.por_dow[k].viajes)), pctS(v.por_dow[k].viajes, v.total) + ' de los viajes'], type: 'bar', data: { labels: v.por_dow.map((d) => d.nombre), datasets: [{ data: v.por_dow.map((d) => d.viajes), backgroundColor: C.s, borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: scales() } });
  const sec = v.sectores.filter((s) => s.nombre !== 'Sin identificar').slice(0, 6), mx = sec[0]?.viajes || 1;
  const horasR = Array(24).fill(0); v.heatmap.valores.forEach((row) => row.forEach((n, h) => (horasR[h] += n)));
  draw('c-hora', { click: (h) => detalle('Hora ' + h + ':00', (r, i) => r[i.hora] === h), tip: (h) => [pctS(horasR[h], v.total) + ' de los viajes'], type: 'bar', data: { labels: horasR.map((_, h) => h + 'h'), datasets: [{ data: horasR, backgroundColor: C.p, borderRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: scales() } });
  const cds = v.conductores.slice(0, 8);
  draw('c-cond', { click: (k) => detalle('Conductor: ' + cds[k].nombre, (r, i) => r[i.conductor] === cds[k].nombre), tip: (k) => ['Viajes: ' + NUM(cds[k].viajes), 'Ticket: ' + CLP(cds[k].monto / Math.max(1, cds[k].viajes))], type: 'bar', data: { labels: cds.map((c) => c.nombre), datasets: [{ data: cds.map((c) => c.monto), backgroundColor: C.s, borderRadius: 4 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e6) + 'M' } }, y: { grid: { display: false } } } } });
  $('#top-sec').innerHTML = sec.map((s) => `<div data-sec="${esc(s.nombre)}"><div class="flex justify-between text-sm"><span>${esc(s.nombre)}</span><span class="mono text-primary">${NUM(s.viajes)}</span></div><div class="bar mt-1"><i style="width:${s.viajes / mx * 100}%"></i></div></div>`).join('');
}
function ventas() {
  const m = agrupar(W().por_dia, gran);
  draw('c-flujo', { click: (k) => detalleBucket(m[k].k, gran), tip: (k) => ['Ticket: ' + CLP(m[k].monto / Math.max(1, m[k].viajes))], type: gran === 'dia' ? 'line' : 'bar', data: { labels: m.map((x) => x.k), datasets: [{ label: 'Ingresos', data: m.map((x) => x.monto), backgroundColor: C.p, borderColor: C.p, borderRadius: 6, pointRadius: 0, tension: .3, yAxisID: 'y' }, { label: 'Viajes', type: 'line', data: m.map((x) => x.viajes), borderColor: C.a, pointRadius: 0, tension: .3, yAxisID: 'y2' }] }, options: { scales: { x: { grid: { display: false } }, y: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e6) + 'M' } }, y2: { position: 'right', grid: { display: false } } } } });
  const pm = new Map(agrupar(W().por_dia, 'mes').map((x) => [+x.k.slice(5, 7), x])), fm = FIN().meses, meses = [...new Set([...pm.keys(), ...fm.map((x) => x.mes)])].sort((x, y) => x - y);
  draw('c-cruce', { tip: (k) => { const x = pm.get(meses[k]), y = fm.find((q) => q.mes === meses[k]); return x && y && y.venta ? ['Diferencia: ' + CLP(x.monto - y.venta)] : []; }, type: 'bar', data: { labels: meses.map((m) => MESN[m]), datasets: [{ label: 'Ingresos de viajes', data: meses.map((m) => pm.get(m)?.monto || 0), backgroundColor: C.p, borderRadius: 4 }, { label: 'Ventas planilla anual', data: meses.map((m) => fm.find((q) => q.mes === m)?.venta || 0), backgroundColor: C.a, borderRadius: 4 }] }, options: { scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
  const ff = agruparFin(FIN().dias, gran);
  draw('c-finflujo', { click: (k) => detalleFinBucket(ff[k].k, gran), tip: (k) => ['Margen: ' + CLP(ff[k].venta - ff[k].gasto), 'Gastos / ventas: ' + pctS(ff[k].gasto, ff[k].venta)], type: gran === 'dia' ? 'line' : 'bar', data: { labels: ff.map((x) => x.k), datasets: [{ label: 'Ventas', data: ff.map((x) => x.venta), backgroundColor: C.s, borderColor: C.s, borderRadius: 4, pointRadius: 0, tension: .3 }, { label: 'Gastos', data: ff.map((x) => x.gasto), backgroundColor: C.t, borderColor: C.t, borderRadius: 4, pointRadius: 0, tension: .3 }] }, options: { scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
  const f = FIN().meses;
  draw('c-fin', { click: (k) => detalleFin(f[k]), tip: (k) => ['Margen: ' + CLP(f[k].venta - f[k].gasto), 'Gastos / ventas: ' + pctS(f[k].gasto, f[k].venta)], type: 'bar', data: { labels: f.map((x) => x.nombre), datasets: [{ label: 'Ventas', data: f.map((x) => x.venta), backgroundColor: C.s, borderRadius: 6 }, { label: 'Gastos', data: f.map((x) => x.gasto), backgroundColor: C.t, borderRadius: 6 }] }, options: { scales: scales((x) => '$' + NUM(x / 1e6) + 'M') } });
}
function viajes() {
  const V = W(), h = V.heatmap, mx = Math.max(1, ...h.valores.flat());
  let html = '<div class="lab"></div>' + h.horas.map((x) => `<div class="lab" style="justify-content:center">${x}</div>`).join('');
  h.valores.forEach((row, i) => { html += `<div class="lab">${h.dias[i]}</div>` + row.map((n, hh) => `<div data-d="${i}" data-h="${hh}" title="${n} viajes" style="background:rgba(76,215,246,${n ? .12 + .88 * n / mx : .04})">${n || ''}</div>`).join(''); });
  $('#heat').innerHTML = html;
  $('#t-cond').innerHTML = tabla(['Conductor', 'Viajes', 'Ingresos'], V.conductores.map((c) => [esc(c.nombre), NUM(c.viajes), CLP(c.monto)]), V.conductores.map((c) => ` data-cond="${esc(c.nombre)}"`));
  const s = V.sentido.filter((x) => x.viajes);
  draw('c-sent', { click: (k) => detalle('Sentido: ' + s[k].nombre, (r, i) => r[i.sentido] === s[k].nombre), tip: (k) => [pctS(s[k].viajes, V.total) + ' de los viajes', 'Ingresos: ' + CLP(s[k].monto)], type: 'doughnut', data: { labels: s.map((x) => x.nombre), datasets: [{ data: s.map((x) => x.viajes), backgroundColor: [C.p, C.s, C.g], borderWidth: 0 }] }, options: { cutout: '65%', plugins: { legend: { position: 'bottom' } } } });
}
function clientes() {
  const c = CL();
  $('#kpi-cli').innerHTML = kpi('Clientes únicos', NUM(c.unicos), 'identificados por teléfono', 'group') + kpi('Clientes recurrentes', NUM(c.recurrentes), '2 o más viajes', 'repeat') +
    kpi('Viajes de recurrentes', Math.round(c.viajes_de_recurrentes / Math.max(1, c.total) * 100) + '%', `${NUM(c.viajes_de_recurrentes)} de ${NUM(c.total)} viajes`, 'percent');
  $('#t-cli').innerHTML = tabla(['Cliente', 'Viajes', 'Gasto total'], c.top_anonimo.map((x) => [esc(x.id), x.viajes, CLP(x.monto)]));
}
function sectores() { $('#t-sec').innerHTML = tabla(['Sector', 'Viajes', 'Ingresos', 'Ticket prom.'], W().sectores.map((s) => [esc(s.nombre), NUM(s.viajes), CLP(s.monto), CLP(s.monto / s.viajes)]), W().sectores.map((s) => ` data-sec="${esc(s.nombre)}"`)); }
function costos() {
  const tot = {}; FIN().meses.forEach((m) => Object.entries(m.gastos).forEach(([k, v]) => (tot[k] = (tot[k] || 0) + v)));
  const e = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  draw('c-gastos', { click: (k) => detalleGasto(e[k][0]), tip: (k) => [pctS(e[k][1], e.reduce((s, x) => s + x[1], 0)) + ' del gasto total'], type: 'bar', data: { labels: e.map((x) => x[0]), datasets: [{ data: e.map((x) => x[1]), backgroundColor: C.t, borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e6) + 'M' } }, y: { grid: { display: false } } } } });
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
  mkTools(v, { dow, dowTop, sec, valle });
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


/* ===== Ventana de detalle (al tocar un grafico, barra, fila o celda) ===== */
const dowDe = (f) => (new Date(f + 'T00:00:00').getDay() + 6) % 7;
const MESL = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const pctS = (x, t) => (t ? (x / t * 100).toFixed(1) + '%' : '—');
function abrirModal(titulo, sub, html) {
  $('#modal-t').textContent = titulo; $('#modal-s').textContent = sub || ''; $('#modal-b').innerHTML = html;
  $('#modal').classList.add('open'); $('#modal .sheet').scrollTop = 0; document.body.style.overflow = 'hidden';
}
function cerrarModal() {
  $('#modal').classList.remove('open'); document.body.style.overflow = '';
  for (const id of Object.keys(charts)) if (id.startsWith('m-')) { charts[id].destroy(); delete charts[id]; }
  $('#modal-b').innerHTML = '';
}
function rangoBucket(k, g) {
  if (g === 'mes') return { a: k + '-01', b: k + '-31', t: MESL[+k.slice(5, 7)] + ' ' + k.slice(0, 4) };
  if (g === 'semana') { const d = new Date(k + 'T00:00:00'); d.setDate(d.getDate() + 6); return { a: k, b: d.toISOString().slice(0, 10), t: 'Semana del ' + k }; }
  return { a: k, b: k, t: k };
}
function detalleBucket(k, g, cube = D.cubo, extra = null) {
  const r = rangoBucket(k, g);
  detalle(r.t, (row, i) => row[i.fecha] >= r.a && row[i.fecha] <= r.b && (!extra || extra(row, i)), cube);
}
function detalle(titulo, pred, cube = D.cubo) {
  const v = W(cube, pred), base = W(cube), anul = cube === D.cubo_anulados;
  if (!v.total) { abrirModal(titulo, 'Sin viajes con los filtros actuales', '<p class="text-sm text-on-surface-variant">No hay datos para esta selección.</p>'); return; }
  const horas = Array(24).fill(0); v.heatmap.valores.forEach((row) => row.forEach((n, h) => (horas[h] += n)));
  const hp = horas.indexOf(Math.max(...horas)), dm = [...v.por_dow].sort((x, y) => y.viajes - x.viajes)[0];
  const meses = agrupar(v.por_dia.map((x) => ({ fecha: x.fecha, viajes: x.viajes, monto: anul ? x.tarifa : x.monto })), 'mes');
  const top = (col, n) => v._g(col).sort((x, y) => y.viajes - x.viajes).slice(0, n);
  const mejores = [...v.por_dia].sort((x, y) => (anul ? y.tarifa - x.tarifa : y.monto - x.monto) || y.viajes - x.viajes).slice(0, 5);
  const tg = base.ticket_promedio, dif = tg ? ((v.ticket_promedio / tg - 1) * 100) : 0;
  const k = (t, val, sub) => `<div class="card p-4"><div class="text-[11px] text-on-surface-variant uppercase font-semibold">${t}</div><div class="mono text-xl font-semibold mt-1">${val}</div><div class="text-xs text-on-surface-variant mt-1">${sub}</div></div>`;
  const tb = (cols, rows) => tabla(cols, rows);
  abrirModal(titulo, `${NUM(v.total)} viajes · ${v.por_dia[0].fecha} a ${v.por_dia[v.por_dia.length - 1].fecha}`,
    `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">` +
      k('Viajes', NUM(v.total), pctS(v.total, base.total) + ' del total') +
      k(anul ? 'Tarifa registrada' : 'Ingresos', CLP(anul ? v.tarifa : v.ingresos), anul ? '' : pctS(v.ingresos, base.ingresos) + ' del total') +
      k('Ticket promedio', CLP(v.ticket_promedio), (dif >= 0 ? '+' : '') + dif.toFixed(1) + '% vs promedio general') +
      k('Pasajeros', NUM(v.pasajeros), (v.pasajeros / v.total).toFixed(1) + ' por viaje') + `</div>` +
    `<div class="card p-4 text-sm"><b class="text-primary">Lectura rápida:</b> la hora más fuerte es las ${hp}:00 (${NUM(horas[hp])} viajes) y el día más fuerte es ${dm.nombre} (${NUM(dm.viajes)} viajes). ${v.convenios ? NUM(v.convenios) + ' viajes fueron bajo convenio.' : ''}</div>` +
    `<div class="grid lg:grid-cols-2 gap-3"><div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Viajes por hora</h4><div style="height:190px"><canvas id="m-hora"></canvas></div></div>` +
    `<div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Por mes</h4><div style="height:190px"><canvas id="m-mes"></canvas></div></div></div>` +
    `<div class="grid lg:grid-cols-2 gap-3"><div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Sectores principales</h4>${tb(['Sector', 'Viajes', 'Ingresos'], top('sector', 8).map((x) => [esc(x.nombre), NUM(x.viajes), CLP(anul ? x.tarifa : x.monto)]))}</div>` +
    `<div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Conductores</h4>${tb(['Conductor', 'Viajes', 'Ingresos'], top('conductor', 8).map((x) => [esc(x.nombre), NUM(x.viajes), CLP(anul ? x.tarifa : x.monto)]))}</div></div>` +
    `<div class="grid lg:grid-cols-2 gap-3"><div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Medios de pago</h4>${tb(['Medio', 'Viajes', '% '], top('pago', 8).map((x) => [esc(x.nombre), NUM(x.viajes), pctS(x.viajes, v.total)]))}</div>` +
    `<div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Mejores días</h4>${tb(['Fecha', 'Viajes', anul ? 'Tarifa' : 'Ingresos'], mejores.map((x) => [x.fecha, NUM(x.viajes), CLP(anul ? x.tarifa : x.monto)]))}</div></div>`);
  draw('m-hora', { type: 'bar', data: { labels: horas.map((_, h) => h + 'h'), datasets: [{ data: horas, backgroundColor: C.p, borderRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: scales() } });
  draw('m-mes', { type: 'bar', data: { labels: meses.map((x) => { const [y, mm] = x.k.split('-'); return MESN[+mm] + ' ' + y.slice(2); }), datasets: [{ data: meses.map((x) => x.monto), backgroundColor: C.s, borderRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: scales((x) => '$' + NUM(x / 1e6) + 'M') }, tip: (j) => ['Viajes: ' + NUM(meses[j].viajes)] });
}
function detalleFinBucket(k, g) {
  const r = rangoBucket(k, g), dias = FIN().dias.filter((d) => d.fecha >= r.a && d.fecha <= r.b), m = { venta: 0, gasto: 0, margen: 0, gastos: {}, mes: 0 };
  for (const d of dias) { m.venta += d.venta; m.gasto += d.gasto; for (const [c, x] of Object.entries(d.gastos || {})) m.gastos[c] = (m.gastos[c] || 0) + x; }
  m.margen = m.venta - m.gasto; detalleFin(m, dias, r.t);
}
function detalleFin(m, diasSel, titulo) {
  const dias = diasSel || FIN().dias.filter((d) => +d.fecha.slice(5, 7) === m.mes), cats = Object.entries(m.gastos).sort((x, y) => y[1] - x[1]);
  const k = (t, val, sub) => `<div class="card p-4"><div class="text-[11px] text-on-surface-variant uppercase font-semibold">${t}</div><div class="mono text-xl font-semibold mt-1">${val}</div><div class="text-xs text-on-surface-variant mt-1">${sub}</div></div>`;
  const mejores = [...dias].sort((x, y) => y.venta - x.venta).slice(0, 5);
  abrirModal(titulo || MESL[m.mes] + ' 2026', 'Ventas y gastos de la planilla anual',
    `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">` + k('Ventas', CLP(m.venta), dias.filter((d) => d.venta > 0).length + ' días con ventas') + k('Gastos', CLP(m.gasto), pctS(m.gasto, m.venta) + ' de las ventas') +
      k('Margen', `<span style="color:${m.margen < 0 ? '#fb7185' : '#34d399'}">${CLP(m.margen)}</span>`, pctS(m.margen, m.venta) + ' de las ventas') + k('Venta diaria promedio', CLP(m.venta / Math.max(1, dias.filter((d) => d.venta > 0).length)), 'solo días con ventas') + `</div>` +
    `<div class="grid lg:grid-cols-2 gap-3"><div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Ventas vs gastos por día</h4><div style="height:210px"><canvas id="m-dia"></canvas></div></div>` +
    `<div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Gastos por categoría</h4><div style="height:210px"><canvas id="m-cat"></canvas></div></div></div>` +
    `<div class="grid lg:grid-cols-2 gap-3"><div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Categorías</h4>${tabla(['Categoría', 'Monto', '% gasto'], cats.map(([c, x]) => [esc(c), CLP(x), pctS(x, m.gasto)]))}</div>` +
    `<div class="card p-4"><h4 class="font-semibold mb-2 text-sm">Mejores días de venta</h4>${tabla(['Fecha', 'Ventas', 'Gastos'], mejores.map((d) => [d.fecha, CLP(d.venta), CLP(d.gasto)]))}</div></div>`);
  draw('m-dia', { type: 'bar', data: { labels: dias.map((d) => +d.fecha.slice(8)), datasets: [{ label: 'Ventas', data: dias.map((d) => d.venta), backgroundColor: C.s }, { label: 'Gastos', data: dias.map((d) => d.gasto), backgroundColor: C.t }] }, options: { scales: scales((x) => '$' + NUM(x / 1e3) + 'k') } });
  draw('m-cat', { type: 'bar', data: { labels: cats.map((c) => c[0]), datasets: [{ data: cats.map((c) => c[1]), backgroundColor: C.t, borderRadius: 4 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e3) + 'k' } }, y: { grid: { display: false } } } } });
}
function detalleGasto(cat) {
  const meses = FIN().meses.map((m) => ({ nombre: MESL[m.mes], x: m.gastos[cat] || 0, venta: m.venta })), tot = meses.reduce((s, m) => s + m.x, 0), allG = FIN().meses.reduce((s, m) => s + m.gasto, 0);
  abrirModal(cat, 'Gasto por mes en 2026', `<div class="grid grid-cols-2 lg:grid-cols-3 gap-3"><div class="card p-4"><div class="text-[11px] text-on-surface-variant uppercase font-semibold">Total</div><div class="mono text-xl font-semibold mt-1">${CLP(tot)}</div></div><div class="card p-4"><div class="text-[11px] text-on-surface-variant uppercase font-semibold">% del gasto total</div><div class="mono text-xl font-semibold mt-1">${pctS(tot, allG)}</div></div><div class="card p-4"><div class="text-[11px] text-on-surface-variant uppercase font-semibold">Mes mayor</div><div class="mono text-xl font-semibold mt-1">${esc([...meses].sort((x, y) => y.x - x.x)[0].nombre)}</div></div></div><div class="card p-4"><div style="height:240px"><canvas id="m-gas"></canvas></div></div>` + tabla(['Mes', 'Gasto', '% de ventas del mes'], meses.map((m) => [m.nombre, CLP(m.x), pctS(m.x, m.venta)])));
  draw('m-gas', { type: 'bar', data: { labels: meses.map((m) => m.nombre), datasets: [{ data: meses.map((m) => m.x), backgroundColor: C.t, borderRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: scales((x) => '$' + NUM(x / 1e3) + 'k') } });
}
/* clics delegados: filas de tablas, sectores y celdas del mapa de calor */
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return cerrarModal();
  const cube = (el) => (el.dataset.sub === 'anulados' ? D.cubo_anulados : el.dataset.sub === 'reservas' ? D.cubo_futuras : D.cubo), extra = (el) => (el.dataset.sub === 'convenios' ? (r, i) => r[i.pago].startsWith('Convenio') : null);
  const c = e.target.closest('[data-d][data-h]');
  if (c) { const d = +c.dataset.d, h = +c.dataset.h; return detalle(`${DOWN[d]} a las ${h}:00`, (r, i) => dowDe(r[i.fecha]) === d && r[i.hora] === h); }
  const s = e.target.closest('[data-sec]');
  if (s) { const n = s.dataset.sec, ex = extra(s); return detalle('Sector: ' + n, (r, i) => r[i.sector] === n && (!ex || ex(r, i)), cube(s)); }
  const cd = e.target.closest('[data-cond]');
  if (cd) { const n = cd.dataset.cond, ex = extra(cd); return detalle('Conductor: ' + n, (r, i) => r[i.conductor] === n && (!ex || ex(r, i)), cube(cd)); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

/* ===== Herramientas de marketing ===== */
const mk = { tab: 'ops', secData: null };
const NO_SEC = ['Sin identificar', 'Varios domicilios'];
const copiar = (txt, btn) => { navigator.clipboard.writeText(txt); if (btn) { const t = btn.textContent; btn.textContent = '¡Copiado!'; setTimeout(() => (btn.textContent = t), 1400); } };
const cortar = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '').trim());
const fld = (lab, inner) => `<label class="block"><span class="mklab">${lab}</span>${inner}</label>`;

function mkTools(v, ctx) {
  const tabs = $('#mk-tabs');
  if (!tabs.dataset.ok) { tabs.dataset.ok = 1; tabs.addEventListener('click', (e) => { const bt = e.target.closest('[data-mk]'); if (!bt) return; mk.tab = bt.dataset.mk; mkShow(); }); }
  mkFranjas(v); mkPromo(v, ctx); mkSim(v); mkCal(v, ctx); mkCli(); mkSec(v); mkShow();
}
function mkShow() {
  document.querySelectorAll('#mk-tabs [data-mk]').forEach((bt) => bt.classList.toggle('on', bt.dataset.mk === mk.tab));
  document.querySelectorAll('.mk').forEach((pn) => (pn.style.display = pn.id === 'mk-' + mk.tab ? '' : 'none'));
  if (mk.tab === 'sec') mkSecChart();
}

/* --- Franjas con mas y menos demanda (clic = detalle) --- */
function mkFranjas(v) {
  const h = v.heatmap, cel = [];
  h.valores.forEach((row, d) => row.forEach((n, hh) => cel.push({ d, h: hh, n })));
  const act = cel.filter((c) => c.n > 0), alta = [...act].sort((x, y) => y.n - x.n).slice(0, 6), baja = [...act].filter((c) => c.n >= 2).sort((x, y) => x.n - y.n).slice(0, 6);
  const li = (c) => `<li data-d="${c.d}" data-h="${c.h}" class="flex justify-between py-1.5 border-t border-white/5"><span>${DOWN[c.d]} ${c.h}:00</span><span class="mono text-primary">${NUM(c.n)} viajes</span></li>`;
  $('#mk-franjas').innerHTML = `<div class="grid md:grid-cols-2 gap-4"><div class="card p-5"><h3 class="font-semibold mb-1">Franjas con más demanda</h3><p class="hint mb-2">Para reforzar flota y avisos. Toca una franja para ver el detalle.</p><ul class="text-sm">${alta.map(li).join('')}</ul></div>` +
    `<div class="card p-5"><h3 class="font-semibold mb-1">Franjas valle (menos demanda)</h3><p class="hint mb-2">Oportunidad para promociones. Toca una franja para ver el detalle.</p><ul class="text-sm">${baja.map(li).join('')}</ul></div></div>`;
}

/* --- Generador de promociones --- */
const OBJ = { fidelizar: 'Fidelizar clientes frecuentes', valle: 'Llenar horas valle', flojo: 'Reforzar el día más flojo', sector: 'Atraer un sector', retorno: 'Ida y vuelta (retorno)', convenio: 'Convenios empresas y hoteles', reactivar: 'Reactivar clientes inactivos' };
const CANAL = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', google: 'Google Ads', sms: 'SMS' };
const PREF = { fidelizar: 'GRACIAS', valle: 'MADRUGA', flojo: 'DIA', sector: 'ZONA', retorno: 'IDAYVUELTA', convenio: 'EMPRESA', reactivar: 'VUELVE' };
function mkPromo(v, ctx) {
  const secs = v.sectores.filter((s) => !NO_SEC.includes(s.nombre)).slice(0, 12).map((s) => s.nombre);
  const el = $('#mk-promo'), sel = (id, o) => `<select id="${id}" class="mkin">${Object.entries(o).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>`;
  el.innerHTML = `<div class="grid lg:grid-cols-5 gap-4"><div class="card p-5 lg:col-span-2 flex flex-col gap-3">` +
    `<h3 class="font-semibold">Generador de promociones</h3><p class="hint">Crea el texto listo para publicar o enviar, con datos reales de tu negocio.</p>` +
    fld('Objetivo', sel('pr-obj', OBJ)) + fld('Canal', sel('pr-canal', CANAL)) +
    fld('Sector (si el objetivo es atraer un sector)', `<select id="pr-sec" class="mkin">${secs.map((s) => `<option>${esc(s)}</option>`).join('')}</select>`) +
    fld('Descuento: <b id="pr-dv">10</b>%', '<input id="pr-d" type="range" min="5" max="30" step="5" value="10" class="w-full">') +
    fld('Vigencia (días)', '<input id="pr-dias" type="number" min="1" max="60" value="7" class="mkin">') +
    fld('Código promocional', '<input id="pr-code" class="mkin" maxlength="20">') +
    `</div><div class="card p-5 lg:col-span-3 flex flex-col gap-3"><h3 class="font-semibold">Vista previa</h3><div id="pr-txt" class="outbox"></div><div id="pr-meta" class="hint"></div><div class="flex flex-wrap gap-2"><button id="pr-copy" class="btnp">Copiar texto</button><a id="pr-wa" target="_blank" rel="noopener" class="btns">Abrir en WhatsApp</a></div></div></div>`;
  const gen = () => {
    const obj = $('#pr-obj').value, canal = $('#pr-canal').value, d = +$('#pr-d').value, dias = +$('#pr-dias').value || 7;
    $('#pr-dv').textContent = d;
    if (!$('#pr-code').dataset.manual) $('#pr-code').value = (obj === 'flojo' ? PREF.flojo + ctx.dow.nombre.toUpperCase() : PREF[obj]) + d;
    const code = ($('#pr-code').value || 'PROMO').toUpperCase(), sec = $('#pr-sec').value || 'tu zona', hv = ctx.valle || 'madrugada';
    const core = { fidelizar: 'Gracias por viajar con nosotros. Por ser cliente frecuente tienes un beneficio en tu próximo traslado al aeropuerto.', valle: `Viaja entre las ${hv} y obtén tarifa preferente hacia o desde el aeropuerto.`, flojo: `Los ${ctx.dow.nombre} tu traslado al aeropuerto con descuento.`, sector: `Traslados al aeropuerto desde ${sec}: puntualidad y tarifa clara.`, retorno: 'Reserva tu ida y vuelta al aeropuerto y ahorra en el regreso.', convenio: 'Convenio para empresas y hoteles: tarifa preferente, facturación mensual y conductores puntuales.', reactivar: 'Te echamos de menos. Vuelve a viajar con nosotros con un beneficio especial.' }[obj];
    const corto = { fidelizar: 'Beneficio para clientes frecuentes', valle: `Tarifa preferente ${hv.split(',')[0]}`, flojo: `Oferta de los ${ctx.dow.nombre}`, sector: `Desde ${sec} al aeropuerto`, retorno: 'Ida y vuelta con descuento', convenio: 'Tarifa para empresas y hoteles', reactivar: 'Vuelve con descuento' }[obj];
    let txt = '', meta = '';
    if (canal === 'whatsapp') txt = `Hola 👋\n${core}\n\n🎟️ Código ${code}: ${d}% de descuento, válido por ${dias} días.\nReserva respondiendo este mensaje.`;
    else if (canal === 'instagram') txt = `✈️ ${core}\n\n🎟️ Código ${code}: ${d}% OFF por ${dias} días.\n📲 Reserva por WhatsApp (link en la bio).\n\n#transferaeropuerto #santiago #traslados #aeropuertosantiago #viajes`;
    else if (canal === 'facebook') txt = `${core}\n\nUsa el código ${code} y obtén ${d}% de descuento durante ${dias} días. Reserva por mensaje directo.`;
    else if (canal === 'google') {
      const t1 = cortar(`Transfer Aeropuerto ${d}% OFF`, 30), t2 = cortar(corto, 30), ds = cortar(`${core.split('. ')[0].replace(/\.$/, '')}. Código ${code}.`, 90);
      txt = `Título 1: ${t1}  (${t1.length}/30)\nTítulo 2: ${t2}  (${t2.length}/30)\nDescripción: ${ds}  (${ds.length}/90)`; meta = 'Límites de Google Ads: títulos 30 y descripción 90 caracteres.';
    } else { txt = cortar(`${corto}. Cód ${code} ${d}% hasta ${dias} días. Reserva por WhatsApp.`, 160); meta = `${txt.length}/160 caracteres`; }
    $('#pr-txt').textContent = txt; $('#pr-meta').textContent = meta;
    $('#pr-wa').href = 'https://wa.me/?text=' + encodeURIComponent(txt); $('#pr-wa').style.display = canal === 'google' ? 'none' : '';
  };
  el.addEventListener('input', (e) => { if (e.target.id === 'pr-code') e.target.dataset.manual = 1; gen(); });
  $('#pr-copy').addEventListener('click', (e) => copiar($('#pr-txt').textContent, e.target));
  gen();
}

/* --- Simulador de descuentos --- */
function mkSim(v) {
  const f = FIN().meses.filter((m) => m.venta > 0), vta = f.reduce((s, m) => s + m.venta, 0);
  const varC = f.reduce((s, m) => s + Object.entries(m.gastos).filter(([c]) => /COMBUSTIBLE|EXTERNOS|TAG|MANTENC/.test(c)).reduce((q, [, x]) => q + x, 0), 0);
  const cv = vta ? Math.min(90, Math.round(varC / vta * 100)) : 45, meses = Math.max(1, new Set(v.por_dia.map((x) => x.fecha.slice(0, 7))).size), base = Math.round(v.total / meses);
  const el = $('#mk-sim');
  el.innerHTML = `<div class="grid lg:grid-cols-5 gap-4"><div class="card p-5 lg:col-span-2 flex flex-col gap-3"><h3 class="font-semibold">Simulador de descuentos</h3><p class="hint">¿Conviene dar un descuento a cambio de más viajes? Ajusta los supuestos y mira el efecto en tu margen.</p>` +
    fld('Descuento (%)', '<input id="sm-d" type="number" min="0" max="60" value="10" class="mkin">') +
    fld('Aumento esperado de viajes (%)', '<input id="sm-u" type="number" min="0" max="300" value="15" class="mkin">') +
    fld(`Costo variable (% de la venta)${vta ? ' · estimado desde tu planilla 2026' : ''}`, `<input id="sm-c" type="number" min="0" max="95" value="${cv}" class="mkin">`) +
    fld('Viajes por mes (base)', `<input id="sm-n" type="number" min="1" value="${base || 100}" class="mkin">`) +
    fld('Ticket promedio ($)', `<input id="sm-t" type="number" min="1000" step="500" value="${Math.round(v.ticket_promedio) || 40000}" class="mkin">`) +
    `<p class="hint">Costo variable = combustible, externos, TAG y mantenciones. Es una estimación: edítala si conoces el valor real.</p></div><div class="card p-5 lg:col-span-3"><div id="sm-out"></div></div></div>`;
  const calc = () => {
    const d = +$('#sm-d').value / 100, u = +$('#sm-u').value / 100, c = +$('#sm-c').value / 100, n = +$('#sm-n').value, t = +$('#sm-t').value;
    const ing0 = n * t, mar0 = ing0 * (1 - c), n1 = n * (1 + u), ing1 = n1 * t * (1 - d), mar1 = ing1 - n1 * t * c, difm = mar1 - mar0;
    const den = 1 - d - c, be = den > 0 ? ((1 - c) / den - 1) * 100 : null;
    const col = (x) => (x >= 0 ? '#34d399' : '#fb7185'), box = (t2, a1, a2) => `<div class="card p-4"><div class="text-[11px] text-on-surface-variant uppercase font-semibold">${t2}</div><div class="mono text-lg font-semibold mt-1">${a1}</div><div class="text-xs text-on-surface-variant mt-1">${a2}</div></div>`;
    $('#sm-out').innerHTML = `<h3 class="font-semibold mb-3">Resultado mensual</h3><div class="grid grid-cols-2 gap-3">` +
      box('Viajes', `${NUM(n)} → ${NUM(n1)}`, (u >= 0 ? '+' : '') + NUM(n1 - n) + ' viajes') + box('Ingresos', `${CLP(ing0)} → ${CLP(ing1)}`, `<span style="color:${col(ing1 - ing0)}">${CLP(ing1 - ing0)}</span>`) +
      box('Margen operativo', `${CLP(mar0)} → ${CLP(mar1)}`, `<span style="color:${col(difm)}">${CLP(difm)}</span>`) + box('Aumento mínimo para no perder', be === null ? 'Imposible' : '+' + be.toFixed(1) + '%', be === null ? 'El descuento supera tu margen' : 'de viajes para igualar el margen actual') + `</div>` +
      `<div class="card p-4 mt-3 text-sm" style="border-color:${col(difm)}55">${be === null ? '<b>No conviene:</b> con ese descuento cada viaje deja margen negativo.' : difm >= 0 ? `<b style="color:#34d399">Conviene:</b> si la promoción logra +${(u * 100).toFixed(0)}% de viajes, ganas ${CLP(difm)} más al mes. El mínimo para no perder es +${be.toFixed(1)}%.` : `<b style="color:#fb7185">No conviene con este supuesto:</b> necesitas al menos +${be.toFixed(1)}% de viajes para igualar tu margen actual y esperas +${(u * 100).toFixed(0)}%.`}</div>`;
  };
  el.addEventListener('input', calc); calc();
}

/* --- Calendario de contenido para redes (4 semanas) --- */
function mkCal(v, ctx) {
  const secs = v.sectores.filter((s) => !NO_SEC.includes(s.nombre)).slice(0, 4).map((s) => s.nombre);
  const idx = { Lun: 1, Mar: 2, 'Mié': 3, Jue: 4, Vie: 5, 'Sáb': 6, Dom: 0 }, hoy = new Date(), lun = new Date(hoy); lun.setDate(hoy.getDate() + ((8 - hoy.getDay()) % 7 || 7));
  const iso = (d) => d.toISOString().slice(0, 10), mas = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const temas = [['Promo del día flojo', 'Instagram (Reel)', `Los ${ctx.dow.nombre} traslado al aeropuerto con descuento. Código ${'DIA' + ctx.dow.nombre.toUpperCase()}10.`], ['Zona destacada', 'Instagram (Post)', null], ['Tip de viaje', 'Facebook', 'Llega 3 horas antes en vuelos internacionales y reserva tu traslado con anticipación.'], ['Testimonio de cliente', 'Instagram (Story)', '“Puntuales y con tarifa clara.” Cuéntanos tu experiencia y participa por un descuento.']];
  const filas = [];
  for (let w = 0; w < 4; w++) {
    const semana = mas(lun, w * 7);
    temas.forEach((t, k) => {
      const d = mas(semana, [0, 2, 4, 6][k] + (k === 0 ? (idx[ctx.dow.nombre] ?? 1) - 1 : 0));
      filas.push({ semana: w + 1, fecha: iso(d), red: t[1], tema: t[0] === 'Zona destacada' ? 'Zona destacada: ' + (secs[w % Math.max(1, secs.length)] || 'tu zona') : t[0], texto: t[2] || `Traslados al aeropuerto desde ${secs[w % Math.max(1, secs.length)] || 'tu zona'}: puntualidad y tarifa clara. Reserva hoy.`, hora: k === 0 ? '19:00' : '12:30' });
    });
  }
  $('#mk-cal').innerHTML = `<div class="card p-5"><div class="flex flex-wrap justify-between items-center gap-2 mb-2"><div><h3 class="font-semibold">Calendario de contenido (4 semanas)</h3><p class="hint">Basado en tu día más flojo (${esc(ctx.dow.nombre)}) y tus sectores con más viajes. Las horas son una sugerencia: ajústalas con las estadísticas de tus redes.</p></div><button id="cal-csv" class="btnp">Descargar CSV</button></div>` +
    tabla(['Sem.', 'Fecha', 'Hora', 'Red', 'Tema', 'Texto sugerido'], filas.map((f2) => [f2.semana, f2.fecha, f2.hora, esc(f2.red), esc(f2.tema), `<span style="white-space:normal;display:block;min-width:220px;text-align:left">${esc(f2.texto)}</span>`])) + `</div>`;
  $('#cal-csv').addEventListener('click', () => {
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"', csv = ['semana,fecha,hora,red,tema,texto'].concat(filas.map((f2) => [f2.semana, f2.fecha, f2.hora, q(f2.red), q(f2.tema), q(f2.texto)].join(','))).join('\n');
    const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a2.download = 'calendario-redes.csv'; a2.click(); URL.revokeObjectURL(a2.href);
  });
}

/* --- Segmentos de clientes (anonimos) --- */
function mkCli() {
  const fin = F.hasta || D.meta.periodo_viajes[1], lim = new Date(fin + 'T00:00:00'); lim.setDate(lim.getDate() - 60); const corte = lim.toISOString().slice(0, 10);
  const SEG = [['VIP (6+ viajes)', 'Prioridad de reserva y beneficio exclusivo.', 'Hola, gracias por confiar siempre en nosotros. Como cliente VIP tienes prioridad de reserva y un beneficio especial en tu próximo traslado.'],
    ['Frecuente (3-5)', 'Descuento por su próximo viaje para empujar a VIP.', 'Hola, vimos que viajas seguido con nosotros. Te dejamos un descuento en tu próximo traslado al aeropuerto.'],
    ['Ocasional (2)', 'Recordatorio con tarifa preferente por reservar con anticipación.', 'Hola, esperamos que tu último viaje haya sido excelente. Si reservas tu próximo traslado con anticipación tienes tarifa preferente.'],
    ['Nuevo (1)', 'Pedir recomendación y ofrecer descuento por referido.', 'Hola, gracias por probar nuestro servicio. Si nos recomiendas con un amigo, ambos tienen descuento en el próximo viaje.']];
  const tot = SEG.map(() => ({ act: 0, ina: 0, monto: 0, n: 0 }));
  for (const vs0 of D.clientes_viajes) {
    const vs = vs0.filter((x) => (!F.desde || x[0] >= F.desde) && (!F.hasta || x[0] <= F.hasta)); if (!vs.length) continue;
    const k = vs.length >= 6 ? 0 : vs.length >= 3 ? 1 : vs.length === 2 ? 2 : 3, ult = vs.reduce((m, x) => (x[0] > m ? x[0] : m), ''), t = tot[k];
    t.n++; t.monto += vs.reduce((s, x) => s + x[1], 0); (ult < corte ? (t.ina++) : (t.act++));
  }
  const ina = tot.reduce((s, t) => s + t.ina, 0), act = tot.reduce((s, t) => s + t.act, 0);
  $('#mk-cli').innerHTML = `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">` + [['Clientes en el período', NUM(act + ina), ''], ['Activos', NUM(act), 'viajaron en los últimos 60 días'], ['Inactivos', NUM(ina), 'sin viajes hace más de 60 días'], ['Recuperables', pctS(ina, act + ina), 'del total, para campañas de reactivación']].map(([t, val, s]) => `<div class="card p-4"><div class="text-[11px] text-on-surface-variant uppercase font-semibold">${t}</div><div class="mono text-xl font-semibold mt-1">${val}</div><div class="text-xs text-on-surface-variant mt-1">${s}</div></div>`).join('') + `</div>` +
    `<div class="card p-5"><h3 class="font-semibold mb-1">Segmentos y acción sugerida</h3><p class="hint mb-3">Datos anónimos. La lista con nombres y teléfonos para enviar los mensajes queda solo en tu PC: <b>data\\privado\\segmentos_whatsapp.csv</b> (no se publica).</p>` +
    tabla(['Segmento', 'Clientes', 'Activos', 'Inactivos', 'Gasto prom.', 'Acción', 'Mensaje'], SEG.map((s, k) => [s[0], NUM(tot[k].n), NUM(tot[k].act), NUM(tot[k].ina), CLP(tot[k].monto / Math.max(1, tot[k].n)), `<span style="white-space:normal;display:block;min-width:180px;text-align:left">${esc(s[1])}</span>`, `<button class="btns cpm" data-m="${k}">Copiar</button>`])) + `</div>`;
  document.querySelectorAll('.cpm').forEach((bt) => bt.addEventListener('click', () => copiar(SEG[+bt.dataset.m][2], bt)));
  const re = $('#mk-cli').insertAdjacentHTML('beforeend', `<div class="card p-5 mt-4"><h3 class="font-semibold mb-1">Campaña de reactivación</h3><p class="text-sm text-on-surface-variant mb-3">${NUM(ina)} clientes llevan más de 60 días sin viajar.</p><button id="cp-react" class="btnp">Copiar mensaje de reactivación</button></div>`);
  $('#cp-react').addEventListener('click', (e) => copiar('Hola, hace tiempo no viajas con nosotros y te echamos de menos. Vuelve con un descuento especial por tiempo limitado: responde este mensaje y reservamos tu traslado.', e.target));
}

/* --- Matriz de sectores (volumen vs ticket) --- */
function mkSec(v) {
  const s = v.sectores.filter((x) => !NO_SEC.includes(x.nombre) && x.viajes >= 8).map((x) => ({ nombre: x.nombre, viajes: x.viajes, ticket: x.monto / Math.max(1, x.viajes), monto: x.monto }));
  mk.secData = s; if (!s.length) { $('#mk-sec').innerHTML = '<div class="card p-5 text-sm">No hay sectores con suficientes viajes en este rango.</div>'; return; }
  const med = (arr) => [...arr].sort((x, y) => x - y)[Math.floor(arr.length / 2)], mv = med(s.map((x) => x.viajes)), mt = med(s.map((x) => x.ticket));
  const cuad = (x) => (x.viajes >= mv ? (x.ticket >= mt ? ['Defender', 'Alto volumen y buen ticket: cuida el servicio.'] : ['Optimizar', 'Mucho volumen, ticket bajo: revisa tarifas.']) : (x.ticket >= mt ? ['Crecer', 'Buen ticket, poco volumen: invierte en publicidad.'] : ['Explorar', 'Poco volumen y ticket bajo: prueba promociones.']));
  $('#mk-sec').innerHTML = `<div class="card p-5 mb-4"><h3 class="font-semibold mb-1">Volumen vs ticket promedio por sector</h3><p class="hint mb-2">Cada burbuja es un sector; el tamaño es el ingreso. Toca una burbuja para ver el detalle.</p><div style="height:340px"><canvas id="c-secm"></canvas></div></div>` +
    `<div class="card p-5"><h3 class="font-semibold mb-3">Qué hacer en cada sector</h3>${tabla(['Sector', 'Viajes', 'Ticket', 'Estrategia', 'Qué hacer'], s.sort((x, y) => y.monto - x.monto).map((x) => [esc(x.nombre), NUM(x.viajes), CLP(x.ticket), cuad(x)[0], `<span style="white-space:normal;display:block;min-width:200px;text-align:left">${cuad(x)[1]}</span>`]), s.map((x) => ` data-sec="${esc(x.nombre)}"`))}</div>`;
}
function mkSecChart() {
  const s = mk.secData; if (!s || !s.length || !$('#c-secm')) return;
  const mx = Math.max(...s.map((x) => x.monto));
  draw('c-secm', { click: (k) => detalle('Sector: ' + s[k].nombre, (r, i) => r[i.sector] === s[k].nombre), tip: (k) => ['Viajes: ' + NUM(s[k].viajes), 'Ticket: ' + CLP(s[k].ticket), 'Ingresos: ' + CLP(s[k].monto)], type: 'bubble',
    data: { datasets: [{ label: 'Sectores', data: s.map((x) => ({ x: x.viajes, y: x.ticket, r: 5 + 18 * Math.sqrt(x.monto / mx), n: x.nombre })), backgroundColor: 'rgba(76,215,246,.45)', borderColor: C.p }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: (it) => it[0].raw.n } } }, scales: { x: { title: { display: true, text: 'Viajes' }, grid: { color: C.grid } }, y: { title: { display: true, text: 'Ticket promedio ($)' }, grid: { color: C.grid }, ticks: { callback: (x) => '$' + NUM(x / 1e3) + 'k' } } } } });
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
  draw('c-' + p + '-mes', { click: (k) => detalleBucket(m[k].k, 'mes', cube, pred), tip: (k) => ['Tarifa prom.: ' + CLP(m[k].monto / Math.max(1, m[k].viajes))], type: 'bar', data: { labels: m.map((x) => { const [y, mm] = x.k.split('-'); return MESN[+mm] + ' ' + y; }), datasets: [{ label: 'Viajes', data: m.map((x) => x.viajes), backgroundColor: anulado ? C.t : C.a, borderRadius: 6, yAxisID: 'y' }, { label: 'Tarifa valorizada', type: 'line', data: m.map((x) => x.monto), borderColor: C.p, tension: .3, yAxisID: 'y2' }] }, options: { scales: { x: { grid: { display: false } }, y: { grid: { color: C.grid } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (x) => '$' + NUM(x / 1e3) + 'k' } } } } });
  const top = (col, n) => v._g(col).sort((x, y) => y.viajes - x.viajes).slice(0, n).map((x) => [esc(x.nombre), NUM(x.viajes), CLP(x.tarifa)]);
  const at = (col, key) => v._g(col).sort((x, y) => y.viajes - x.viajes).slice(0, 12).map((x) => ` data-${key}="${esc(x.nombre)}" data-sub="${p}"`);
  $('#t-' + p + '-cond').innerHTML = tabla(['Conductor', 'Viajes', 'Tarifa'], top('conductor', 12), at('conductor', 'cond'));
  $('#t-' + p + '-sec').innerHTML = tabla(['Sector', 'Viajes', 'Tarifa'], top('sector', 12), at('sector', 'sec'));
  if (!anulado) $('#t-convenios-tipo').innerHTML = tabla(['Tipo', 'Viajes', 'Tarifa'], top('pago', 5));
}

function reservas() {
  const v = W(D.cubo_futuras), dias = v.por_dia;
  $('#k-reservas').innerHTML = kpi('Reservas futuras', NUM(v.total), dias.length ? `${dias[0].fecha} a ${dias[dias.length - 1].fecha}` : 'sin reservas en el rango', 'event_upcoming') +
    kpi('Ingreso proyectado', CLP(v.ingresos), 'si todas se concretan', 'payments') + kpi('Tarifa promedio', CLP(v.ticket_promedio), 'por reserva', 'receipt_long') + kpi('Pasajeros', NUM(v.pasajeros), 'reservados', 'group');
  draw('c-reservas-dia', { click: (k) => detalleBucket(dias[k].fecha, 'dia', D.cubo_futuras), tip: (k) => ['Ingreso proyectado: ' + CLP(dias[k].monto)], type: 'bar', data: { labels: dias.map((d) => d.fecha.slice(5)), datasets: [{ label: 'Reservas', data: dias.map((d) => d.viajes), backgroundColor: C.p, borderRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: scales() } });
  const g = (col, key) => v._g(col).sort((x, y) => y.viajes - x.viajes).slice(0, 12), at = (col, key) => g(col).map((x) => ` data-${key}="${esc(x.nombre)}" data-sub="reservas"`);
  $('#t-reservas-cond').innerHTML = tabla(['Conductor', 'Reservas', 'Ingreso'], g('conductor').map((x) => [esc(x.nombre), NUM(x.viajes), CLP(x.monto)]), at('conductor', 'cond'));
  $('#t-reservas-sec').innerHTML = tabla(['Sector', 'Reservas', 'Ingreso'], g('sector').map((x) => [esc(x.nombre), NUM(x.viajes), CLP(x.monto)]), at('sector', 'sec'));
}
const convenios = () => subvista('convenios', D.cubo, (r, i) => r[i.pago].startsWith('Convenio'), false);
const anulados = () => subvista('anulados', D.cubo_anulados, null, true);
const RENDER = { resumen, ventas, viajes, clientes, sectores, convenios, anulados, reservas, costos, marketing, calidad };
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
  $('#rango-nota').textContent = `Viajes: ${rango.viajes[0]} a ${rango.viajes[1]} · Finanzas: ${rango.fin[0]} a ${rango.fin[1]}. Las fechas aplican a todos los menús; conductor, pago, sentido y sector aplican solo a viajes. Calidad de datos es del archivo completo.`;
  const refrescar = () => { $('#f-limpiar').style.display = Object.values(F).some(Boolean) ? '' : 'none'; show(location.hash.slice(1) || 'resumen'); };
  for (const k of ['desde', 'hasta']) $('#f-' + k).addEventListener('change', (e) => { F[k] = e.target.value; refrescar(); });
  document.querySelectorAll('[data-rango]').forEach((bt) => bt.addEventListener('click', () => { [F.desde, F.hasta] = rango[bt.dataset.rango]; $('#f-desde').value = F.desde; $('#f-hasta').value = F.hasta; refrescar(); }));
  $('#f-toggle').addEventListener('click', () => { const o = $('#filtros').classList.toggle('abierto'); $('#f-chev').textContent = o ? 'expand_less' : 'expand_more'; });
  $('#f-limpiar').addEventListener('click', () => { Object.keys(F).forEach((k) => { F[k] = ''; $('#f-' + k).value = ''; }); $('#f-limpiar').style.display = 'none'; show(location.hash.slice(1) || 'resumen'); });
  $('#gen').textContent = D.meta.generado.replace('T', ' ').slice(0, 16);
  show(location.hash.slice(1) || 'resumen');
}
init().catch((e) => { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:1rem;color:#fb7185">No se pudieron cargar los datos: ' + e.message + '</p>'); });
