"""ETL: Excel (viajes mayo-octubre 2026 + ventas/gastos 2026) -> data/data.json (publico, agregado).

Datos personales (nombre/telefono) NUNCA van al JSON publico. Los clientes
recurrentes se guardan en data/privado/ (ignorado por git) para uso interno.
Uso: E:\\python-portable\\python.exe scripts\\etl.py
"""
import json, re, hashlib, unicodedata, collections, csv, sys, argparse, datetime as dt
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
VIAJES_XLSX = ROOT / "PLANILLA  MATRIZ  MARZO 2025.xlsx"
FIN_XLSX = ROOT / "AÑO 2026.xlsx"
OUT = ROOT / "data"
OUT.mkdir(exist_ok=True)
(OUT / "privado").mkdir(exist_ok=True)

# La planilla se llama 'MARZO 2025' (plantilla original) pero sus hojas son de 2026: lo prueban los nombres
# con dia de la semana (LUNES 27 JULIO cae lunes en 2026) y el control 'dia de la semana de las hojas'.
ANIO_VIAJES = 2026
DIAS_SEM = {"LUNES": 0, "MARTES": 1, "MIERCOLES": 2, "JUEVES": 3, "VIERNES": 4, "SABADO": 5, "DOMINGO": 6}
MESES = {"ENERO": 1, "FEB": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6, "JULIO": 7,
         "AGOSTO": 8, "SEPT": 9, "OCT": 10, "NOV": 11, "DIC": 12}
MES_NOMBRE = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
COMUNAS = ["Santiago Centro", "Las Condes", "Providencia", "Ñuñoa", "Vitacura", "Lo Barnechea", "La Reina",
           "Maipú", "Pudahuel", "Quilicura", "Colina", "Huechuraba", "Recoleta", "Independencia", "San Miguel",
           "La Florida", "Puente Alto", "San Bernardo", "Estación Central", "Peñalolén", "Macul", "Padre Hurtado",
           "Lo Prado", "La Pintana", "Chicureo", "Pirque", "Lampa", "La Granja", "Quinta Normal", "Cerrillos",
           "Renca", "Conchalí", "San Joaquín", "La Cisterna", "El Bosque", "Peñaflor", "Paine", "Valparaíso",
           "Viña del Mar", "Limache", "Casablanca", "Pedro Aguirre Cerda", "San Ramón", "Lo Espejo", "Buin",
           "Talagante", "Calera de Tango", "Cerro Navia", "Concón", "Rancagua", "Santa Cruz", "Til Til", "Batuco",
           "San José de Maipo", "Isla de Maipo", "Melipilla", "El Monte", "San Antonio", "Curacaví", "María Pinto",
           "Lo Barnechea", "Ñuñoa", "San Ramon", "Calera"]

# palabras clave -> sector (hoteles, clinicas, metros, avenidas conocidas)
ALIAS = [("CLINICA ALEMANA", "Vitacura"), ("PLAZA SAN FRANCISCO", "Santiago Centro"), ("ALAMEDA", "Santiago Centro"),
         ("METRO PAJARITOS", "Estación Central"), ("MONTICELLO", "Casino Monticello (Mostazal)"),
         ("BARRIO BELLAVISTA", "Providencia"), ("LA DEHESA", "Lo Barnechea"), ("COSTANERA", "Providencia")]


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


COM_N = [(norm(c), c) for c in sorted(COMUNAS, key=len, reverse=True)]


def sector(*textos):
    for t in textos:
        n = norm(t)
        if not n or n.startswith("AEROP") or n.startswith("AEREOP"):
            continue
        if re.search(r"\bDOMICILIOS?\b", n):
            return "Varios domicilios"
        if re.match(r"^(CONTACT|CONFIRM|AGENDAD|RETORN|ORIGEN|DESTINO|UBERTRANSFER|\.$)", n):
            continue
        for k, v in COM_N:
            if k in n:
                return v
        for k, v in ALIAS:
            if k in n:
                return v
        if re.search(r"\bSTGO\b|\bSANTIAGO\b", n):
            return "Santiago Centro"
        if "ESTACION" in n and "FERRO" in n:
            return "Estación Central"
    return "Sin identificar"


