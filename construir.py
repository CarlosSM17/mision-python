#!/usr/bin/env python3
"""
construir.py — Arma la plataforma «Misión Python» en un solo archivo HTML.

Uso:
    python construir.py              valida, prueba todo el contenido con Python y construye
    python construir.py --rapido     construye sin probar el contenido

Genera:
    index.html                           la página que publica GitHub Pages (= plataforma-sin-conexion.html)
                                         y .nojekyll
    dist/plataforma.html                 versión ligera (Blockly y Skulpt desde CDN).
                                         Es la que se pega en Google Sites.
    dist/plataforma-sin-conexion.html    todo incrustado: funciona sin internet una vez
                                         abierta (para alojarla en un servidor o carpeta).
    docs/planes-de-clase.md              planes de clase de las 17 misiones
  y, en la carpeta privada («carpetaPrivada» de configuracion.json, fuera del repositorio):
    soluciones/*.py                      soluciones de referencia de cada reto
    docente/instrumentos-de-evaluacion.md   ponderación, pruebas, lista de cotejo, rúbrica y claves de Kahoot

Qué se prueba con CPython antes de construir:
    · las soluciones de los retos rápidos, misiones (3 niveles) y retos extra contra sus casos de prueba;
    · que el código inicial no pase ya las pruebas;
    · las actividades: «¿Qué imprime?» (la respuesta es la salida real), «Completa» (el código
      completado funciona), «Ordena» (la solución funciona), «Traza» (los valores de la tabla son los
      reales), «Caza el error» (el error ocurre en la línea indicada y la corrección funciona);
    · las preguntas de Kahoot marcadas con «salidaEsRespuesta» y los ejemplos de la teoría.

Para agregar o corregir contenido solo hay que editar los archivos de contenido/ y volver
a ejecutar este script: no hace falta tocar el código de la plataforma.
"""
from __future__ import annotations

import base64
import contextlib
import copy
import io
import json
import random
import re
import sys
import traceback
import unicodedata
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SRC = RAIZ / "src"
CONTENIDO = RAIZ / "contenido"
DIST = RAIZ / "dist"
CACHE = RAIZ / "herramientas" / "vendor" / "cache"

BLOCKLY = "11.2.2"
SKULPT_COMMIT = "96ae75d5e99e29f07a8f819869db87167e233628"   # compilación de skulpt.org, 5-mar-2026
URLS = {
    "blockly": f"https://cdn.jsdelivr.net/npm/blockly@{BLOCKLY}/blockly_compressed.js",
    "blockly_es": f"https://cdn.jsdelivr.net/npm/blockly@{BLOCKLY}/msg/es.js",
    "blockly_sprites": f"https://cdn.jsdelivr.net/npm/blockly@{BLOCKLY}/media/sprites.png",
    "skulpt": f"https://cdn.jsdelivr.net/gh/skulpt/skulpt@{SKULPT_COMMIT}/js/skulpt.min.js",
    "skulpt_stdlib": f"https://cdn.jsdelivr.net/gh/skulpt/skulpt@{SKULPT_COMMIT}/js/skulpt-stdlib.js",
}
MEDIA_BLOCKLY = f"https://cdn.jsdelivr.net/npm/blockly@{BLOCKLY}/media/"

TIPOS_BLOQUE = {
    "py_print", "py_input", "py_convert", "py_comment", "py_assign", "py_augassign", "py_var", "py_number",
    "py_arith", "py_round", "py_compare", "py_logic", "py_not", "py_in", "py_bool", "py_string", "py_fstring",
    "py_len", "py_str_method", "py_if", "py_elif", "py_else", "py_for", "py_while", "py_break", "py_continue",
    "py_pass", "py_range", "py_list", "py_index", "py_index_set", "py_append", "py_func1", "py_import",
    "py_randint", "py_choice", "py_def", "py_return", "py_call", "py_call_stmt", "py_kwarg", "py_method_call",
    "py_expr_stmt", "py_raw_stmt", "py_raw_expr", "py_raw_block", "py_hueco",
}
TIPOS_TARJETA = {"portada", "idea", "ilustracion", "explorador", "animacion", "codigo", "comparar", "pregunta", "tabla", "pasos", "bloques"}
ILUSTRACIONES = {"computadora", "consola", "caja", "tipos", "operadores", "maquina-io", "tren-texto", "balanza", "camino-if", "escalera-elif",
                 "pista-for", "ciclo-while", "estante-lista", "maquina-funcion", "error"}
EXPLORADORES = {"print", "variables", "tipos", "operadores", "texto", "comparar", "logica", "si", "elif", "range", "while", "listas", "recorrer", "funciones", "input"}
ANIMACIONES = {"variables", "decision", "bucle", "mientras", "lista", "funcion"}
CAMPOS_ACTIVIDAD = {
    "ordenar": ["lineas"], "error": ["codigo", "tipoError"], "completar": ["codigo"], "clasificar": ["categorias", "elementos"],
    "relacionar": ["pares"], "salida": ["codigo", "respuesta"], "traza": ["codigo", "variables", "filas"], "vf": ["afirmaciones"],
    "memorama": ["pares"], "teclear": ["lineas"],
}
ERRORES_PYTHON = {"SyntaxError", "NameError", "TypeError", "IndentationError", "ValueError", "IndexError", "ZeroDivisionError", "logico"}
MODULOS_BASE = ["random", "math", "time"]
NIVELES = ("explorador", "programador", "maestro")


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def leer_json(ruta: Path):
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"✗ Error de formato en {ruta.relative_to(RAIZ)}: línea {e.lineno}, columna {e.colno}: {e.msg}")


ARCHIVOS_CACHE = {
    "blockly": f"blockly-{BLOCKLY}.js",
    "blockly_es": f"blockly-{BLOCKLY}-es.js",
    "blockly_sprites": f"blockly-{BLOCKLY}-sprites.png",
    "skulpt": f"skulpt-{SKULPT_COMMIT[:7]}.min.js",
    "skulpt_stdlib": f"skulpt-{SKULPT_COMMIT[:7]}-stdlib.js",
}


def descargar(nombre: str, binario: bool = False):
    """Descarga (una sola vez) las librerías de versión fija y las guarda en caché."""
    CACHE.mkdir(parents=True, exist_ok=True)
    destino = CACHE / ARCHIVOS_CACHE[nombre]
    if not destino.exists():
        print(f"  descargando {URLS[nombre]}")
        with urllib.request.urlopen(URLS[nombre], timeout=60) as r:
            destino.write_bytes(r.read())
    return destino.read_bytes() if binario else destino.read_text(encoding="utf-8")


