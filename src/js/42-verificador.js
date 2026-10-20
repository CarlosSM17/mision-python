/* =========================================================================
 * 42-verificador.js — Revisa un programa contra los casos de prueba y las
 * restricciones del reto, y explica qué falló (no solo «incorrecto»).
 *
 * Restricciones (requiere / prohibe), por ejemplo:
 *   "while"        usa while al menos una vez
 *   "def*2"        al menos dos funciones
 *   "print<=2"     a lo más dos print
 *   "for|while"    al menos uno de los dos
 * Casos de prueba:
 *   { entradas: ["10","5"], azar: [7], contiene: ["Más bajo", "2 intentos"],
 *     no_contiene: [...], exacto: "...", nombre: "..." }
 * La comparación ignora mayúsculas, acentos, ¡ ¿ y espacios repetidos.
 * ========================================================================= */
'use strict';

PB.verificador = (() => {
  const { normalizar } = PB.util;

  const DESCRIPCIONES = {
    print: 'mostrar algo con print()', input: 'pedir datos con input()', int: 'convertir con int()', float: 'convertir con float()',
    str: 'convertir a texto con str()', len: 'usar len()', range: 'usar range()', max: 'usar max()', min: 'usar min()', sum: 'usar sum()',
    round: 'usar round()', if: 'tomar una decisión con if', elif: 'usar elif', else: 'usar else', for: 'usar un bucle for',
    while: 'usar un bucle while', def: 'definir una función con def', return: 'devolver un valor con return', break: 'usar break',
    continue: 'usar continue', and: 'usar and', or: 'usar or', not: 'usar not', in: 'usar in', lista: 'usar una lista [ ]',
    append: 'agregar a una lista con .append()', remove: 'usar .remove()', upper: 'usar .upper()', lower: 'usar .lower()',
    title: 'usar .title()', fstring: 'usar una f-string: f"… {variable} …"', comentario: 'escribir al menos un comentario con #',
    randint: 'usar random.randint()', choice: 'usar random.choice()', 'import random': 'traer el módulo con import random',
    '+=': 'usar +=', '=': 'guardar valores en variables con =', '%': 'usar % (residuo)', '//': 'usar // (división entera)',
    '+': 'usar +', '*': 'usar *', '==': 'comparar con ==', variable: 'guardar valores en variables', '[]': 'usar corchetes [ ]',
    indice: 'usar posiciones de una lista: lista[0]',
    acumula: 'sumar a una variable (contador o acumulador): puntos = puntos + 1'
  };

  const LLAMADAS = new Set(['print', 'input', 'int', 'float', 'str', 'len', 'range', 'max', 'min', 'sum', 'round', 'sorted', 'abs', 'bool', 'type']);
  const METODOS = new Set(['append', 'remove', 'upper', 'lower', 'title', 'capitalize', 'strip', 'randint', 'choice', 'insert', 'pop', 'sort', 'count', 'replace', 'index', 'split', 'join', 'isdigit']);

  function contarClave(clave, c) {
    if (clave === 'acumula') return c.acumula || 0;
    if (clave === 'lista') return c.listas;
    if (clave === 'fstring') return c.fstrings;
    if (clave === 'comentario') return c.comentarios;
    if (clave === 'variable') return c.operadores['='] || 0;
    if (clave === 'indice') return (c.operadores['['] || 0) - c.listas;
    if (clave === 'import random') return (c.claves.import && c.nombres.random) ? 1 : 0;
    if (PB.py.PALABRAS_CLAVE.has(clave)) return c.claves[clave] || 0;
    if (LLAMADAS.has(clave)) return c.llamadas[clave] || 0;
    if (METODOS.has(clave)) return c.metodos[clave] || 0;
    if (/^[^\w\s]+$/.test(clave)) return c.operadores[clave] || 0;
    return (c.llamadas[clave] || 0) + (c.nombres[clave] || 0);
  }

  function describir(clave) { return DESCRIPCIONES[clave] || `usar «${clave}»`; }

  // Frases para «al menos N veces» que suenan naturales
  const DESCRIPCIONES_N = {
    def: n => `definir al menos ${n} funciones con def`,
    return: n => `usar return en al menos ${n} lugares`,
    lista: n => `usar al menos ${n} listas`,
    input: n => `pedir al menos ${n} datos con input()`,
    print: n => `usar print al menos ${n} veces`,
    if: n => `usar if al menos ${n} veces`,
    for: n => `usar al menos ${n} bucles for`,
    while: n => `usar al menos ${n} bucles while`,
    append: n => `agregar a la lista con .append() al menos ${n} veces`,
    acumula: n => `sumar puntos con un contador al menos ${n} veces (puntos = puntos + 1)`,
    variable: n => `usar al menos ${n} variables`
  };
  const ALTERNATIVAS = { 'for|while': 'usar un bucle (for o while)', 'fstring|+': 'unir textos con + o con una f-string' };

  /** Evalúa una lista de restricciones. Devuelve [{texto, ok}]. */
  function revisarRestricciones(codigo, requiere = [], prohibe = []) {
    const c = PB.py.contar(codigo);
    const r = [];
    for (const regla of requiere) {
      let m;
      if ((m = /^(.+?)\*(\d+)$/.exec(regla))) {
        const n = contarClave(m[1], c), min = +m[2];
        const texto = DESCRIPCIONES_N[m[1]] ? DESCRIPCIONES_N[m[1]](min) : `${describir(m[1])} (al menos ${min} veces)`;
        r.push({ texto, ok: n >= min, clave: regla });
      } else if ((m = /^(.+?)<=(\d+)$/.exec(regla))) {
        const n = contarClave(m[1], c), max = +m[2];
        r.push({ texto: `${describir(m[1])} como máximo ${max} ${max === 1 ? 'vez' : 'veces'}`, ok: n <= max, clave: regla });
      } else if (regla.includes('|')) {
        const opciones = regla.split('|');
        r.push({ texto: ALTERNATIVAS[regla] || opciones.map(describir).join(' o '), ok: opciones.some(o => contarClave(o, c) > 0), clave: regla });
      } else {
        r.push({ texto: describir(regla), ok: contarClave(regla, c) > 0, clave: regla });
      }
    }
    for (const regla of prohibe) {
      r.push({ texto: `no ${describir(regla)}`, ok: contarClave(regla, c) === 0, clave: '!' + regla });
    }
    return r;
  }

  function compararSalida(salida, prueba) {
    const obtenida = normalizar(salida);
    const fallos = [];
    if (prueba.exacto !== undefined && prueba.exacto !== null) {
      if (obtenida !== normalizar(prueba.exacto)) fallos.push({ tipo: 'exacto', esperado: prueba.exacto });
    }
    if (prueba.contiene) {
      let desde = 0;
      for (const fragmento of prueba.contiene) {
        const f = normalizar(fragmento);
        const pos = obtenida.indexOf(f, desde);
        if (pos < 0) {
          const enOtroLugar = obtenida.indexOf(f) >= 0;
          fallos.push({ tipo: enOtroLugar ? 'orden' : 'falta', esperado: fragmento });
          break;
        }
        desde = pos + f.length;
      }
    }
    for (const fragmento of prueba.no_contiene || []) {
      if (obtenida.includes(normalizar(fragmento))) fallos.push({ tipo: 'sobra', esperado: fragmento });
    }
    if (prueba.lineasMin) {
      const n = obtenida ? obtenida.split('\n').filter(l => l.trim()).length : 0;
      if (n < prueba.lineasMin) fallos.push({ tipo: 'lineas', esperado: prueba.lineasMin, obtenido: n });
    }
    return fallos;
  }

  function mensajeFallo(f) {
    if (f.tipo === 'exacto') return `La salida debía ser exactamente:\n${f.esperado}`;
    if (f.tipo === 'orden') return `Aparece «${f.esperado}», pero no en el orden esperado.`;
    if (f.tipo === 'falta') return `Se esperaba ver «${f.esperado}» en la salida, y no apareció.`;
    if (f.tipo === 'sobra') return `No debería aparecer «${f.esperado}».`;
    if (f.tipo === 'lineas') return `Tu programa debe mostrar al menos ${f.esperado} renglones, y mostró ${f.obtenido}.`;
    return 'La salida no es la esperada.';
  }

  function describirEntradas(prueba) {
    const partes = [];
    if (prueba.entradas && prueba.entradas.length) partes.push('escribiendo ' + prueba.entradas.map(e => '«' + e + '»').join(', '));
    if (prueba.azar && prueba.azar.length) partes.push((prueba.azar.length === 1 ? 'con el valor al azar ' : 'con los valores al azar ') + prueba.azar.join(', '));
    return partes.join(' y ') || 'sin escribir datos';
  }

  /** Une la configuración del reto con la del nivel elegido. */
  function configuracion(reto, nivel) {
    const n = (reto.niveles && nivel && reto.niveles[nivel]) || {};
    return {
      pruebas: n.pruebas || reto.pruebas || [],
      requiere: [...(reto.requiere || []), ...(n.requiere || [])],
      prohibe: [...(reto.prohibe || []), ...(n.prohibe || [])],
      sinPruebas: !!(n.sinPruebas ?? reto.sinPruebas)
    };
  }

  /**
   * Verifica un programa. Devuelve:
   * { ok, sintaxis, huecos, restricciones:[{texto,ok}], pruebas:[{nombre, ok, detalle, entradas, salida, error}] }
   */
  async function verificar(codigo, reto, nivel, { alProgreso } = {}) {
    const cfg = configuracion(reto, nivel);
    const r = { ok: false, sintaxis: null, huecos: 0, restricciones: [], pruebas: [], vacio: false };

    if (!codigo.trim()) { r.vacio = true; return r; }

    const diag = PB.py.revisarSintaxis(codigo);
    if (diag) {
      r.sintaxis = PB.errores.explicar({ tipo: diag.tipo, mensaje: diag.mensaje, linea: diag.linea, original: diag.tipo }, codigo);
      return r;
    }
    const conteo = PB.py.contar(codigo);
    r.huecos = conteo.nombres.___ || 0;
    r.restricciones = revisarRestricciones(codigo, cfg.requiere, cfg.prohibe);

    let i = 0;
    for (const prueba of cfg.pruebas) {
      i++;
      if (alProgreso) alProgreso(i, cfg.pruebas.length);
      const res = await PB.ejecutor.ejecutar(codigo, { entradas: prueba.entradas || [], azar: prueba.azar || [], limiteMs: prueba.limiteMs || 4000 });
      const item = { nombre: prueba.nombre || `Prueba ${i}`, entradas: describirEntradas(prueba), salida: res.salidaPantalla, ok: false, detalle: '' };
      if (res.error) {
        if (res.error.tipo === 'SinInterprete' || res.error.tipo === 'Ocupado') {
          item.error = PB.errores.explicar(res.error, codigo);
          item.detalle = item.error.texto;
          r.pruebas.push(item);
          break;
        }
        item.error = PB.errores.explicar(res.error, codigo);
        item.detalle = item.error.texto;
      } else {
        const fallos = compararSalida(res.salida, prueba);
        item.ok = fallos.length === 0;
        item.detalle = fallos.map(mensajeFallo).join('\n');
      }
      r.pruebas.push(item);
    }
    r.ok = r.huecos === 0 && r.restricciones.every(x => x.ok) && r.pruebas.every(p => p.ok) && (cfg.pruebas.length > 0 || cfg.sinPruebas || r.restricciones.length > 0);
    return r;
  }

  return { verificar, revisarRestricciones, compararSalida, configuracion, describir };
})();
