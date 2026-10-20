#!/usr/bin/env python3
"""
probar_plataforma.py — Prueba el contenido y la interfaz dentro de un navegador real.

Abre dist/plataforma-sin-conexion.html en Microsoft Edge o Google Chrome sin
ventana, ejecuta herramientas/pruebas-navegador.js y muestra el resultado.

Uso:  python herramientas/probar_plataforma.py   (después de python construir.py)
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NAVEGADORES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    shutil.which("google-chrome") or "", shutil.which("chromium") or "", shutil.which("msedge") or "",
]


def main():
    for flujo in (sys.stdout, sys.stderr):
        try:
            flujo.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    navegador = next((n for n in NAVEGADORES if n and os.path.exists(n)), None)
    if not navegador:
        sys.exit("No encontré Edge ni Chrome para correr las pruebas.")
    base = (RAIZ / "dist" / "plataforma-sin-conexion.html").read_text(encoding="utf-8")
    pruebas = (RAIZ / "herramientas" / "pruebas-navegador.js").read_text(encoding="utf-8")
    html = base.replace("<head>", "<head>\n<script>window.PB_MODO_PRUEBA = true;</script>", 1)
    html = html.replace("</body>", f"<script>\n{pruebas}\n</script>\n</body>")
    salida_dir = RAIZ / "herramientas" / "salida"
    salida_dir.mkdir(exist_ok=True)
    pagina = salida_dir / "prueba.html"
    pagina.write_text(html, encoding="utf-8")
    perfil = salida_dir / "perfil-navegador"
    cmd = [navegador, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={perfil}",
           "--allow-file-access-from-files", "--virtual-time-budget=900000", "--dump-dom", pagina.as_uri()]
    print("Probando en", Path(navegador).name, "…")
    r = subprocess.run(cmd, capture_output=True, timeout=1200)
    dom = r.stdout.decode("utf-8", errors="replace")
    m = re.search(r'<pre id="resultado-pruebas">(.*?)</pre>', dom, re.S)
    if not m:
        print(dom[-3000:])
        sys.exit("✗ Las pruebas no terminaron (no apareció el resultado).")
    texto = m.group(1).replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'").replace("&amp;", "&")
    res = json.loads(texto)
    for a in res["avisos"]:
        print("  · aviso:", a)
    for f in res["fallos"]:
        print("  ✗", f)
    print(f"Retos: {res['retos']} · casos de prueba: {res['pruebas']} · pantallas: {res['pantallas']} · actividades resueltas: {res['actividades']} · tiempo: {res['tiempo'] / 1000:.1f} s")
    if res["fallos"]:
        sys.exit(f"✗ {len(res['fallos'])} fallo(s).")
    print("✓ Todo bien: el contenido funciona en Skulpt, todas las pantallas se pintan y cada actividad se puede resolver.")


if __name__ == "__main__":
    main()