def normalizar(s: str) -> str:
    """Igual que PB.util.normalizar (JS): sin acentos, minúsculas, espacios compactos."""
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("¡", "").replace("¿", "").lower()
    s = re.sub(r"[ \t]+", " ", s)
    s = "\n".join(l.strip() for l in s.split("\n"))
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()


def exacta(s) -> str:
    """Comparación estricta (respeta mayúsculas); solo ignora espacios al final de cada renglón."""
    return "\n".join(l.rstrip() for l in str(s).strip("\n").split("\n")).strip()


def limpio(s) -> str:
    """Igual que la comparación de la actividad «Traza» (JS)."""
    s = str(s).replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    return re.sub(r"\s+", "", s).replace("'", '"').replace('"', "").lower()


def sin_huecos(codigo: str) -> str:
    return re.sub(r"«([^»]*)»", lambda m: m.group(1) or "___", codigo)


def html_a_texto(h: str) -> str:
    t = re.sub(r"<br\s*/?>", "\n", h or "")
    t = re.sub(r"</?(b|strong)>", "**", t)
    t = re.sub(r"</?(i|em)>", "*", t)
    t = re.sub(r"</?code>", "`", t)
    t = re.sub(r"<[^>]+>", "", t)
    return t.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").strip()


def letra(i: int) -> str:
    return chr(65 + i)


# ---------------------------------------------------------------------------
# Contenido
# ---------------------------------------------------------------------------
def cargar_contenido():
    config = leer_json(RAIZ / "configuracion.json")
    unidades = leer_json(CONTENIDO / "unidades.json")
    prueba = leer_json(CONTENIDO / "prueba-lectura.json")
    sesiones = [leer_json(p) for p in sorted(CONTENIDO.glob("sesion-*.json"))]
    sesiones.sort(key=lambda s: s.get("numero", 0))
    return {"config": config, "unidades": unidades, "prueba": prueba, "sesiones": sesiones}


def retos_de(sesion):
    """Todos los retos verificables de una misión: (tipo, reto, nivel)."""
    for r in sesion.get("retos", []):
        yield "reto", r, None
    m = sesion.get("mision")
    if m:
        for n in NIVELES:
            if n in m.get("niveles", {}):
                yield "mision", m, n
    if sesion.get("extra"):
        yield "extra", sesion["extra"], None
    if sesion.get("proyecto"):
        yield "proyecto", sesion["proyecto"], None


def config_reto(reto, nivel):
    n = (reto.get("niveles") or {}).get(nivel) or {}
    return {
        "pruebas": n.get("pruebas") or reto.get("pruebas") or [],
        "requiere": list(reto.get("requiere", [])) + list(n.get("requiere", [])),
        "prohibe": list(reto.get("prohibe", [])) + list(n.get("prohibe", [])),
        "solucion": n.get("solucion") or reto.get("solucion"),
        "inicio": n["inicio"] if "inicio" in n else reto.get("inicio", ""),
    }


def preguntas_con_opciones(s):
    """(dónde, pregunta) de todas las preguntas de opción múltiple de una misión."""
    for i, q in enumerate((s.get("kahoot") or {}).get("preguntas", [])):
        yield f"kahoot {i + 1}", q
    for i, t in enumerate(s.get("teoria", [])):
        if t.get("tipo") == "pregunta":
            yield f"tarjeta {i + 1}", t
    pred = (s.get("ejemplo") or {}).get("prediccion")
    if pred:
        yield "predicción del ejemplo", pred


