"""ETL: Excel (viajes 2025 + ventas/gastos 2026) -> data/data.json (publico, agregado).

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

ANIO_VIAJES = 2025
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
        return "No cobrado"
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
    m = re.match(r"^(\d{1,2})\s*-?\s*([A-Z]+)", n)
    if not m:
        return None
    d, mes = int(m.group(1)), None
    for k, v in MESES.items():
        if m.group(2).startswith(k):
            mes = v
    if not mes:
        return None
    try:
        return dt.date(ANIO_VIAJES, mes, d)
    except ValueError:
        return None


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
        for i, r in enumerate(ws.iter_rows(values_only=True)):
            if i == 0 or not r or r[0] is None:
                continue
            r = tuple(r) + (None,) * 14
            clave = (f, tuple(str(x) for x in r[:13]))
            if clave in vistos:
                calidad["duplicados_eliminados"] += 1
                dups.append([f.isoformat(), ws.title] + [str(x) for x in r[:13]])
                continue
            vistos.add(clave)
            tarifa = num(r[8])
            if re.search(r"\bNULO\b", norm(r[9])):
                calidad["marcados_nulo"] += 1
            if tarifa is None:
                calidad["sin_tarifa"] += 1
            hora = r[2].hour if hasattr(r[2], "hour") else None
            if hora is None:
                calidad["sin_hora"] += 1
            tel = re.sub(r"\D", "", str(r[1] or ""))[-9:]
            origen, destino = str(r[4] or ""), str(r[5] or "")
            sale_aero = norm(origen).startswith("AEROP")
            filas.append(dict(
                fecha=f, hora=hora, pax=num(r[3]) or 0, tarifa=tarifa or 0,
                monto=0 if medio_pago(r[10]) == "No cobrado" else (tarifa or 0),
                conductor=conductor(r[9]), pago=medio_pago(r[10]),
                sentido="Desde aeropuerto" if sale_aero else ("Hacia aeropuerto" if norm(destino).startswith("AEROP") else "Otro"),
                sector=sector(destino if sale_aero else origen, origen, destino),
                tipo=str(r[7]).strip().title() if r[7] and str(r[7]).strip() not in (".", "") else "",
                cliente=hashlib.sha256(tel.encode()).hexdigest()[:8] if len(tel) >= 8 else None,
                nombre=str(r[0]).strip(), tel=tel))
    with open(OUT / "privado" / "duplicados_eliminados.csv", "w", newline="", encoding="utf-8-sig") as fh:
        csv.writer(fh).writerows([["fecha", "hoja", "nombre", "telefono", "hora", "pax", "origen", "destino", "vuelo", "tipo", "tarifa", "conductor", "pago", "equipaje", "arribo"]] + dups)
    return filas, calidad


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
    d = collections.defaultdict(lambda: [0, 0.0, 0.0, 0])
    for x in filas:
        k = (x["fecha"].isoformat(), x["hora"], x["conductor"], x["pago"], x["sector"], x["sentido"])
        d[k][0] += 1; d[k][1] += x["monto"]; d[k][2] += x["pax"]; d[k][3] += 1 if x["monto"] > 0 else 0
    cols = ["fecha", "hora", "conductor", "pago", "sector", "sentido", "viajes", "monto", "pax", "cobrados"]
    return dict(cols=cols, rows=[list(k) + [v[0], round(v[1]), round(v[2]), v[3]] for k, v in sorted(d.items(), key=lambda kv: (kv[0][0], kv[0][1] if kv[0][1] is not None else -1))])


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
            for i, c in cats.items():
                if i < len(r):
                    x = num(r[i])
                    if x is None and isinstance(r[i], str) and r[i].strip():
                        calidad["texto_en_gastos(xxx)"] += 1
                    if x:
                        gasto[c] += x
                        g_dia += x
            if v or g_dia:
                dias.append(dict(fecha=f"2026-{mes:02d}-{int(d):02d}", venta=round(v or 0), gasto=round(g_dia)))
            venta_m += v or 0
        total_g = sum(gasto.values())
        meses.append(dict(mes=mes, nombre=MES_NOMBRE[mes], venta=round(venta_m), gasto=round(total_g),
                          margen=round(venta_m - total_g),
                          gastos={k: round(v) for k, v in gasto.most_common()}))
    return meses, dias, calidad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--viajes", default=str(VIAJES_XLSX))
    ap.add_argument("--fin-xlsx", default=str(FIN_XLSX))
    ap.add_argument("--fin-json", default=None, help="JSON del Apps Script (hojas 2026)")
    a = ap.parse_args()
    filas, cal = viajes(a.viajes)
    total = sum(x["monto"] for x in filas)
    cobrados = [x for x in filas if x["monto"] > 0]
    por_mes = agg(filas, lambda x: x["fecha"].month)
    por_dia = agg(filas, lambda x: x["fecha"].isoformat())
    por_dow = agg(filas, lambda x: x["fecha"].weekday())
    heat = [[0] * 24 for _ in range(7)]
    for x in filas:
        if x["hora"] is not None:
            heat[x["fecha"].weekday()][x["hora"]] += 1
    cli = collections.defaultdict(lambda: dict(n=0, monto=0.0, nombre="", tel=""))
    for x in filas:
        if x["cliente"]:
            c = cli[x["cliente"]]
            c["n"] += 1; c["monto"] += x["tarifa"]; c["nombre"] = x["nombre"]; c["tel"] = x["tel"]
    recurrentes = sorted((c for c in cli.values() if c["n"] >= 2), key=lambda c: -c["n"])
    with open(OUT / "privado" / "clientes_recurrentes.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["nombre", "telefono", "viajes", "monto_clp"])
        for c in recurrentes:
            w.writerow([c["nombre"], c["tel"], c["n"], round(c["monto"])])
    if a.fin_json or Path(a.fin_xlsx).exists():
        meses_fin, dias_fin, cal_fin = finanzas(hojas_fin(a.fin_xlsx, a.fin_json))
    else:  # sin fuente de finanzas: conserva lo ultimo publicado
        prev = json.loads((OUT / "data.json").read_text(encoding="utf-8"))
        meses_fin, dias_fin, cal_fin = prev["finanzas"]["meses"], prev["finanzas"]["dias"], collections.Counter(prev["meta"]["calidad"]["finanzas"])
        print("AVISO: sin fuente de finanzas, se conserva la anterior")
    data = dict(
        meta=dict(generado=dt.datetime.now().isoformat(timespec="seconds"),
                  fuentes=["PLANILLA MATRIZ (viajes 2025)", "AÑO 2026 (ventas y gastos)"],
                  periodo_viajes=[min(por_dia), max(por_dia)],
                  calidad=dict(viajes=dict(cal), finanzas=dict(cal_fin),
                               sin_sector=sum(1 for x in filas if x["sector"] == "Sin identificar"),
                               pago_sin_dato=sum(1 for x in filas if x["pago"] == "Sin dato"))),
        viajes=dict(
            total=len(filas), ingresos=round(total), ticket_promedio=round(total / max(len(cobrados), 1)),
            no_cobrados=sum(1 for x in filas if x["pago"] == "No cobrado"),
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
        cubo=cubo(filas),
        finanzas=dict(meses=meses_fin, dias=dias_fin))
    (OUT / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print("viajes:", len(filas), "| ingresos:", data["viajes"]["ingresos"], "| calidad:", data["meta"]["calidad"])
    print("meses fin:", [(m["nombre"], m["venta"], m["gasto"]) for m in meses_fin])


if __name__ == "__main__":
    main()
