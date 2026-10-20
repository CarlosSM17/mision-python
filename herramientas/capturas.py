#!/usr/bin/env python3
"""
capturas.py — Toma capturas de pantalla de la plataforma (para revisar el diseño).

Uso:  python herramientas/capturas.py RUTA ANCHOxALTO [archivo.png] [js-a-ejecutar]
Ej.:  python herramientas/capturas.py "#/m/9/programa/mision/programador" 1280x800
"""
import os
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NAVEGADOR = next(p for p in [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
] if os.path.exists(p))

PREPARAR = """<script>
try {
  var hoy = new Date(); var d = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
  localStorage.setItem('pb:progreso:mision-python', JSON.stringify({version:1, curso:'mision-python',
    alumno:{nombre:'Ana', grupo:'1° A'},
    retos:{'m01-mision':{niveles:{explorador:'2026-10-01', programador:'2026-10-02'}, superado:true}, 'm01-r1':{superado:true, niveles:{programador:'2026-10-01'}}, 'm01-r2':{superado:true, niveles:{programador:'2026-10-01'}}},
    borradores:{}, respuestas:{}, pruebas:{diagnostica:{respuestas:[0,1,2,0,1,2,0,1,2,0], puntaje:4, total:10}}, coevaluaciones:[], insignias:{},
    pasos:{0:{aprende:1,observa:1,juega:1,programa:1,kahoot:1,prueba:1,cierre:1}, 1:{aprende:1,observa:1,juega:1,programa:1,kahoot:1,cierre:1}, 2:{calienta:1,aprende:1,observa:1}},
    ejecuciones:{},
    juego:{xp:1240, c:{retos:5, actividades:7, kahoots:2, exploradores:3}, logros:{'primer-programa':'2026-10-01', 'primer-reto':'2026-10-01', 'primer-kahoot':'2026-10-02'},
      otorgado:{}, racha:{dias:3, mejor:3, ultimo:d}, kahoots:{m1:{mejor:8200, mejorPct:0.89, jugadas:2}}, actividades:{'m01-a1':{completada:true, intentos:1, mejor:1}},
      exploradores:{}, historial:[{xp:150, m:'Misión: Tarjeta de presentación', f:'2026-10-02'}], desafios:{}, animo:{}, sonido:false, avatar:'🦊'}}));
} catch (e) {}
</script>"""


def capturar(ruta, tam, archivo=None, js=""):
    ancho, alto = tam.split("x")
    base = (RAIZ / "dist" / os.environ.get("PB_DIST", "plataforma-sin-conexion.html")).read_text(encoding="utf-8")
    fijar_ruta = f"<script>try {{ location.hash = {ruta!r}; }} catch (e) {{ document.title = 'ERR ' + e; }}</script>"
    if js.startswith("DOCENTE;"):            # modo docente activado desde el inicio
        js = js[len("DOCENTE;"):]
        fijar_ruta += "<script>try { sessionStorage.setItem('pb:docente', '1'); } catch (e) {}</script>"
    preparar = PREPARAR
    if js.startswith("NUEVO;"):              # alumno nuevo (sin progreso): muestra la bienvenida
        js = js[len("NUEVO;"):]
        preparar = "<script>try { localStorage.clear(); } catch (e) {}</script>"
    html = base.replace("<head>", "<head>\n" + preparar + fijar_ruta, 1)
    if js:
        html = html.replace("</body>", f"<script>setTimeout(function(){{ {js} }}, 1500);</script></body>")
    salida = RAIZ / "herramientas" / "salida"
    salida.mkdir(exist_ok=True)
    pagina = salida / "captura.html"
    pagina.write_text(html, encoding="utf-8")
    archivo = Path(archivo) if archivo else salida / f"captura-{ancho}x{alto}.png"
    if not archivo.is_absolute():
        archivo = salida / archivo
    ventana = f"{ancho},{alto}"
    if int(ancho) < 500:
        # El navegador sin ventana no baja de ~500 px de ancho: para ver un celular de verdad
        # cargamos la página dentro de un iframe del ancho pedido.
        marco = salida / "captura-movil.html"
        marco.write_text(f'<!doctype html><html><body style="margin:0;background:#888">'
                         f'<iframe src="{pagina.name}" style="border:0;width:{ancho}px;height:{alto}px;display:block;background:#fff"></iframe></body></html>', encoding="utf-8")
        pagina, ventana = marco, f"600,{alto}"
    cmd = [NAVEGADOR, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={salida / 'perfil-capturas'}",
           "--allow-file-access-from-files", f"--window-size={ventana}", "--virtual-time-budget=8000",
           f"--screenshot={archivo}", pagina.as_uri()]
    subprocess.run(cmd, capture_output=True, timeout=120)
    print(archivo)


if __name__ == "__main__":
    capturar(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None, sys.argv[4] if len(sys.argv) > 4 else "")