def validar(c):
    errores, avisos = [], []
    ids = set()
    numeros = set()
    for s in c["sesiones"]:
        num = s.get("numero")
        donde = f"misión {num}"
        for campo in ("numero", "titulo", "unidad", "modo", "icono"):
            if campo not in s:
                errores.append(f"{donde}: falta el campo «{campo}»")
        if num in numeros:
            errores.append(f"{donde}: número de misión repetido")
        numeros.add(num)
        if not any(u["numero"] == s.get("unidad") for u in c["unidades"]):
            errores.append(f"{donde}: el mundo (unidad) {s.get('unidad')} no existe en unidades.json")
        # Retos
        for tipo, reto, nivel in retos_de(s):
            rid = reto.get("id")
            if not rid:
                errores.append(f"{donde}: un {tipo} no tiene «id»")
                continue
            if nivel in (None, "explorador"):
                if rid in ids:
                    errores.append(f"{donde}: id repetido «{rid}»")
                ids.add(rid)
            for b in reto.get("bloques") or []:
                if b not in TIPOS_BLOQUE:
                    errores.append(f"{donde} · {rid}: tipo de bloque desconocido «{b}»")
            cfg = config_reto(reto, nivel)
            if tipo in ("reto", "mision") and not cfg["pruebas"] and not reto.get("sinPruebas") and not cfg["requiere"]:
                avisos.append(f"{donde} · {rid}{' · ' + nivel if nivel else ''}: no tiene pruebas ni requisitos")
            for i, p in enumerate(cfg["pruebas"]):
                if not any(k in p for k in ("contiene", "exacto", "no_contiene", "lineasMin")):
                    errores.append(f"{donde} · {rid}: la prueba {i + 1} no dice qué debe aparecer")
            if tipo != "proyecto" and not cfg["solucion"] and (cfg["pruebas"] or cfg["requiere"]):
                avisos.append(f"{donde} · {rid}{' · ' + nivel if nivel else ''}: no tiene solución de referencia")
        if s.get("proyecto") and not s["proyecto"].get("opciones"):
            errores.append(f"{donde}: el proyecto no tiene «opciones»")
        # Teoría
        for i, t in enumerate(s.get("teoria", [])):
            tt = t.get("tipo")
            if tt not in TIPOS_TARJETA:
                errores.append(f"{donde} · tarjeta {i + 1}: tipo desconocido «{tt}»")
            elif tt == "ilustracion" and t.get("nombre") not in ILUSTRACIONES:
                errores.append(f"{donde} · tarjeta {i + 1}: ilustración desconocida «{t.get('nombre')}»")
            elif tt == "explorador" and t.get("nombre") not in EXPLORADORES:
                errores.append(f"{donde} · tarjeta {i + 1}: explorador desconocido «{t.get('nombre')}»")
            elif tt == "animacion" and t.get("animacion") not in ANIMACIONES:
                errores.append(f"{donde} · tarjeta {i + 1}: animación desconocida «{t.get('animacion')}»")
        # Preguntas de opción múltiple
        for lugar, q in preguntas_con_opciones(s):
            n = len(q.get("opciones", []))
            if not 2 <= n <= 4:
                errores.append(f"{donde} · {lugar}: debe tener de 2 a 4 opciones (tiene {n})")
            if not (0 <= q.get("correcta", -1) < n):
                errores.append(f"{donde} · {lugar}: la respuesta correcta está fuera de rango")
            if len(set(exacta(o) for o in q.get("opciones", []))) < n:
                errores.append(f"{donde} · {lugar}: hay opciones repetidas")
        k = s.get("kahoot")
        if k is not None and not k.get("preguntas") and not k.get("aleatorio"):
            errores.append(f"{donde}: el kahoot necesita «preguntas» o «aleatorio»")
        if s.get("prueba") not in (None, "diagnostica", "final"):
            errores.append(f"{donde}: «prueba» debe ser diagnostica o final")
        # Actividades
        for a in s.get("actividades", []):
            aid = a.get("id", "?")
            if aid in ids:
                errores.append(f"{donde}: id repetido «{aid}»")
            ids.add(aid)
            tipo = a.get("tipo")
            if tipo not in CAMPOS_ACTIVIDAD:
                errores.append(f"{donde} · {aid}: tipo de actividad desconocido «{tipo}»")
                continue
            for campo in ["titulo"] + CAMPOS_ACTIVIDAD[tipo]:
                if campo not in a:
                    errores.append(f"{donde} · {aid}: falta «{campo}»")
            if tipo == "error":
                if a.get("tipoError") not in ERRORES_PYTHON:
                    errores.append(f"{donde} · {aid}: tipoError desconocido «{a.get('tipoError')}»")
                total = len(a.get("codigo", "").split("\n"))
                for ln in a.get("lineas") or [a.get("linea")]:
                    if not isinstance(ln, int) or not 1 <= ln <= total:
                        errores.append(f"{donde} · {aid}: la línea del error {ln} no existe")
            if tipo == "completar":
                huecos = re.findall(r"⟦([^⟧]*)⟧", a.get("codigo", ""))
                if not huecos:
                    errores.append(f"{donde} · {aid}: el código no tiene huecos ⟦…⟧")
                if a.get("opciones"):
                    for h in huecos:
                        if not set(h.split("|")) & set(a["opciones"]):
                            avisos.append(f"{donde} · {aid}: la respuesta del hueco «{h}» no está en el banco de piezas")
            if tipo == "clasificar":
                cats = {x["id"] for x in a.get("categorias", [])}
                for e in a.get("elementos", []):
                    if e.get("cat") not in cats:
                        errores.append(f"{donde} · {aid}: «{e.get('texto')}» tiene una categoría que no existe")
            if tipo == "salida" and "opciones" in a and not (0 <= a.get("correcta", -1) < len(a["opciones"])):
                errores.append(f"{donde} · {aid}: la opción correcta está fuera de rango")
            if tipo in ("relacionar", "memorama"):
                for lado in (0, 1):
                    textos = [exacta(p[lado]) for p in a.get("pares", [])]
                    if len(set(textos)) < len(textos):
                        errores.append(f"{donde} · {aid}: hay elementos repetidos en las parejas")
            if tipo == "traza":
                total = len(a.get("codigo", "").split("\n"))
                for f in a.get("filas", []):
                    if not 1 <= f.get("linea", 0) <= total:
                        errores.append(f"{donde} · {aid}: la fila de la línea {f.get('linea')} no existe")
    for i, it in enumerate(c["prueba"].get("items", [])):
        if not (0 <= it.get("correcta", -1) < len(it.get("opciones", []))):
            errores.append(f"prueba de lectura, reactivo {i + 1}: respuesta correcta fuera de rango")
    return errores, avisos


# ---------------------------------------------------------------------------
# Ejecución con Python (CPython)
# ---------------------------------------------------------------------------
class SinEntradas(Exception):
    pass


class BucleInfinito(Exception):
    pass


MAX_LINEAS = 200_000


@contextlib.contextmanager
def entorno_controlado(entradas, azar):
    """input() con respuestas fijas, random predecible y freno para bucles infinitos."""
    pendientes = [str(e) for e in entradas or []]
    cola = list(azar or [])

    def falso_input(prompt=""):
        # Como en la plataforma: las pruebas revisan solo lo que se imprime con print
        if not pendientes:
            raise SinEntradas()
        return pendientes.pop(0)

    originales = (random.randint, random.choice, random.shuffle)
    random.randint = lambda a, b: cola.pop(0) if cola else a
    random.choice = lambda s: cola.pop(0) if cola else s[0]
    random.shuffle = lambda s: None
    try:
        yield falso_input
    finally:
        random.randint, random.choice, random.shuffle = originales


def ejecutar_cpython(codigo: str, entradas=(), azar=(), archivo="<solucion>"):
    """Ejecuta el código. Devuelve (salida, error, tipo_error, linea_error)."""
    salida = io.StringIO()
    contador = [0]

    def freno(frame, evento, arg):
        if frame.f_code.co_filename != archivo:
            return None
        if evento == "line":
            contador[0] += 1
            if contador[0] > MAX_LINEAS:
                raise BucleInfinito()
        return freno

    error = tipo = linea = None
    with entorno_controlado(entradas, azar) as falso_input:
        ambiente = {"__name__": "__main__", "input": falso_input}
        try:
            compilado = compile(codigo, archivo, "exec")
            sys.settrace(freno)
            with contextlib.redirect_stdout(salida):
                exec(compilado, ambiente)
        except SinEntradas:
            error = "pidió más datos de los que trae la prueba"
        except BucleInfinito:
            error = "parece un bucle infinito"
        except SyntaxError as e:
            error, tipo, linea = f"{type(e).__name__}: {e.msg}", type(e).__name__, e.lineno
        except Exception as e:  # noqa: BLE001
            tipo = type(e).__name__
            error = f"{tipo}: {e}"
            marcos = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == archivo]
            linea = marcos[-1].lineno if marcos else None
        finally:
            sys.settrace(None)
    return salida.getvalue(), error, tipo, linea


