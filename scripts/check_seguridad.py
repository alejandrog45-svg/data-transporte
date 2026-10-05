#!/usr/bin/env python3
"""Chequeo de seguridad antes de commit/deploy (adaptado del SECURITY.md del Centro de Comando de Oviedo).

Revisa, sin red y sin modificar nada:
  1. Que ningún archivo versionado por Git ni ninguno de lo que se publica (site/) contenga tokens, claves privadas o secretos.
  2. Que no haya archivos prohibidos versionados (.env, claves, cuentas de servicio, archivos DPAPI).
  3. Que .gitignore proteja lo crítico.
  4. Que la clave AES del panel (si está en este PC) no aparezca en ningún archivo versionado ni publicado.
  5. Que site/ no lleve datos de Google en claro (frases, previsión) ni rutas locales.

Uso:  python tools/check_seguridad.py        (sale con código 1 si hay hallazgos)
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF = {"tools/check_seguridad.py", "tests/test_seguridad.py"}

PATRONES = {
    "token Anthropic": r"sk-ant-[A-Za-z0-9_-]{10,}",
    "clave de API de Google": r"AIzaSy[A-Za-z0-9_-]{30,}",
    "token OAuth de Google": r"ya29\.[A-Za-z0-9_-]{20,}",
    "token de GitHub": r"gh[pousr]_[A-Za-z0-9]{30,}",
    "clave privada": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "cuenta de servicio (private_key)": r'"private_key"\s*:',
    "secreto de cliente OAuth": r'"client_secret"\s*:\s*"[^"]{8,}"',
}
PROHIBIDOS = [r"(^|/)\.env($|\.)", r"\.key$", r"service-account.*\.json$", r"credentials.*\.json$",
              r"client_secret.*\.json$", r"firebase-adminsdk.*\.json$", r"\.dpapi$", r"\.pem$"]
GITIGNORE_DEBE = [".env", "*.key", "*service-account*.json", "*credentials*.json", "client_secret*.json", "*.pem"]
TEXTO = {".md", ".py", ".js", ".json", ".html", ".css", ".yml", ".yaml", ".txt", ".rules", ".ini", ".toml", ".cfg", ""}


def versionados():
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    return [l for l in out.stdout.splitlines() if l]


def publicados():
    return [str(p.relative_to(ROOT)).replace("\\", "/") for p in (ROOT / "site").rglob("*") if p.is_file()]


def leer(rel):
    p = ROOT / rel
    if p.suffix.lower() not in TEXTO or not p.exists() or p.stat().st_size > 3_000_000:
        return ""
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def clave_local():
    """Clave AES del panel si está disponible en este PC (DPAPI o variable de entorno); None si no."""
    try:
        import importlib.util as u
        s = u.spec_from_file_location("b", ROOT / "tools" / "panel" / "build.py")
        m = u.module_from_spec(s)
        s.loader.exec_module(m)
        return m.get_key()
    except Exception:
        return None


def chequear():
    hallazgos = []
    vers, pub = versionados(), publicados()
    for rel in sorted(set(vers) | set(pub)):
        if rel in SELF:
            continue
        for pat in PROHIBIDOS:
            if re.search(pat, rel, re.I) and rel in vers and not rel.endswith(".example"):   # las plantillas .example son a propósito
                hallazgos.append(f"archivo prohibido versionado: {rel}")
        txt = leer(rel)
        for nombre, rx in PATRONES.items():
            if re.search(rx, txt):
                hallazgos.append(f"{nombre} en {rel}")
    gi = (ROOT / ".gitignore").read_text(encoding="utf-8") if (ROOT / ".gitignore").exists() else ""
    for g in GITIGNORE_DEBE:
        if g not in gi:
            hallazgos.append(f".gitignore no protege «{g}»")
    k = clave_local()
    if k:
        for rel in sorted(set(vers) | set(pub)):
            if rel not in SELF and k in leer(rel):
                hallazgos.append(f"LA CLAVE AES DEL PANEL aparece en {rel}")
    for rel in pub:
        txt = leer(rel)
        if re.search(r'"yoy"|"planId"|"indice_mensual"', txt):
            hallazgos.append(f"datos de Google en claro en lo publicado: {rel}")
        if re.search(r"[A-Z]:\\\\(?:Users|config)|E:\\config", txt):
            hallazgos.append(f"ruta local en lo publicado: {rel}")
    return hallazgos


def main():
    h = chequear()
    if h:
        print("FALLA: " + str(len(h)) + " hallazgo(s)")
        for x in h:
            print("  -", x)
        return 1
    print("OK: sin secretos, sin archivos prohibidos, .gitignore protege lo crítico, lo publicado no lleva datos en claro")
    return 0


if __name__ == "__main__":
    sys.exit(main())
