"""Arma docs/ (sitio publico): <head> del diseno Stitch + site_src/body.html + app.js + data.json."""
import re, shutil
from pathlib import Path
R = Path(__file__).resolve().parents[1]
stitch = next((R / "diseno/stitch-export").rglob("panel_ejecutivo_resumen_operativo/code.html"))
s = stitch.read_text(encoding="utf-8")
head = s[: s.index("<body")]
head = re.sub(r"<title>.*?</title>", "<title>Data Transporte - Análisis de negocio</title>", head, flags=re.S)
(R / "docs").mkdir(exist_ok=True)
(R / "docs/index.html").write_text(head + (R / "site_src/body.html").read_text(encoding="utf-8"), encoding="utf-8")
shutil.copy(R / "site_src/app.js", R / "docs/app.js")
shutil.copy(R / "data/data.json", R / "docs/data.json")
(R / "docs/.nojekyll").write_text("")
print("docs/ listo")