def trazar(codigo: str, entradas=(), azar=()):
    """Ejecuta el código y devuelve la lista de (línea, variables después de ejecutarla)."""
    eventos = []
    previa = [None]
    archivo = "<traza>"

    def foto(f):
        r = {}
        for k, v in f.f_locals.items():
            if k.startswith("__") or k == "input" or callable(v) or type(v).__name__ == "module":
                continue
            r[k] = copy.deepcopy(v)
        return r

    def rastreo(frame, evento, arg):
        if frame.f_code.co_filename != archivo or frame.f_code.co_name != "<module>":
            return None
        if evento in ("line", "return"):
            if previa[0] is not None:
                eventos.append((previa[0], foto(frame)))
            previa[0] = frame.f_lineno if evento == "line" else None
            if len(eventos) > MAX_LINEAS:
                raise BucleInfinito()
        return rastreo

    with entorno_controlado(entradas, azar) as falso_input:
        ambiente = {"__name__": "__main__", "input": falso_input}
        compilado = compile(codigo, archivo, "exec")
        sys.settrace(rastreo)
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compilado, ambiente)
        finally:
            sys.settrace(None)
    return eventos


def como_texto(v):
    return v if isinstance(v, str) else repr(v)


def comparar(salida: str, prueba) -> list[str]:
    obtenida = normalizar(salida)
    fallos = []
    if prueba.get("exacto") is not None and obtenida != normalizar(prueba["exacto"]):
        fallos.append("la salida no es exactamente la esperada")
    desde = 0
    for frag in prueba.get("contiene", []):
        f = normalizar(frag)
        pos = obtenida.find(f, desde)
        if pos < 0:
            fallos.append(f"falta «{frag}»")
            break
        desde = pos + len(f)
    for frag in prueba.get("no_contiene", []):
        if normalizar(frag) in obtenida:
            fallos.append(f"sobra «{frag}»")
    if prueba.get("lineasMin"):
        n = len([l for l in obtenida.split("\n") if l.strip()]) if obtenida else 0
        if n < prueba["lineasMin"]:
            fallos.append(f"muestra {n} renglones y se piden al menos {prueba['lineasMin']}")
    return fallos


def compila(codigo: str) -> str | None:
    try:
        compile(codigo, "<contenido>", "exec")
        return None
    except SyntaxError as e:
        return f"SyntaxError en la línea {e.lineno}: {e.msg}"


def probar_retos(s, problemas):
    total = 0
    for tipo, reto, nivel in retos_de(s):
        cfg = config_reto(reto, nivel)
        etiqueta = f"misión {s['numero']} · {reto['id']}{' · ' + nivel if nivel else ''}"
        if tipo == "proyecto":
            for op in reto.get("opciones", []):
                for k in ("solucion", "inicio"):
                    if op.get(k) and (e := compila(op[k])):
                        problemas.append(f"{etiqueta} · {op['id']} · {k}: {e}")
                if op.get("solucion") and op.get("entradasPrueba"):
                    total += 1
                    _, error, _, _ = ejecutar_cpython(op["solucion"], op["entradasPrueba"], op.get("azarPrueba", []))
                    if error:
                        problemas.append(f"{etiqueta} · {op['id']}: el ejemplo falla: {error}")
            continue
        sol = cfg["solucion"]
        if not sol:
            continue
        if e := compila(sol):
            problemas.append(f"{etiqueta}: la solución tiene {e}")
            continue
        for i, p in enumerate(cfg["pruebas"]):
            total += 1
            salida, error, _, _ = ejecutar_cpython(sol, p.get("entradas", []), p.get("azar", []))
            if error:
                problemas.append(f"{etiqueta} · prueba {i + 1}: {error}")
                continue
            fallos = comparar(salida, p)
            if fallos:
                problemas.append(f"{etiqueta} · prueba {i + 1}: {', '.join(fallos)}\n      salida: {salida[:300]!r}")
        # El código inicial no debería pasar ya las pruebas (si las tiene)
        inicio = sin_huecos(cfg["inicio"] or "")
        if cfg["pruebas"] and inicio.strip() and "___" not in inicio:
            pasa = True
            for p in cfg["pruebas"]:
                salida, error, _, _ = ejecutar_cpython(inicio, p.get("entradas", []), p.get("azar", []))
                if error or comparar(salida, p):
                    pasa = False
                    break
            if pasa and not cfg["requiere"]:
                problemas.append(f"{etiqueta}: ¡el código inicial ya pasa todas las pruebas!")
    return total


def probar_actividad(s, a, problemas):
    et = f"misión {s['numero']} · {a['id']} ({a['tipo']})"
    tipo = a["tipo"]
    ent, azar = a.get("entradas", []), a.get("azar", [])
    corre = a.get("ejecutable", True) is not False
    if tipo == "salida":
        salida, error, _, _ = ejecutar_cpython(a["codigo"], ent, azar)
        if error:
            problemas.append(f"{et}: el código falla: {error}")
        elif exacta(salida) != exacta(a["respuesta"]):
            problemas.append(f"{et}: la respuesta no es la salida real.\n      real: {salida!r}\n      dice: {a['respuesta']!r}")
        if "opciones" in a:
            buenas = [i for i, o in enumerate(a["opciones"]) if exacta(o) == exacta(a["respuesta"])]
            if buenas != [a["correcta"]]:
                problemas.append(f"{et}: la opción correcta no coincide con la respuesta (o hay dos iguales)")
    elif tipo == "completar":
        codigo = re.sub(r"⟦([^⟧]*)⟧", lambda m: m.group(1).split("|")[0], a["codigo"])
        if e := compila(codigo):
            problemas.append(f"{et}: el código completado tiene {e}")
        elif corre:
            _, error, _, _ = ejecutar_cpython(codigo, ent, azar)
            if error:
                problemas.append(f"{et}: el código completado falla: {error}")
    elif tipo == "ordenar":
        for k, lineas in enumerate([a["lineas"]] + a.get("alternativas", [])):
            codigo = "\n".join(lineas)
            if e := compila(codigo):
                problemas.append(f"{et}: la solución {k + 1} tiene {e}")
            elif corre:
                _, error, _, _ = ejecutar_cpython(codigo, ent, azar)
                if error:
                    problemas.append(f"{et}: la solución {k + 1} falla: {error}")
        for d in a.get("distractores", []):
            if d.strip() in [l.strip() for l in a["lineas"]]:
                problemas.append(f"{et}: el distractor «{d}» también está en la solución")
    elif tipo == "traza":
        try:
            eventos = trazar(a["codigo"], ent, azar)
        except Exception as e:  # noqa: BLE001
            problemas.append(f"{et}: el código falla: {type(e).__name__}: {e}")
            return
        k = 0
        for f in a["filas"]:
            while k < len(eventos) and eventos[k][0] != f["linea"]:
                k += 1
            if k >= len(eventos):
                problemas.append(f"{et}: la línea {f['linea']} no se ejecuta (o no en ese orden)")
                return
            variables = eventos[k][1]
            for v, esperado in f["valores"].items():
                if esperado in ("", None):
                    if v in variables:
                        problemas.append(f"{et}: después de la línea {f['linea']}, «{v}» ya existe (vale {como_texto(variables[v])!r}) pero la tabla dice «—»")
                elif v not in variables:
                    problemas.append(f"{et}: después de la línea {f['linea']}, «{v}» todavía no existe")
                elif limpio(como_texto(variables[v])) != limpio(esperado):
                    problemas.append(f"{et}: después de la línea {f['linea']}, «{v}» vale {como_texto(variables[v])!r}, no {esperado!r}")
            k += 1
    elif tipo == "error":
        lineas_ok = set(a.get("lineas") or [a.get("linea")])
        if a.get("lineaError"):
            lineas_ok.add(a["lineaError"])
        te = a["tipoError"]
        if te == "logico":
            if e := compila(a["codigo"]):
                problemas.append(f"{et}: un error lógico no debería tener {e}")
            elif corre:
                _, error, _, _ = ejecutar_cpython(a["codigo"], ent, azar)
                if error:
                    problemas.append(f"{et}: un error lógico no debería fallar al ejecutarse: {error}")
        else:
            _, error, tipo_real, linea = ejecutar_cpython(a["codigo"], ent, azar, archivo="<actividad>")
            if tipo_real != te:
                problemas.append(f"{et}: se esperaba {te} y Python da {error or 'ningún error'}")
            elif linea not in lineas_ok:
                problemas.append(f"{et}: Python marca el error en la línea {linea}, no en {sorted(lineas_ok)}")
        corr = a.get("correccion", "")
        if corr and not corr.strip().startswith("#"):
            lineas = a["codigo"].split("\n")
            n = (a.get("lineas") or [a.get("linea")])[0]
            sangria = re.match(r"\s*", lineas[n - 1]).group(0)
            lineas[n - 1] = corr if corr.startswith(" ") else sangria + corr
            corregido = "\n".join(lineas)
            if e := compila(corregido):
                problemas.append(f"{et}: el código corregido tiene {e}")
            elif corre:
                _, error, _, _ = ejecutar_cpython(corregido, ent, azar)
                if error:
                    problemas.append(f"{et}: el código corregido falla: {error}")