def medio_pago(v):
    n = norm(v)
    if not n:
        return "Sin dato"
    if "NO COBRAR" in n:
        return "Convenio (pago diferido)" if "PAGARAN" in n else "Convenio"
    if "EFECTIVO" in n:
        return "Efectivo"
    if "TARJETA" in n:
        return "Tarjeta"
    if "TRANSF" in n or "BANCO" in n or "DEPOSITO" in n:
        return "Transferencia"
    if "MERCADO" in n or n == "MP":
        return "Mercado Pago"
    return "Otro"


# Unificacion de nombres de conductores (variantes y errores de tipeo). Orden importa.
COND_REGLAS = [
    (r"EXTERNO", "Externo"),
    (r"^(STEFANO|ESTEFANO|STEFAN0)\b", "Stefano"),
    (r"^RAFAEL\b", "Rafael"),
    (r"^(JONATAN|JONATHAN|JONTHAN|JONATAHAN|JOATHAN) (S\b|SANDOVAL)", "Jonatan Sandoval"),
    (r"^(JONATAN|JONATHAN) (B\b|BRICENO)", "Jonatan Briceño"),
    (r"^(HANZ|HANS)\b", "Hanz"),
    (r"^(BRAYAN|BRYAN)\b", "Brayan"),
    (r"^(EDGARDO|EGDARDO)\b", "Edgardo"),
    (r"^(LUIS MURILLO|LUS MURILLO)", "Luis Murillo"),
    (r"^LUIS CEBALLOS", "Luis Ceballos"),
    (r"^ALEX\b", "Alex"),
    (r"^MIGUEL\b", "Miguel"),
    (r"^ALEJANDRO\b", "Alejandro"),
    (r"^CRISTIAN TORRES", "Cristian Torres"),
    (r"^CRISTIAN\b", "Cristian"),
    (r"^PABLO\b", "Pablo"),
    (r"^RODRIGO\b", "Rodrigo"),
    (r"^DIEGO\b", "Diego"),
    (r"^MAURICIO\b", "Mauricio"),
]


def conductor(v):
    n = norm(v)
    n = re.sub(r"\bNULO\b", "", n).strip()
    n = re.sub(r"\bSIN COMISION\b", "", n).strip()
    if not n or n in (".", "-", "CONDUCTOR", "SIN CONDUCTOR", "NOCHE"):
        return "Sin dato"
    for rx, nombre in COND_REGLAS:
        if re.search(rx, n):
            return nombre
    return n.title()


def fecha_hoja(titulo):
    n = norm(titulo)
    m = re.match(r"^(?:(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\s+)?(\d{1,2})\s*-?\s*([A-Z]+)", n)
    if not m:
        return None
    d, mes = int(m.group(2)), None
    for k, v in MESES.items():
        if m.group(3).startswith(k):
            mes = v
    if not mes:
        return None
    try:
        return dt.date(ANIO_VIAJES, mes, d)
    except ValueError:
        return None


def dia_semana_hoja(titulo):
    m = re.match(r"^(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\b", norm(titulo))
    return DIAS_SEM[m.group(1)] if m else None


def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    return None