def probar_kahoot_y_teoria(s, problemas):
    total = 0
    for i, q in enumerate((s.get("kahoot") or {}).get("preguntas", [])):
        et = f"misión {s['numero']} · kahoot {i + 1}"
        if q.get("codigo") and (e := compila(q["codigo"])) and "falta" not in normalizar(q["pregunta"]) and "le falta" not in normalizar(q["pregunta"]):
            if not any(x in normalizar(q["pregunta"]) for x in ("error", "problema")):
                problemas.append(f"{et}: el código tiene {e}")
        if q.get("salidaEsRespuesta"):
            total += 1
            salida, error, _, _ = ejecutar_cpython(q["codigo"], q.get("entradas", []), q.get("azar", []))
            if error:
                problemas.append(f"{et}: el código falla: {error}")
                continue
            buenas = [j for j, o in enumerate(q["opciones"]) if exacta(html_a_texto(o)) == exacta(salida)]
            if buenas != [q["correcta"]]:
                problemas.append(f"{et}: la salida real {salida!r} no coincide (solo) con la opción correcta {q['opciones'][q['correcta']]!r}")
    for i, t in enumerate(s.get("teoria", [])):
        et = f"misión {s['numero']} · tarjeta {i + 1} ({t['tipo']})"
        cods = []
        if t["tipo"] in ("idea", "codigo", "ilustracion", "bloques") and t.get("codigo"):
            cods.append(t["codigo"])
        if t["tipo"] == "comparar" and t["bien"].get("codigo"):
            cods.append(t["bien"]["codigo"])
        for cod in cods:
            if e := compila(cod):
                problemas.append(f"{et}: el código tiene {e}")
        salida_esperada = None
        if t["tipo"] == "idea" and t.get("codigo") and t.get("salida") is not None:
            cod, salida_esperada = t["codigo"], t["salida"]
        if t["tipo"] == "ilustracion" and t.get("nombre") == "consola":
            cod, salida_esperada = t["datos"]["codigo"], t["datos"]["salida"]
        if salida_esperada is not None:
            total += 1
            salida, error, _, _ = ejecutar_cpython(cod)
            if error:
                problemas.append(f"{et}: el código falla: {error}")
            elif exacta(salida) != exacta(salida_esperada):
                problemas.append(f"{et}: la salida mostrada no es la real.\n      real: {salida!r}\n      dice: {salida_esperada!r}")
    for r in s.get("resumen", []):
        if r.get("codigo") and (e := compila(r["codigo"])):
            problemas.append(f"misión {s['numero']} · resumen: el código tiene {e}")
    ej = s.get("ejemplo")
    if ej and ej.get("codigo") and (e := compila(ej["codigo"])):
        problemas.append(f"misión {s['numero']} · ejemplo: {e}")
    return total


def probar_contenido(c):
    problemas = []
    totales = {"pruebas": 0, "actividades": 0, "kahoot": 0}
    for s in c["sesiones"]:
        totales["pruebas"] += probar_retos(s, problemas)
        for a in s.get("actividades", []):
            probar_actividad(s, a, problemas)
            totales["actividades"] += 1
        totales["kahoot"] += probar_kahoot_y_teoria(s, problemas)
    return problemas, totales


# ---------------------------------------------------------------------------
# Construcción
# ---------------------------------------------------------------------------
def mini_stdlib() -> str:
    """Solo los módulos de Skulpt que usa el curso (random y sus dependencias)."""
    texto = descargar("skulpt_stdlib")
    datos = json.loads(texto[texto.index("{"): texto.rindex("}") + 1])
    archivos = datos["files"]
    elegidos = {"src/builtin/sys.js": archivos["src/builtin/sys.js"]}   # Skulpt siempre lo carga
    pendientes = list(MODULOS_BASE)
    vistos = set()
    while pendientes:
        m = pendientes.pop()
        if m in vistos:
            continue
        vistos.add(m)
        for clave in (f"src/builtin/{m}.js", f"src/lib/{m}.py", f"src/lib/{m}.js", f"src/lib/{m}/__init__.py", f"src/lib/{m}/__init__.js"):
            if clave in archivos and clave not in elegidos:
                elegidos[clave] = archivos[clave]
                if clave.endswith(".py"):
                    for a, b in re.findall(r"^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", archivos[clave], re.M):
                        pendientes.append((a or b).split(".")[0])
    return "window.PB_STDLIB = " + json.dumps({"files": elegidos}, ensure_ascii=False) + ";"


def seguro_en_script(js: str) -> str:
    return js.replace("</script", "<\\/script").replace("<!--", "<\\!--")


def json_para_html(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def metadatos(config) -> str:
    """Descripción, ícono, ajustes para iPad y vista previa al compartir el enlace."""
    from urllib.parse import quote
    nombre = config.get("nombreCurso", "Misión Python")
    desc = config.get("descripcion") or config.get("lema") or nombre
    svg = re.sub(r"\s+", " ", (SRC / "icono.svg").read_text(encoding="utf-8")).strip()
    esc = lambda s: str(s).replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
    m = [f'<meta name="description" content="{esc(desc)}">',
         f'<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,{quote(svg, safe=" =:/,()")}">',
         '<meta name="theme-color" content="#4F46E5">',
         '<meta name="mobile-web-app-capable" content="yes">',
         '<meta name="apple-mobile-web-app-capable" content="yes">',
         f'<meta name="apple-mobile-web-app-title" content="{esc(nombre)}">']
    url = (config.get("urlPublica") or "").strip()
    if url:
        url = url.rstrip("/") + "/"
        m += [f'<link rel="apple-touch-icon" href="{esc(url)}icono-180.png">',
              '<meta property="og:type" content="website">', '<meta property="og:locale" content="es_MX">',
              f'<meta property="og:title" content="{esc(nombre)}">', f'<meta property="og:description" content="{esc(desc)}">',
              f'<meta property="og:url" content="{esc(url)}">', f'<meta property="og:image" content="{esc(url)}docs/capturas/mapa.png">',
              '<meta name="twitter:card" content="summary_large_image">']
    return "\n".join(m)


def construir(c, sin_conexion: bool) -> str:
    plantilla = (SRC / "plantilla.html").read_text(encoding="utf-8")
    css = "\n".join((SRC / n).read_text(encoding="utf-8") for n in ("estilos.css", "juego.css"))
    app = "\n;\n".join(p.read_text(encoding="utf-8") for p in sorted((SRC / "js").glob("*.js")))
    config = dict(c["config"])
    config.setdefault("rutaMediaBlockly", MEDIA_BLOCKLY)
    datos = {"config": config, "unidades": c["unidades"], "prueba": c["prueba"], "sesiones": c["sesiones"]}
    scripts_datos = [f"window.PB_DATOS = {json_para_html(datos)};", mini_stdlib()]
    if sin_conexion:
        sprites = base64.b64encode(descargar("blockly_sprites", binario=True)).decode()
        scripts_datos.append(f'window.PB_SPRITES_BLOCKLY = "data:image/png;base64,{sprites}";')
        librerias = "\n".join(f"<script>\n{seguro_en_script(descargar(n))}\n</script>" for n in ("blockly", "blockly_es", "skulpt"))
    else:
        librerias = "\n".join(f'<script src="{URLS[n]}"></script>' for n in ("blockly", "blockly_es", "skulpt"))
    html = plantilla
    html = html.replace("/*@@TITULO@@*/", config.get("nombreCurso", "Misión Python"))
    html = html.replace("<!--@@META@@-->", metadatos(config))
    html = html.replace("/*@@CSS@@*/", css)
    html = html.replace("<!--@@LIBRERIAS@@-->", librerias)
    html = html.replace("<!--@@DATOS@@-->", "\n".join(f"<script>{seguro_en_script(s)}</script>" for s in scripts_datos))
    html = html.replace("/*@@APP@@*/", seguro_en_script(app))
    return html


NOMBRE_TIPO = {"reto": "Reto rápido", "mision": "Misión", "extra": "Reto extra", "proyecto": "Proyecto"}


def carpeta_privada() -> Path | None:
    """Carpeta para el material solo docente (soluciones y claves), fuera del repositorio público."""
    ruta = leer_json(RAIZ / "configuracion.json").get("carpetaPrivada")
    return (RAIZ / ruta).resolve() if ruta else None


def carpeta_soluciones() -> Path:
    return (carpeta_privada() or RAIZ) / "soluciones"


def destino_instrumentos() -> Path:
    priv = carpeta_privada()
    return priv / "docente" / "instrumentos-de-evaluacion.md" if priv else RAIZ / "docs" / "instrumentos-de-evaluacion.md"


def ruta_bonita(p: Path) -> str:
    for base, prefijo in ((RAIZ, ""), (RAIZ.parent, "../")):
        try:
            return prefijo + p.relative_to(base).as_posix()
        except ValueError:
            pass
    return str(p)


def publicar_pagina(html: str):
    """index.html en la raíz (lo que sirve GitHub Pages) y .nojekyll para que publique los archivos tal cual."""
    for f in RAIZ.iterdir():   # en Windows «Index.html» y «index.html» son el mismo archivo para el sistema, no para GitHub
        if f.is_file() and f.name.lower() == "index.html" and f.name != "index.html":
            f.unlink()
    (RAIZ / "index.html").write_text(html, encoding="utf-8")
    (RAIZ / ".nojekyll").touch()


def limpiar_copias_publicas():
    """Si hay carpeta privada, quita las copias viejas de soluciones y claves que quedaron dentro del proyecto."""
    if not carpeta_privada():
        return
    viejas = [RAIZ / "soluciones", RAIZ / "docs" / "instrumentos-de-evaluacion.md"]
    for v in viejas:
        if v.is_dir():
            for f in v.glob("*.py"):
                f.unlink()
            if not any(v.iterdir()):
                v.rmdir()
        elif v.is_file():
            v.unlink()


def generar_soluciones(c):
    carpeta = carpeta_soluciones()
    carpeta.mkdir(parents=True, exist_ok=True)
    for viejo in carpeta.glob("*.py"):
        viejo.unlink()
    n = 0
    for s in c["sesiones"]:
        for tipo, reto, nivel in retos_de(s):
            if tipo == "proyecto":
                for op in reto.get("opciones", []):
                    if op.get("solucion"):
                        nombre = f"mision-{s['numero']:02d}-{reto['id']}-{op['id']}.py"
                        (carpeta / nombre).write_text(f"# Misión {s['numero']} · {reto['titulo']} · {op['titulo']}\n# Ejemplo de proyecto que cumple los requisitos mínimos.\n\n{op['solucion'].rstrip()}\n", encoding="utf-8")
                        n += 1
                continue
            cfg = config_reto(reto, nivel)
            if not cfg["solucion"]:
                continue
            sufijo = f"-{nivel}" if nivel else ""
            nombre = f"mision-{s['numero']:02d}-{reto['id']}{sufijo}.py"
            encabezado = f"# Misión {s['numero']} · {NOMBRE_TIPO[tipo]}: {reto.get('titulo', '')}{' · nivel ' + nivel if nivel else ''}\n# Solución de referencia (hay muchas soluciones correctas).\n\n"
            (carpeta / nombre).write_text(encabezado + cfg["solucion"].rstrip() + "\n", encoding="utf-8")
            n += 1
    return n


TIPOS_ACT = {"ordenar": "Ordena el código", "error": "Caza el error", "completar": "Completa el código", "clasificar": "Clasifica", "relacionar": "Relaciona",
             "salida": "¿Qué imprime?", "traza": "Traza las variables", "vf": "Verdadero o falso", "memorama": "Memorama", "teclear": "Mecanografía Python"}


def generar_planes(c):
    L = ["# Planes de clase", "",
         "Cada misión está pensada para una sesión de 60 minutos con cinco momentos: activación (5 min), ejemplo en vivo (10 min),",
         "práctica con juegos (15 min), programación (20 min) y Kahoot y cierre (10 min). En la plataforma, los pasos de cada misión son:",
         "**Calienta → Aprende → Observa → Juega → Programa → Kahoot → Cierre**.", "",
         "> Este archivo se genera automáticamente con `python construir.py` a partir de `contenido/`.", ""]
    nombres = {"activacion": "Activación", "ejemplo": "Ejemplo en vivo", "practica": "Práctica con juegos", "reto": "Programación", "cierre": "Kahoot y cierre"}
    minutos = {"activacion": 5, "ejemplo": 10, "practica": 15, "reto": 20, "cierre": 10}
    for s in c["sesiones"]:
        u = next((u for u in c["unidades"] if u["numero"] == s["unidad"]), {"nombre": ""})
        L.append(f"## Misión {s['numero']}. {s['icono']} {s['titulo']}")
        L.append("")
        L.append(f"**Mundo:** {u['nombre']} · **Python:** {', '.join('`' + x + '`' for x in s.get('python', [])) or '—'}")
        L.append("")
        if s.get("objetivos"):
            L.append("**Objetivos:**")
            L.extend(f"- {html_a_texto(o)}" for o in s["objetivos"])
            L.append("")
        plan = s.get("plan") or {}
        for k in ("activacion", "ejemplo", "practica", "reto", "cierre"):
            if plan.get(k):
                m = (plan.get("minutos") or {}).get(k, minutos[k])
                L.append(f"1. **{nombres[k]} ({m} min):** {html_a_texto(plan[k])}")
        if plan.get("notas"):
            L.append("")
            L.append(f"*Notas:* {html_a_texto(plan['notas'])}")
        L.append("")
        L.append("**En la plataforma:**")
        L.append("")
        L.append(f"- Teoría: {len(s.get('teoria', []))} tarjetas.")
        if s.get("actividades"):
            L.append("- Juegos: " + "; ".join(f"{TIPOS_ACT[a['tipo']]} «{a['titulo']}»" for a in s["actividades"]) + ".")
        if s.get("retos"):
            L.append("- Retos rápidos: " + "; ".join(r["titulo"] for r in s["retos"]) + ".")
        if s.get("mision"):
            L.append(f"- Misión (3 niveles): {s['mision']['titulo']}.")
        if s.get("extra"):
            L.append(f"- Reto extra (opcional): {s['extra']['titulo']}.")
        if s.get("proyecto"):
            L.append(f"- Proyecto: {s['proyecto']['titulo']} ({', '.join(o['titulo'] for o in s['proyecto'].get('opciones', []))}).")
        k = s.get("kahoot") or {}
        if k.get("preguntas"):
            L.append(f"- Kahoot: {len(k['preguntas'])} preguntas (individual o en equipos con el proyector).")
        elif k.get("aleatorio"):
            L.append(f"- Kahoot: {k['aleatorio']} preguntas al azar de las misiones anteriores.")
        if s.get("prueba"):
            L.append(f"- Prueba {'diagnóstica' if s['prueba'] == 'diagnostica' else 'final'} de lectura de código (10 reactivos).")
        L.append("")
    destino = RAIZ / "docs" / "planes-de-clase.md"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text("\n".join(L) + "\n", encoding="utf-8")


def generar_instrumentos(c):
    """Instrumentos de evaluación (se generan del contenido para que siempre coincidan)."""
    cfg = c["config"].get("evaluacion", {})
    pesos = cfg.get("pesos", {"retos": 35, "actividades": 15, "kahoots": 20, "proyectoFinal": 30})
    final_num = cfg.get("sesionProyectoFinal", 15)
    mini = [s for s in c["sesiones"] if s.get("proyecto") and s["numero"] != final_num]
    L = ["# Instrumentos de evaluación", "",
         "> Este archivo se genera automáticamente con `python construir.py` a partir de `contenido/` y `configuracion.json`.", "",
         "## 1. Ponderación", "",
         "| Componente | Peso | Evidencia |", "|---|---|---|",
         f"| Retos de programación | {pesos['retos']} % | Retos rápidos superados y misiones en nivel Programador o Maestro (Explorador cuenta {cfg.get('creditoExplorador', 0.5)} de crédito)"
         + (f"; el mini-proyecto de la Misión {', '.join(str(s['numero']) for s in mini)} cuenta como una misión" if mini else "") + " |",
         f"| Actividades interactivas | {pesos['actividades']} % | Porcentaje de juegos completados (ordenar, caza el error, traza, memorama…) |",
         f"| Kahoots | {pesos['kahoots']} % | Promedio del mejor porcentaje de aciertos en el Kahoot de cada misión |",
         f"| Proyecto final (Misiones {final_num} y {final_num + 1}) | {pesos['proyectoFinal']} % | Requisitos cumplidos en la plataforma y rúbrica (programa y presentación) |", "",
         "Los pesos se cambian en `configuracion.json`. La plataforma calcula una **calificación estimada** (Mi progreso) y el Panel docente consolida los archivos de progreso del grupo en una tabla descargable como CSV. La calificación definitiva la asigna el docente.", "",
         "**XP, niveles, logros y rachas no califican:** sirven para motivar. Un alumno puede tener mucho XP por repetir juegos; la calificación se basa en lo logrado, no en el tiempo invertido.", ""]
    # Insignias
    L += ["## 2. Insignias por mundo (motivan, no califican)", "", "| Mundo | Insignia | Se gana al superar la misión principal de las misiones |", "|---|---|---|"]
    for u in c["unidades"]:
        if u.get("insignia"):
            ses = [str(s["numero"]) for s in c["sesiones"] if s["unidad"] == u["numero"] and (s.get("mision") or s.get("proyecto"))]
            L.append(f"| {u['icono']} {u['numero']}. {u['nombre']} | {u['insignia']} | {', '.join(ses)} |")
    L.append("")
    # Prueba de lectura
    dia = next((s["numero"] for s in c["sesiones"] if s.get("prueba") == "diagnostica"), 0)
    fin = next((s["numero"] for s in c["sesiones"] if s.get("prueba") == "final"), 16)
    L += [f"## 3. Prueba diagnóstica (Misión {dia}) y final (Misión {fin})", "",
          "Los mismos 10 reactivos de lectura y predicción de código. La plataforma guarda ambos puntajes y muestra la comparación al alumno; el Panel docente calcula los promedios del grupo.", ""]
    for i, it in enumerate(c["prueba"]["items"], 1):
        L += [f"### Reactivo {i}. {it.get('tema', '')}", "", html_a_texto(it["pregunta"]), "", "```python", it["codigo"], "```", ""]
        for j, op in enumerate(it["opciones"]):
            L.append(f"- **{letra(j)})** {op.replace(chr(10), ' ⏎ ')}{' ✔' if j == it['correcta'] else ''}")
        if it.get("explicacion"):
            L += ["", f"*Explicación:* {html_a_texto(it['explicacion'])}"]
        L.append("")
    # Lista de cotejo
    sec = 4
    for s in mini:
        p = s["proyecto"]
        if p.get("listaCotejo"):
            L += [f"## {sec}. Lista de cotejo del mini-proyecto (Misión {s['numero']}: {p['titulo']})", "", "| Criterio | Sí | No |", "|---|:---:|:---:|"]
            L += [f"| {x} | ☐ | ☐ |" for x in p["listaCotejo"]]
            L += ["", f"La plataforma revisa automáticamente los requisitos estructurales (`{', '.join(p.get('requiere', []))}`) y que el programa se ejecute completo sin errores.", ""]
            sec += 1
    # Rúbrica
    final = next((s for s in c["sesiones"] if s.get("proyecto", {}).get("rubrica")), None)
    if final:
        r = final["proyecto"]["rubrica"]
        req = ", ".join(final["proyecto"].get("requiere", []))
        L += [f"## {sec}. Rúbrica del proyecto final (Misión {final['numero']})", "",
              f"**Requisitos mínimos:** input(), una decisión con elif, un bucle, una lista y dos funciones propias (restricciones en la plataforma: `{req}`).", "",
              "| Criterio | " + " | ".join(r["niveles"]) + " |", "|---|" + "---|" * len(r["niveles"])]
        for cr in r["criterios"]:
            L.append(f"| **{cr['nombre']}** | " + " | ".join(cr["descriptores"]) + " |")
        n = len(r["criterios"])
        L += ["", f"Puntaje: suma de los {n} criterios ({n} a {4 * n} puntos). Sugerencia de conversión: (puntos / {4 * n}) × 100.", "",
              "Opciones de proyecto: " + ", ".join(op["titulo"] for op in final["proyecto"].get("opciones", [])) + ".", ""]
        sec += 1
    # Claves de Kahoot
    L += [f"## {sec}. Claves de los Kahoots", "",
          "Para jugar en modo equipos con el proyector (Panel docente → Kahoot en equipos) o imprimir. El orden de las opciones es el de la plataforma.", ""]
    for s in c["sesiones"]:
        k = s.get("kahoot") or {}
        if not k.get("preguntas"):
            continue
        L += [f"### Misión {s['numero']}. {s['titulo']}", "", "| # | Pregunta | Respuesta |", "|---|---|---|"]
        for i, q in enumerate(k["preguntas"], 1):
            cod = (" `" + q["codigo"].replace("\n", " ⏎ ") + "`") if q.get("codigo") else ""
            resp = html_a_texto(q["opciones"][q["correcta"]]).replace("\n", " ⏎ ")
            L.append(f"| {i} | {html_a_texto(q['pregunta']).replace('|', '¦')}{cod.replace('|', '¦')} | {letra(q['correcta'])}) {resp.replace('|', '¦')} |")
        L.append("")
    destino = destino_instrumentos()
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text("\n".join(L) + "\n", encoding="utf-8")


def main():
    # La consola de Windows no siempre usa UTF-8: evitamos errores con ✓, á, ñ…
    for flujo in (sys.stdout, sys.stderr):
        try:
            flujo.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    rapido = "--rapido" in sys.argv
    print("Misión Python · construcción")
    c = cargar_contenido()
    n_act = sum(len(s.get("actividades", [])) for s in c["sesiones"])
    n_k = sum(len((s.get("kahoot") or {}).get("preguntas", [])) for s in c["sesiones"])
    n_t = sum(len(s.get("teoria", [])) for s in c["sesiones"])
    print(f"  {len(c['sesiones'])} misiones · {n_t} tarjetas de teoría · {n_act} actividades · {n_k} preguntas de Kahoot · {len(c['prueba'].get('items', []))} reactivos de la prueba")
    errores, avisos = validar(c)
    for a in avisos:
        print("  · aviso:", a)
    if errores:
        for e in errores:
            print("  ✗", e)
        sys.exit("✗ Corrige los errores del contenido antes de construir.")
    if not rapido:
        problemas, t = probar_contenido(c)
        if problemas:
            for p in problemas:
                print("  ✗", p)
            sys.exit(f"✗ {len(problemas)} problema(s) al probar el contenido con Python.")
        print(f"  ✓ CPython {sys.version.split()[0]}: {t['pruebas']} casos de prueba de retos, {t['actividades']} actividades y {t['kahoot']} preguntas/ejemplos verificados")
    DIST.mkdir(exist_ok=True)
    for sin_conexion, nombre in ((False, "plataforma.html"), (True, "plataforma-sin-conexion.html")):
        html = construir(c, sin_conexion)
        (DIST / nombre).write_text(html, encoding="utf-8")
        print(f"  ✓ dist/{nombre} ({len(html.encode('utf-8')) / 1024:.0f} KB)")
    publicar_pagina(html)
    print("  ✓ index.html (página de GitHub Pages: la versión con todo incluido)")
    print(f"  ✓ {ruta_bonita(carpeta_soluciones())}/: {generar_soluciones(c)} archivos .py")
    generar_planes(c)
    print("  ✓ docs/planes-de-clase.md")
    generar_instrumentos(c)
    print(f"  ✓ {ruta_bonita(destino_instrumentos())}")
    limpiar_copias_publicas()


if __name__ == "__main__":
    main()