def viajes(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    calidad = collections.Counter()
    filas, vistos, dups = [], set(), []
    for ws in wb.worksheets:
        f = fecha_hoja(ws.title)
        if not f:
            calidad["hojas_ignoradas"] += 1
            continue
        calidad["hojas_procesadas"] += 1
        ds = dia_semana_hoja(ws.title)
        if ds is not None:
            calidad["hojas_con_dia_semana"] += 1
            if f.weekday() != ds:
                calidad["hojas_dia_semana_distinto"] += 1
        if False:
            continue
        for i, r in enumerate(ws.iter_rows(values_only=True)):
            if i == 0 or not r or r[0] is None:
                continue
            r = tuple(r) + (None,) * 14
            calidad["filas_leidas"] += 1
            clave = (f, tuple(str(x) for x in r[:13]))
            if clave in vistos:
                calidad["duplicados_eliminados"] += 1
                dups.append([f.isoformat(), ws.title] + [str(x) for x in r[:13]])
                continue
            vistos.add(clave)
            tarifa = num(r[8])
            anulado = any(re.search(r"\bNULO\b", norm(r[c])) for c in (8, 9, 10))
            if anulado:
                calidad["anulados"] += 1
            elif tarifa is None:
                calidad["sin_tarifa"] += 1
            hora = r[2].hour if hasattr(r[2], "hour") else None
            if hora is None:
                calidad["sin_hora"] += 1
            tel = re.sub(r"\D", "", str(r[1] or ""))[-9:]
            origen, destino = str(r[4] or ""), str(r[5] or "")
            sale_aero = norm(origen).startswith("AEROP")
            filas.append(dict(
                fecha=f, hora=hora, pax=num(r[3]) or 0, tarifa=tarifa or 0,
                monto=0 if (anulado or medio_pago(r[10]).startswith("Convenio")) else (tarifa or 0),
                anulado=anulado,
                conductor=conductor(r[9]), pago=medio_pago(r[10]),
                sentido="Desde aeropuerto" if sale_aero else ("Hacia aeropuerto" if norm(destino).startswith("AEROP") else "Otro"),
                sector=sector(destino if sale_aero else origen, origen, destino),
                tipo=str(r[7]).strip().title() if r[7] and str(r[7]).strip() not in (".", "") else "",
                cliente=hashlib.sha256(tel.encode()).hexdigest()[:8] if len(tel) >= 8 else None,
                nombre=str(r[0]).strip(), tel=tel))
    with open(OUT / "privado" / "duplicados_eliminados.csv", "w", newline="", encoding="utf-8-sig") as fh:
        csv.writer(fh).writerows([["fecha", "hoja", "nombre", "telefono", "hora", "pax", "origen", "destino", "vuelo", "tipo", "tarifa", "conductor", "pago", "equipaje", "arribo"]] + dups)
    anuladas = [x for x in filas if x["anulado"]]
    hoy = dt.date.today()
    futuras = [x for x in filas if not x["anulado"] and x["fecha"] > hoy]
    filas = [x for x in filas if not x["anulado"] and x["fecha"] <= hoy]
    return filas, calidad, anuladas, futuras


def agg(filas, key):
    d = collections.defaultdict(lambda: [0, 0.0])
    for x in filas:
        d[key(x)][0] += 1
        d[key(x)][1] += x["monto"]
    return d


def agg_t(filas, key):
    d = collections.defaultdict(lambda: [0, 0.0])
    for x in filas:
        d[key(x)][0] += 1
        d[key(x)][1] += x["tarifa"]
    return d


def cubo(filas):
    """Filas agregadas por (fecha, hora, conductor, pago, sector, sentido). Sin nombres ni telefonos."""
    d = collections.defaultdict(lambda: [0, 0.0, 0.0, 0, 0.0])
    for x in filas:
        k = (x["fecha"].isoformat(), x["hora"], x["conductor"], x["pago"], x["sector"], x["sentido"])
        d[k][0] += 1; d[k][1] += x["monto"]; d[k][2] += x["pax"]; d[k][3] += 1 if x["monto"] > 0 else 0; d[k][4] += x["tarifa"]
    cols = ["fecha", "hora", "conductor", "pago", "sector", "sentido", "viajes", "monto", "pax", "cobrados", "tarifa"]
    return dict(cols=cols, rows=[list(k) + [v[0], round(v[1]), round(v[2]), v[3], round(v[4])] for k, v in sorted(d.items(), key=lambda kv: (kv[0][0], kv[0][1] if kv[0][1] is not None else -1))])


def tabla(d, n=None, orden="n"):
    rows = [dict(nombre=k, viajes=v[0], monto=round(v[1])) for k, v in d.items()]
    rows.sort(key=lambda r: -r["viajes" if orden == "n" else "monto"])
    return rows[:n] if n else rows


def hojas_fin(xlsx=None, json_path=None):
    """Devuelve [(titulo, filas)] desde un xlsx local o desde el JSON del Apps Script."""
    if json_path:
        return [(h["title"], [tuple(r) for r in h["values"]]) for h in json.loads(Path(json_path).read_text(encoding="utf-8"))]
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    return [(ws.title, [tuple(r) for r in ws.iter_rows(values_only=True)]) for ws in wb.worksheets]


def finanzas(hojas):
    meses, dias, calidad = [], [], collections.Counter()
    for titulo, rows in hojas:
        n = norm(titulo)
        mes = next((v for k, v in MESES.items() if k in n), None)
        if not mes or len(rows) < 3:
            continue
        head = [norm(h) for h in rows[1]]
        cats = {i: re.sub(r"^PUBLICIDAD.*", "PUBLICIDAD", h) for i, h in enumerate(head) if i >= 2 and h}
        venta_m, gasto = 0.0, collections.Counter()
        for r in rows[2:]:
            d = num(r[0])
            if d is None or not 1 <= d <= 31:
                continue
            v = num(r[1]) if len(r) > 1 else None
            if len(r) > 1 and isinstance(r[1], str) and r[1].strip():
                calidad["texto_en_venta"] += 1
            g_dia = 0.0
            gd = collections.Counter()
            for i, c in cats.items():
                if i < len(r):
                    x = num(r[i])
                    if x is None and isinstance(r[i], str) and r[i].strip():
                        calidad["texto_en_gastos(xxx)"] += 1
                    if x:
                        gasto[c] += x
                        g_dia += x
                        gd[c] += x
            if v or g_dia:
                dias.append(dict(fecha=f"2026-{mes:02d}-{int(d):02d}", venta=round(v or 0), gasto=round(g_dia),
                                 gastos={k: round(x) for k, x in gd.items()}))
            venta_m += v or 0
        total_g = sum(gasto.values())
        meses.append(dict(mes=mes, nombre=MES_NOMBRE[mes], venta=round(venta_m), gasto=round(total_g),
                          margen=round(venta_m - total_g),
                          gastos={k: round(v) for k, v in gasto.most_common()}))
    return meses, dias, calidad



def verificar(data, filas, anuladas, futuras, cal, cli):
    """Controles de consistencia. critico=True bloquea la publicacion si falla."""
    v = data["viajes"]; fin = data["finanzas"]; res = []
    def chk(nombre, ok, detalle, critico=True):
        res.append(dict(control=nombre, ok=bool(ok), detalle=detalle, critico=critico))
    n = v["total"]
    chk("Conservacion de registros", cal["filas_leidas"] == n + len(anuladas) + len(futuras) + cal["duplicados_eliminados"],
        f'{cal["filas_leidas"]} leidas = {n} viajes + {len(anuladas)} anulados + {len(futuras)} reservas futuras + {cal["duplicados_eliminados"]} duplicados')
    chk("Dia de la semana de las hojas coincide con el calendario", cal["hojas_dia_semana_distinto"] == 0,
        f'{cal["hojas_con_dia_semana"]} hojas con dia en el nombre, {cal["hojas_dia_semana_distinto"]} no coinciden con {ANIO_VIAJES}')
    chk("Reservas futuras separadas de los viajes realizados", all(x["fecha"] > dt.date.today() for x in futuras), f"{len(futuras)} reservas hasta {max((x['fecha'] for x in futuras), default=dt.date.today()).isoformat()}", critico=False)
    chk("Viajes: total = suma por mes = suma por dia", n == sum(m["viajes"] for m in v["por_mes"]) == sum(d["viajes"] for d in v["por_dia"]), f"{n} viajes")
    chk("Viajes: total = suma por dia de semana", n == sum(d["viajes"] for d in v["por_dow"]), f"{n} viajes")
    chk("Viajes: total = suma por medio de pago", n == sum(p["viajes"] for p in v["pagos"]), f"{n} viajes")
    chk("Viajes: total = suma por sector", n == sum(x["viajes"] for x in tabla(agg(filas, lambda x: x["sector"]))), f"{n} viajes")
    chk("Viajes: total = suma por conductor", n == sum(x["viajes"] for x in tabla(agg(filas, lambda x: x["conductor"]))), f"{n} viajes")
    cb = data["cubo"]; ci = {c: k for k, c in enumerate(cb["cols"])}
    chk("Cubo de datos = totales (viajes e ingresos)", sum(r[ci["viajes"]] for r in cb["rows"]) == n and sum(r[ci["monto"]] for r in cb["rows"]) == v["ingresos"],
        f'{n} viajes, ${v["ingresos"]:,}'.replace(",", "."))
    chk("Ingresos = suma por mes = suma por dia", v["ingresos"] == sum(m["monto"] for m in v["por_mes"]) == sum(d["monto"] for d in v["por_dia"]), f'${v["ingresos"]:,}'.replace(",", "."))
    chk("Anulados no suman a ventas", all(r[ci["monto"]] == 0 for r in data["cubo_anulados"]["rows"]), f"{len(anuladas)} anulados")
    chk("Convenios no suman a ventas", all(x["monto"] == 0 for x in filas if x["pago"].startswith("Convenio")), f'{v["convenios"]} convenios')
    chk("Clientes: viajes por cliente = viajes con telefono", sum(len(c) for c in data["clientes_viajes"]) == sum(1 for x in filas if x["cliente"]), f'{len(data["clientes_viajes"])} clientes')
    meses, dias = fin["meses"], fin["dias"]
    chk("Finanzas: ventas por dia = por mes", sum(d["venta"] for d in dias) == sum(m["venta"] for m in meses), f'${sum(m["venta"] for m in meses):,}'.replace(",", "."))
    chk("Finanzas: gastos por dia = por mes", sum(d["gasto"] for d in dias) == sum(m["gasto"] for m in meses), f'${sum(m["gasto"] for m in meses):,}'.replace(",", "."))
    chk("Finanzas: gastos por categoria = gasto total", all(sum(m["gastos"].values()) == m["gasto"] for m in meses), f"{len(meses)} meses")
    chk("Fechas de viajes dentro del periodo y no futuras", all(dt.date(ANIO_VIAJES, 1, 1) <= x["fecha"] <= dt.date.today() for x in filas), f'{v["por_dia"][0]["fecha"]} a {v["por_dia"][-1]["fecha"]}')
    chk("Horas validas (0-23)", all(x["hora"] is None or 0 <= x["hora"] <= 23 for x in filas), "")
    chk("Sin tarifas negativas", all(x["tarifa"] >= 0 for x in filas), "")
    # sin datos personales en el JSON publico
    txt = json.dumps(data, ensure_ascii=False).lower()
    publicas = {x["conductor"].lower() for x in filas} | {x["sector"].lower() for x in filas}
    nombres = {c["nombre"].strip().lower() for c in cli.values() if len(c["nombre"].strip()) >= 6} - publicas
    tels = {c["tel"] for c in cli.values() if len(c["tel"]) >= 8}
    fuga_n = [x for x in nombres if x in txt]; fuga_t = [x for x in tels if x in txt]
    chk("Sin nombres ni telefonos de clientes en el JSON publico", not fuga_n and not fuga_t, f"{len(nombres)} nombres y {len(tels)} telefonos revisados (se omiten nombres iguales a un conductor o sector publico), {len(fuga_n) + len(fuga_t)} coincidencias")
    # informativos
    outl = [x for x in filas if x["tarifa"] > 300000]
    chk("Tarifas atipicas (> $300.000)", not outl, f"{len(outl)} viajes", critico=False)
    pxo = [x for x in filas if x["pax"] > 20]
    chk("Pasajeros atipicos (> 20)", not pxo, f"{len(pxo)} viajes", critico=False)
    dias_v = {dt.date.fromisoformat(d["fecha"]) for d in v["por_dia"]}
    d0, d1 = min(dias_v), max(dias_v)
    faltan = [d0 + dt.timedelta(k) for k in range((d1 - d0).days + 1) if d0 + dt.timedelta(k) not in dias_v]
    chk("Dias del periodo sin viajes cargados", not faltan, f"{len(faltan)} dias" + (": " + ", ".join(x.isoformat() for x in faltan[:8]) if faltan else ""), critico=False)
    sinv = [d for d in dias if d["venta"] == 0 and d["gasto"] > 0]
    chk("Dias de 2026 con gastos pero sin ventas", not sinv, f"{len(sinv)} dias", critico=False)
    chk("Ventas pendientes de carga en 2026", all(m["venta"] > 0 for m in meses), "meses sin ventas: " + (", ".join(m["nombre"] for m in meses if m["venta"] == 0) or "ninguno"), critico=False)
    pm = {m["mes"]: m["monto"] for m in v["por_mes"]}
    cruces = []
    for m in meses:
        if m["mes"] in pm and m["venta"] > 0 and abs(m["venta"] - pm[m["mes"]]) > 0.15 * pm[m["mes"]]:
            cruces.append(f'{m["nombre"]}: viajes ${pm[m["mes"]]:,} vs planilla ${m["venta"]:,}'.replace(",", "."))
    chk("Ingresos por viajes vs ventas de la planilla anual (mismo mes)", not cruces, "; ".join(cruces) if cruces else "dentro de +-15%", critico=False)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--viajes", default=str(VIAJES_XLSX))
    ap.add_argument("--fin-xlsx", default=str(FIN_XLSX))
    ap.add_argument("--fin-json", default=None, help="JSON del Apps Script (hojas 2026)")
    a = ap.parse_args()
    filas, cal, anuladas, futuras = viajes(a.viajes)
    total = sum(x["monto"] for x in filas)
    cobrados = [x for x in filas if x["monto"] > 0]
    por_mes = agg(filas, lambda x: x["fecha"].month)
    por_dia = agg(filas, lambda x: x["fecha"].isoformat())
    por_dow = agg(filas, lambda x: x["fecha"].weekday())
    heat = [[0] * 24 for _ in range(7)]
    for x in filas:
        if x["hora"] is not None:
            heat[x["fecha"].weekday()][x["hora"]] += 1
    cli = collections.defaultdict(lambda: dict(n=0, monto=0.0, nombre="", tel="", v=[], sec=collections.Counter()))
    for x in filas:
        if x["cliente"]:
            c = cli[x["cliente"]]
            c["n"] += 1; c["monto"] += x["monto"]; c["nombre"] = x["nombre"]; c["tel"] = x["tel"]; c["v"].append([x["fecha"].isoformat(), round(x["monto"])]); c["sec"][x["sector"]] += 1
    recurrentes = sorted((c for c in cli.values() if c["n"] >= 2), key=lambda c: -c["n"])
    with open(OUT / "privado" / "clientes_recurrentes.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["nombre", "telefono", "viajes", "monto_clp"])
        for c in recurrentes:
            w.writerow([c["nombre"], c["tel"], c["n"], round(c["monto"])])
    fin_datos = max(x["fecha"] for x in filas)
    corte = fin_datos - dt.timedelta(days=60)
    with open(OUT / "privado" / "segmentos_whatsapp.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["nombre", "telefono", "segmento", "estado", "viajes", "monto_clp", "ultimo_viaje", "sector_principal"])
        for c in sorted(cli.values(), key=lambda c: -c["n"]):
            ult = max(v[0] for v in c["v"])
            seg = "VIP" if c["n"] >= 6 else "Frecuente" if c["n"] >= 3 else "Ocasional" if c["n"] == 2 else "Nuevo"
            w.writerow([c["nombre"], c["tel"], seg, "Inactivo" if ult < corte.isoformat() else "Activo", c["n"], round(c["monto"]), ult, c["sec"].most_common(1)[0][0]])
    if a.fin_json or Path(a.fin_xlsx).exists():
        meses_fin, dias_fin, cal_fin = finanzas(hojas_fin(a.fin_xlsx, a.fin_json))
    else:  # sin fuente de finanzas: conserva lo ultimo publicado
        prev = json.loads((OUT / "data.json").read_text(encoding="utf-8"))
        meses_fin, dias_fin, cal_fin = prev["finanzas"]["meses"], prev["finanzas"]["dias"], collections.Counter(prev["meta"]["calidad"]["finanzas"])
        print("AVISO: sin fuente de finanzas, se conserva la anterior")
    data = dict(
        meta=dict(generado=dt.datetime.now().isoformat(timespec="seconds"),
                  fuentes=["PLANILLA MATRIZ (viajes, mayo-octubre 2026)", "AÑO 2026 (ventas y gastos)"],
                  anio_viajes=ANIO_VIAJES, hoy=dt.date.today().isoformat(),
                  periodo_viajes=[min(por_dia), max(por_dia)],
                  calidad=dict(viajes=dict(cal), finanzas=dict(cal_fin),
                               sin_sector=sum(1 for x in filas if x["sector"] == "Sin identificar"),
                               pago_sin_dato=sum(1 for x in filas if x["pago"] == "Sin dato"))),
        viajes=dict(
            total=len(filas), ingresos=round(total), ticket_promedio=round(total / max(len(cobrados), 1)),
            convenios=sum(1 for x in filas if x["pago"].startswith("Convenio")),
            pasajeros=round(sum(x["pax"] for x in filas)),
            por_mes=[dict(mes=k, nombre=MES_NOMBRE[k], viajes=v[0], monto=round(v[1])) for k, v in sorted(por_mes.items())],
            por_dia=[dict(fecha=k, viajes=v[0], monto=round(v[1])) for k, v in sorted(por_dia.items())],
            por_dow=[dict(nombre=DOW[k], viajes=v[0], monto=round(v[1])) for k, v in sorted(por_dow.items())],
            heatmap=dict(dias=DOW, horas=list(range(24)), valores=heat),
            conductores=tabla(agg(filas, lambda x: x["conductor"]), 12, "monto"),
            pagos=tabla(agg_t(filas, lambda x: x["pago"])),
            sectores=tabla(agg(filas, lambda x: x["sector"]), 15),
            sentido=tabla(agg(filas, lambda x: x["sentido"])),
            clientes=dict(unicos=len(cli), recurrentes=len(recurrentes),
                          viajes_de_recurrentes=sum(c["n"] for c in recurrentes),
                          top_anonimo=[dict(id=f"Cliente {i+1:02d}", viajes=c["n"], monto=round(c["monto"]))
                                       for i, c in enumerate(recurrentes[:10])])),
        clientes_viajes=[sorted(c["v"]) for c in sorted(cli.values(), key=lambda c: (-c["n"], c["v"][0][0]))],
        cubo=cubo(filas),
        cubo_anulados=cubo(anuladas),
        cubo_futuras=cubo(futuras),
        finanzas=dict(meses=meses_fin, dias=dias_fin))
    ver = verificar(data, filas, anuladas, futuras, cal, cli)
    data["meta"]["verificaciones"] = ver
    falla = [c for c in ver if c["critico"] and not c["ok"]]
    for c in ver:
        print(("OK   " if c["ok"] else ("FALLA" if c["critico"] else "AVISO")), c["control"], "-", c["detalle"])
    if falla:
        print("ERROR: hay controles criticos que fallan; no se actualiza data.json")
        sys.exit(1)
    (OUT / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print("viajes:", len(filas), "| ingresos:", data["viajes"]["ingresos"], "| calidad:", data["meta"]["calidad"])
    print("meses fin:", [(m["nombre"], m["venta"], m["gasto"]) for m in meses_fin])


if __name__ == "__main__":
    main()
