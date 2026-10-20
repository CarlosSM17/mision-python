/* =========================================================================
 * 10-python.js — Tokenizador, analizador sintáctico y resaltado de Python.
 *
 * El analizador cubre el subconjunto del curso y sirve para tres cosas:
 *   1. Convertir Python en bloques (código inicial de los retos, modo 3).
 *   2. Dar mensajes de error de sintaxis precisos y en español, porque
 *      Skulpt solo dice «bad input».
 *   3. Contar construcciones del programa para revisar restricciones.
 * Lo que no reconoce no es un error: se conserva como «Python libre».
 * ========================================================================= */
'use strict';

PB.py = (() => {
  const PALABRAS_CLAVE = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
    'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);

  const FUNCIONES_INTEGRADAS = new Set(['print', 'input', 'int', 'float', 'str', 'bool', 'len', 'range', 'max', 'min',
    'sum', 'abs', 'round', 'sorted', 'list', 'type', 'enumerate', 'zip', 'reversed', 'chr', 'ord', 'any', 'all', 'pow',
    'divmod', 'isinstance', 'dict', 'set', 'tuple', 'help', 'map', 'filter', 'open']);

  const OPERADORES = ['**=', '//=', '>>=', '<<=', '!=', '%=', '&=', '**', '*=', '+=', '-=', '->', '//', '/=', ':=',
    '<<', '<=', '==', '>=', '>>', '@=', '^=', '|=', '%', '&', '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '<',
    '=', '>', '@', '[', ']', '^', '{', '|', '}', '~'];

  const ASIGNACION_AUMENTADA = new Set(['+=', '-=', '*=', '/=', '//=', '%=', '**=']);

  class ErrorPython extends Error {
    constructor(tipo, mensaje, linea, col) {
      super(mensaje);
      this.tipo = tipo;        // 'SyntaxError' | 'IndentationError'
      this.mensaje = mensaje;
      this.linea = linea;
      this.col = col || 0;
    }
  }

  const reNombre = /[\p{L}_][\p{L}\p{N}_]*/uy;
  const reNumero = /(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?)/y;
  const rePrefijoCadena = /^(?:[rRbBuUfF]|[rR][bBfF]|[bBfF][rR])$/;

  /* ------------------------------------------------------------------ *
   * Tokenizador
   * ------------------------------------------------------------------ */
  function tokenizar(fuente) {
    const src = fuente.replace(/\r\n?/g, '\n') + (fuente.endsWith('\n') ? '' : '\n');
    const toks = [];
    const sangrias = [0];
    const parentesis = [];
    let i = 0, linea = 1, inicioLinea = 0;
    let alInicio = true;
    let continuacion = false;
    let comentariosPendientes = [];

    const tok = (tipo, valor, ini, fin, extra) => {
      const t = { tipo, valor, ini, fin, linea, col: ini - inicioLinea };
      if (extra) Object.assign(t, extra);
      toks.push(t);
      return t;
    };
    const volcarComentarios = (filtro) => {
      const quedan = [];
      for (const c of comentariosPendientes) {
        if (filtro(c)) toks.push(c); else quedan.push(c);
      }
      comentariosPendientes = quedan;
    };

    while (i < src.length) {
      if (alInicio && parentesis.length === 0 && !continuacion) {
        let col = 0, j = i;
        while (j < src.length && (src[j] === ' ' || src[j] === '\t' || src[j] === '\f')) {
          if (src[j] === ' ') col++;
          else if (src[j] === '\t') col = (Math.floor(col / 8) + 1) * 8;
          else col = 0;
          j++;
        }
        if (src[j] === '\n') { i = j + 1; linea++; inicioLinea = i; continue; }
        if (src[j] === '#') {
          let k = j;
          while (src[k] !== '\n') k++;
          comentariosPendientes.push({ tipo: 'COMMENT', valor: src.slice(j, k), ini: j, fin: k, linea, col, solo: true });
          i = k + 1; linea++; inicioLinea = i;
          continue;
        }
        const tope = sangrias[sangrias.length - 1];
        if (col > tope) {
          sangrias.push(col);
          tok('INDENT', '', j, j);
          volcarComentarios(() => true);
        } else if (col < tope) {
          volcarComentarios(c => c.col > col);
          while (col < sangrias[sangrias.length - 1]) {
            sangrias.pop();
            tok('DEDENT', '', j, j);
          }
          if (col !== sangrias[sangrias.length - 1]) {
            throw new ErrorPython('IndentationError',
              'La sangría de esta línea no coincide con ninguna de las líneas anteriores. Alinea la línea con el bloque al que pertenece.',
              linea, col);
          }
          volcarComentarios(() => true);
        } else {
          volcarComentarios(() => true);
        }
        i = j;
        alInicio = false;
      }

      const c = src[i];

      if (c === '\n') {
        if (parentesis.length === 0) {
          const ult = toks[toks.length - 1];
          if (ult && ult.tipo !== 'NEWLINE' && ult.tipo !== 'INDENT' && ult.tipo !== 'DEDENT') tok('NEWLINE', '\n', i, i + 1);
          alInicio = true;
        }
        continuacion = false;
        i++; linea++; inicioLinea = i;
        continue;
      }
      if (c === ' ' || c === '\t' || c === '\f') { i++; continue; }
      if (c === '#') {
        let k = i;
        while (src[k] !== '\n') k++;
        tok('COMMENT', src.slice(i, k), i, k, { solo: false });
        i = k;
        continue;
      }
      if (c === '\\' && src[i + 1] === '\n') {
        i += 2; linea++; inicioLinea = i; continuacion = true;
        continue;
      }

      // Hueco para escribir (solo en el código inicial de los retos): «...»
      if (c === '«') {
        const k = src.indexOf('»', i + 1);
        if (k < 0 || src.slice(i, k).includes('\n')) throw new ErrorPython('SyntaxError', 'Hueco « sin cerrar con ».', linea, i - inicioLinea);
        tok('HUECO', src.slice(i + 1, k), i, k + 1);
        i = k + 1;
        continue;
      }

      // Nombres (y prefijos de cadenas como f"...")
      reNombre.lastIndex = i;
      const mNombre = reNombre.exec(src);
      if (mNombre) {
        const nombre = mNombre[0];
        const sig = src[i + nombre.length];
        if ((sig === '"' || sig === "'") && rePrefijoCadena.test(nombre)) {
          i = leerCadena(i, nombre.length);
          continue;
        }
        tok('NAME', nombre, i, i + nombre.length);
        i += nombre.length;
        continue;
      }

      if (c === '"' || c === "'") { i = leerCadena(i, 0); continue; }

      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
        reNumero.lastIndex = i;
        const m = reNumero.exec(src);
        tok('NUMBER', m[0], i, i + m[0].length);
        i += m[0].length;
        continue;
      }

      if ('“”‘’«»'.includes(c)) {
        throw new ErrorPython('SyntaxError',
          'Hay comillas tipográficas (“ ” o ‘ ’). Python solo entiende comillas rectas: " o \'. Bórralas y escríbelas desde la barra de símbolos.',
          linea, i - inicioLinea);
      }

      let op = null;
      for (const o of OPERADORES) { if (src.startsWith(o, i)) { op = o; break; } }
      if (op) {
        if ('([{'.includes(op)) parentesis.push({ c: op, linea, col: i - inicioLinea });
        else if (')]}'.includes(op)) {
          const abre = parentesis.pop();
          const esperado = { ')': '(', ']': '[', '}': '{' }[op];
          if (!abre) {
            throw new ErrorPython('SyntaxError', `Sobra un «${op}»: no hay ningún «${esperado}» abierto antes.`, linea, i - inicioLinea);
          }
          if (abre.c !== esperado) {
            const cierra = { '(': ')', '[': ']', '{': '}' }[abre.c];
            throw new ErrorPython('SyntaxError',
              `Se esperaba «${cierra}» para cerrar el «${abre.c}» de la línea ${abre.linea}, pero aparece «${op}».`, linea, i - inicioLinea);
          }
        }
        tok('OP', op, i, i + op.length);
        i += op.length;
        continue;
      }

      if (c === '¿' || c === '¡' || c === '?' || c === '$' || c === '`' || c === '!') {
        throw new ErrorPython('SyntaxError',
          `El símbolo «${c}» no se puede usar fuera de las comillas. Si es parte de un mensaje, ponlo dentro de "comillas".`,
          linea, i - inicioLinea);
      }
      throw new ErrorPython('SyntaxError', `Carácter no válido en Python: «${c}».`, linea, i - inicioLinea);
    }

    if (parentesis.length) {
      const abre = parentesis[parentesis.length - 1];
      const cierra = { '(': ')', '[': ']', '{': '}' }[abre.c];
      throw new ErrorPython('SyntaxError', `Falta cerrar el «${abre.c}» que se abrió en la línea ${abre.linea}: agrega «${cierra}».`, abre.linea, abre.col);
    }
    const ult = toks[toks.length - 1];
    if (ult && ult.tipo !== 'NEWLINE' && ult.tipo !== 'DEDENT' && ult.tipo !== 'INDENT') tok('NEWLINE', '\n', i, i);
    volcarComentarios(c => c.col > 0);
    while (sangrias.length > 1) { sangrias.pop(); tok('DEDENT', '', i, i); }
    volcarComentarios(() => true);
    tok('EOF', '', i, i);
    return { toks, src };

    function leerCadena(ini, largoPrefijo) {
      const prefijo = src.slice(ini, ini + largoPrefijo);
      let k = ini + largoPrefijo;
      const q = src[k];
      const triple = src.startsWith(q + q + q, k);
      const delim = triple ? q + q + q : q;
      const lineaIni = linea, colIni = ini - inicioLinea;
      k += delim.length;
      const ini2 = k;
      for (;;) {
        if (k >= src.length) {
          throw new ErrorPython('SyntaxError', 'Una cadena de texto no está cerrada: falta la comilla ' + delim + ' del final.', lineaIni, colIni);
        }
        const ch = src[k];
        if (ch === '\\') {
          if (src[k + 1] === '\n') { linea++; inicioLinea = k + 2; }
          k += 2; continue;
        }
        if (ch === '\n') {
          if (!triple) {
            throw new ErrorPython('SyntaxError',
              'La cadena de texto de esta línea no está cerrada: falta la comilla ' + q + ' del final.', lineaIni, colIni);
          }
          linea++; inicioLinea = k + 1; k++; continue;
        }
        if (src.startsWith(delim, k)) break;
        k++;
      }
      const t = { tipo: 'STRING', valor: src.slice(ini, k + delim.length), ini, fin: k + delim.length, linea: lineaIni, col: colIni };
      t.prefijo = prefijo.toLowerCase();
      t.comilla = q;
      t.triple = triple;
      t.interior = src.slice(ini2, k);
      toks.push(t);
      return k + delim.length;
    }
  }

  /* ------------------------------------------------------------------ *
   * Analizador sintáctico → árbol sencillo (lista plana de sentencias:
   * if, elif y else son sentencias separadas, igual que los bloques).
   * ------------------------------------------------------------------ */
  class NoSoportado extends Error {}

  function analizar(fuente) {
    const { toks: todos, src } = tokenizar(fuente);
    // Los comentarios al final de una línea de código se convierten en
    // comentarios propios en la línea siguiente.
    const toks = [];
    const finales = new Map();
    for (let k = 0; k < todos.length; k++) {
      const t = todos[k];
      if (t.tipo === 'COMMENT' && !t.solo) {
        let j = toks.length - 1;
        while (j >= 0 && toks[j].tipo === 'COMMENT') j--;
        if (j >= 0) finales.set(toks[j], t);
        continue;
      }
      toks.push(t);
    }

    let p = 0;
    const ver = (d = 0) => toks[Math.min(p + d, toks.length - 1)];
    const es = (tipo, valor, d = 0) => { const t = ver(d); return t.tipo === tipo && (valor === undefined || t.valor === valor); };
    const esOp = (v, d = 0) => es('OP', v, d);
    const esClave = (v, d = 0) => es('NAME', v, d);
    const avanzar = () => toks[p++];
    const errorEn = (t, msg, tipo = 'SyntaxError') => new ErrorPython(tipo, msg, t.linea, t.col);
    const texto = (a, b) => src.slice(a.ini, b.fin);
    let profFuncion = 0, profBucle = 0;

    function comentarioFinal(desde, hasta) {
      for (let k = desde; k < hasta; k++) {
        const c = finales.get(toks[k]);
        if (c) return { t: 'Comment', texto: c.valor.replace(/^#\s?/, ''), linea: c.linea };
      }
      return null;
    }

    function archivo() {
      const cuerpo = [];
      while (!es('EOF')) {
        if (es('NEWLINE')) { avanzar(); continue; }
        if (es('INDENT')) throw errorEn(ver(), 'Sangría inesperada: esta línea tiene espacios al inicio, pero no está dentro de un if, for, while o def. Quita los espacios del principio.', 'IndentationError');
        sentencia(cuerpo);
      }
      validarSecuencia(cuerpo);
      return cuerpo;
    }

    function bloque() {
      // Después de los dos puntos
      if (es('NEWLINE')) {
        const nl = avanzar();
        if (!es('INDENT')) {
          const sig = ver();
          throw new ErrorPython('IndentationError',
            `Se esperaba un bloque con sangría después de los dos puntos de la línea ${nl.linea}. Las instrucciones de dentro deben empezar con 4 espacios más.`,
            sig.tipo === 'EOF' ? nl.linea + 1 : sig.linea, 0);
        }
        avanzar();
        const cuerpo = [];
        while (!es('DEDENT') && !es('EOF')) {
          if (es('NEWLINE')) { avanzar(); continue; }
          if (es('INDENT')) throw errorEn(ver(), 'Sangría inesperada: esta línea tiene más espacios que la anterior sin que haya dos puntos antes.', 'IndentationError');
          sentencia(cuerpo);
        }
        if (es('DEDENT')) avanzar();
        validarSecuencia(cuerpo);
        return cuerpo;
      }
      // Cuerpo en la misma línea: if x: print(x)
      const cuerpo = [];
      sentenciasSimples(cuerpo);
      return cuerpo;
    }

    function validarSecuencia(cuerpo) {
      let previo = null;
      for (const s of cuerpo) {
        if (s.t === 'Comment') continue;
        if (s.t === 'Elif' && !(previo && (previo.t === 'If' || previo.t === 'Elif'))) {
          throw new ErrorPython('SyntaxError', '«elif» debe ir justo después de un «if» o de otro «elif», con la misma sangría.', s.linea, 0);
        }
        if (s.t === 'Else' && !(previo && ['If', 'Elif', 'While', 'For'].includes(previo.t)) && !(previo && previo.t === 'RawBlock' && /^(try|except|finally)\b/.test(previo.cabecera))) {
          throw new ErrorPython('SyntaxError', '«else» debe ir justo después de un «if» o «elif», con la misma sangría.', s.linea, 0);
        }
        previo = s;
      }
    }

    function esperarDosPuntos(cabecera) {
      if (esOp(':')) { avanzar(); return; }
      const t = ver();
      if (t.tipo === 'NEWLINE' || t.tipo === 'EOF') {
        throw new ErrorPython('SyntaxError', `Falta «:» (dos puntos) al final de la línea del «${cabecera}».`, cabecera_linea, 0);
      }
      if (t.tipo === 'OP' && t.valor === '=') {
        throw errorEn(t, 'En una condición se compara con «==» (dos signos). Un solo «=» sirve para guardar un valor en una variable.');
      }
      throw errorEn(t, `No esperaba «${t.valor}» aquí. ¿Falta «:» al final de la línea del «${cabecera}»?`);
    }
    let cabecera_linea = 0;

    function sentencia(cuerpo) {
      const t = ver();
      cabecera_linea = t.linea;
      if (t.tipo === 'COMMENT') {
        avanzar();
        cuerpo.push({ t: 'Comment', texto: t.valor.replace(/^#\s?/, ''), linea: t.linea });
        return;
      }
      if (t.tipo === 'NAME') {
        switch (t.valor) {
          case 'if': case 'elif': case 'while': {
            avanzar();
            const ini = p;
            const cond = expresionORaw([':']);
            if (cond === null) throw errorEn(ver(), `Falta la condición después de «${t.valor}».`);
            const c = comentarioFinal(ini, p + 1);
            esperarDosPuntos(t.valor);
            if (t.valor === 'while') profBucle++;
            const cuerpoInt = bloque();
            if (t.valor === 'while') profBucle--;
            if (c) cuerpoInt.unshift(c);
            cuerpo.push({ t: { if: 'If', elif: 'Elif', while: 'While' }[t.valor], cond, cuerpo: cuerpoInt, linea: t.linea });
            return;
          }
          case 'else': {
            avanzar();
            const c = comentarioFinal(p - 1, p + 1);
            esperarDosPuntos('else');
            const cuerpoInt = bloque();
            if (c) cuerpoInt.unshift(c);
            cuerpo.push({ t: 'Else', cuerpo: cuerpoInt, linea: t.linea });
            return;
          }
          case 'for': {
            avanzar();
            const ini = ver();
            if (es('NAME') && !PALABRAS_CLAVE.has(ver().valor) && esClave('in', 1)) {
              const variable = avanzar().valor;
              avanzar(); // in
              const iter = expresionORaw([':']);
              if (iter === null) throw errorEn(ver(), 'Falta lo que se va a recorrer después de «in».');
              const c = comentarioFinal(p, p + 1);
              esperarDosPuntos('for');
              profBucle++;
              const cuerpoInt = bloque();
              profBucle--;
              if (c) cuerpoInt.unshift(c);
              cuerpo.push({ t: 'For', variable, iter, cuerpo: cuerpoInt, linea: t.linea });
              return;
            }
            // for a, b in ... → bloque de Python libre
            p--;
            bloqueLibre(cuerpo, ini, true);
            return;
          }
          case 'def': {
            avanzar();
            if (!es('NAME') || PALABRAS_CLAVE.has(ver().valor)) throw errorEn(ver(), 'Después de «def» va el nombre de la función, por ejemplo: def saludar():');
            const nombre = avanzar().valor;
            if (!esOp('(')) throw errorEn(ver(), `Después del nombre «${nombre}» van paréntesis: def ${nombre}():`);
            const abre = avanzar();
            let prof = 1;
            const ini = p;
            while (prof > 0) {
              const x = avanzar();
              if (x.tipo === 'EOF') throw errorEn(abre, 'Falta cerrar el paréntesis de la función.');
              if (x.tipo === 'OP' && '([{'.includes(x.valor)) prof++;
              if (x.tipo === 'OP' && ')]}'.includes(x.valor)) prof--;
            }
            const cierra = toks[p - 1];
            const params = src.slice(abre.fin, cierra.ini).trim().replace(/\s+/g, ' ');
            if (esOp('->')) { avanzar(); expresionORaw([':']); }
            const c = comentarioFinal(ini, p + 1);
            esperarDosPuntos('def');
            profFuncion++;
            const bucles = profBucle; profBucle = 0;
            const cuerpoInt = bloque();
            profFuncion--; profBucle = bucles;
            if (c) cuerpoInt.unshift(c);
            cuerpo.push({ t: 'Def', nombre, params, cuerpo: cuerpoInt, linea: t.linea });
            return;
          }
          case 'try': case 'except': case 'finally': case 'with': case 'class': case 'async':
            bloqueLibre(cuerpo, t, false);
            return;
        }
      }
      if (t.tipo === 'OP' && t.valor === '@') { bloqueLibreLinea(cuerpo); return; }
      sentenciasSimples(cuerpo);
    }

    function bloqueLibre(cuerpo, t0, esFor) {
      // Cabecera: todo hasta los dos puntos de nivel 0
      const ini = ver();
      let prof = 0, k = p;
      for (;;) {
        const x = toks[k];
        if (x.tipo === 'NEWLINE' || x.tipo === 'EOF') {
          throw new ErrorPython('SyntaxError', `Falta «:» (dos puntos) al final de la línea del «${ini.valor}».`, ini.linea, 0);
        }
        if (x.tipo === 'OP' && '([{'.includes(x.valor)) prof++;
        if (x.tipo === 'OP' && ')]}'.includes(x.valor)) prof--;
        if (x.tipo === 'OP' && x.valor === ':' && prof === 0) break;
        k++;
      }
      const cabecera = texto(ini, toks[k - 1]);
      p = k + 1;
      if (esFor) profBucle++;
      const cuerpoInt = bloque();
      if (esFor) profBucle--;
      cuerpo.push({ t: 'RawBlock', cabecera, cuerpo: cuerpoInt, linea: ini.linea });
    }

    function bloqueLibreLinea(cuerpo) {
      const ini = ver();
      while (!es('NEWLINE') && !es('EOF')) avanzar();
      cuerpo.push({ t: 'Raw', texto: texto(ini, toks[p - 1]), linea: ini.linea });
      if (es('NEWLINE')) avanzar();
    }

    function sentenciasSimples(cuerpo) {
      for (;;) {
        const ini = p;
        const s = sentenciaSimple();
        cuerpo.push(s);
        const c = comentarioFinal(ini, p + 1);
        if (esOp(';')) {
          avanzar();
          if (c) cuerpo.push(c);
          if (es('NEWLINE') || es('EOF')) break;
          continue;
        }
        if (es('NEWLINE')) { avanzar(); if (c) cuerpo.push(c); break; }
        if (es('EOF') || es('DEDENT')) { if (c) cuerpo.push(c); break; }
        const t = ver();
        if (t.tipo === 'OP' && t.valor === ':') {
          throw errorEn(t, 'Sobran los dos puntos «:». Solo van al final de if, elif, else, for, while y def.');
        }
        throw errorEn(t, `No esperaba «${t.valor || t.tipo}» aquí. ¿Falta una coma, un operador o un paréntesis?`);
      }
    }

    function sentenciaSimple() {
      const t = ver();
      if (t.tipo === 'NAME') {
        switch (t.valor) {
          case 'pass': avanzar(); return { t: 'Pass', linea: t.linea };
          case 'break':
            avanzar();
            if (profBucle === 0) throw errorEn(t, '«break» solo puede usarse dentro de un bucle for o while.');
            return { t: 'Break', linea: t.linea };
          case 'continue':
            avanzar();
            if (profBucle === 0) throw errorEn(t, '«continue» solo puede usarse dentro de un bucle for o while.');
            return { t: 'Continue', linea: t.linea };
          case 'return': {
            avanzar();
            if (profFuncion === 0) throw errorEn(t, '«return» solo puede usarse dentro de una función (def).');
            if (es('NEWLINE') || es('EOF') || esOp(';') || es('DEDENT')) return { t: 'Return', valor: null, linea: t.linea };
            return { t: 'Return', valor: expresionORaw([';']), linea: t.linea };
          }
          case 'import': {
            if (es('NAME', undefined, 1) && (es('NEWLINE', undefined, 2) || es('EOF', undefined, 2) || esOp(';', 2))) {
              avanzar();
              const m = avanzar().valor;
              return { t: 'Import', modulo: m, linea: t.linea };
            }
            return lineaLibre();
          }
          case 'from': case 'global': case 'nonlocal': case 'del': case 'assert': case 'raise': case 'yield':
            return lineaLibre();
          case 'print':
            if (es('STRING', undefined, 1) || (es('NAME', undefined, 1) && !PALABRAS_CLAVE.has(ver(1).valor))) {
              throw errorEn(t, 'En Python 3, print necesita paréntesis: print("hola").');
            }
            break;
          case 'else': case 'elif':
            throw errorEn(t, `«${t.valor}» no puede ir aquí: debe empezar su propia línea, justo después del bloque del if.`);
          case 'if': case 'for': case 'while': case 'def':
            throw errorEn(t, `«${t.valor}» debe empezar su propia línea.`);
        }
      }
      if (t.tipo === 'OP' && t.valor === '=') throw errorEn(t, 'Falta el nombre de la variable antes de «=».');

      const ini = p;
      const objetivo = expresionORaw(['=', ...ASIGNACION_AUMENTADA, ';']);
      if (objetivo === null) throw errorEn(ver(), `No esperaba «${ver().valor || ver().tipo}» aquí.`);
      if (esOp('=')) {
        const igual = avanzar();
        if (es('NEWLINE') || es('EOF')) throw errorEn(igual, 'Falta el valor después de «=».');
        if (objetivo.t !== 'Name' && objetivo.t !== 'Subscript') {
          if (objetivo.t === 'Call') throw errorEn(igual, 'No se puede guardar un valor en una llamada a función. A la izquierda de «=» va el nombre de una variable.');
          if (objetivo.t === 'Num' || objetivo.t === 'Str') throw errorEn(igual, 'A la izquierda de «=» va el nombre de una variable, no un valor. Ejemplo: edad = 12');
          p = ini;
          return lineaLibre();
        }
        const ini2 = p;
        const valor = expresionORaw([';', '=']);
        if (esOp('=')) { p = ini; return lineaLibre(); }       // a = b = 0
        if (valor === null) { p = ini2; return lineaLibre(); }
        if (objetivo.t === 'Name') return { t: 'Assign', nombre: objetivo.id, valor, linea: t.linea };
        return { t: 'SetItem', obj: objetivo.obj, indice: objetivo.indice, valor, linea: t.linea };
      }
      if (es('OP') && ASIGNACION_AUMENTADA.has(ver().valor)) {
        const op = avanzar().valor;
        const valor = expresionORaw([';']);
        if (objetivo.t === 'Name' && ['+=', '-=', '*=', '/='].includes(op) && valor) {
          return { t: 'AugAssign', nombre: objetivo.id, op, valor, linea: t.linea };
        }
        p = ini;
        return lineaLibre();
      }
      return { t: 'Expr', valor: objetivo, linea: t.linea };
    }

    function lineaLibre() {
      const ini = ver();
      let prof = 0;
      while (!es('EOF')) {
        const x = ver();
        if (prof === 0 && (x.tipo === 'NEWLINE' || (x.tipo === 'OP' && x.valor === ';'))) break;
        if (x.tipo === 'OP' && '([{'.includes(x.valor)) prof++;
        if (x.tipo === 'OP' && ')]}'.includes(x.valor)) prof--;
        avanzar();
      }
      return { t: 'Raw', texto: texto(ini, toks[p - 1]), linea: ini.linea };
    }

    /* ---- Expresiones ---- */
    // Intenta analizar una expresión; si usa algo que no tiene bloque
    // (rebanadas, lambda, diccionarios...), la guarda como Python libre.
    function expresionORaw(paradas) {
      const ini = p;
      const t0 = ver();
      if (t0.tipo === 'NEWLINE' || t0.tipo === 'EOF' || (t0.tipo === 'OP' && paradas.includes(t0.valor))) return null;
      try {
        const e = expresion();
        const t = ver();
        if (t.tipo === 'NEWLINE' || t.tipo === 'EOF' || t.tipo === 'DEDENT' || (t.tipo === 'OP' && (paradas.includes(t.valor) || t.valor === ')' || t.valor === ']' || t.valor === ','))) return e;
        if (t.tipo === 'OP' && (t.valor === '=' || t.valor === ':') && !paradas.includes(t.valor)) return e;
      } catch (err) {
        if (!(err instanceof NoSoportado)) throw err;
      }
      p = ini;
      return escanearLibre(paradas);
    }

    function escanearLibre(paradas) {
      const ini = ver();
      let prof = 0;
      let prev = null;
      while (!es('EOF')) {
        const x = ver();
        if (prof === 0) {
          if (x.tipo === 'NEWLINE' || x.tipo === 'DEDENT') break;
          if (x.tipo === 'OP' && (paradas.includes(x.valor) || x.valor === ')' || x.valor === ']' || x.valor === ',')) break;
        }
        if (x.tipo === 'OP' && '([{'.includes(x.valor)) prof++;
        if (x.tipo === 'OP' && ')]}'.includes(x.valor)) prof--;
        if (prev && pegados(prev, x)) {
          throw errorEn(x, `Falta un operador o una coma entre «${prev.valor}» y «${x.valor}».`);
        }
        prev = x;
        avanzar();
      }
      if (p === toks.indexOf(ini)) return null;
      return { t: 'RawExpr', texto: texto(ini, toks[p - 1]) };
    }

    function pegados(a, b) {
      const atomo = x => (x.tipo === 'NAME' && !PALABRAS_CLAVE.has(x.valor)) || x.tipo === 'NUMBER' || x.tipo === 'STRING' || x.tipo === 'HUECO';
      const literal = x => x.tipo === 'NUMBER' || x.tipo === 'STRING';
      if (!atomo(a) || !atomo(b)) return false;
      if (a.tipo === 'STRING' && b.tipo === 'STRING') return false;
      return literal(a) || literal(b) || (a.tipo === 'NAME' && b.tipo === 'NAME');
    }

    function expresion() {
      if (esClave('lambda')) throw new NoSoportado();
      const e = oLogico();
      if (esClave('if')) throw new NoSoportado();          // a if c else b
      if (esOp(':=')) throw new NoSoportado();
      return e;
    }
    function oLogico() {
      let e = yLogico();
      while (esClave('or')) { avanzar(); e = { t: 'BoolOp', op: 'or', a: e, b: yLogico() }; }
      return e;
    }
    function yLogico() {
      let e = noLogico();
      while (esClave('and')) { avanzar(); e = { t: 'BoolOp', op: 'and', a: e, b: noLogico() }; }
      return e;
    }
    function noLogico() {
      if (esClave('not')) { avanzar(); return { t: 'Not', v: noLogico() }; }
      return comparacion();
    }
    const COMPARADORES = ['==', '!=', '<', '<=', '>', '>='];
    function comparacion() {
      const a = aritmetica();
      let op = null;
      if (es('OP') && COMPARADORES.includes(ver().valor)) op = avanzar().valor;
      else if (esClave('in')) { avanzar(); op = 'in'; }
      else if (esClave('not') && esClave('in', 1)) { avanzar(); avanzar(); op = 'not in'; }
      else if (esClave('is')) throw new NoSoportado();
      else if (esOp('=') && false) op = null;
      if (!op) return a;
      const b = aritmetica();
      if ((es('OP') && COMPARADORES.includes(ver().valor)) || esClave('in') || esClave('is') || (esClave('not') && esClave('in', 1))) {
        throw new NoSoportado();                         // 0 < x < 10
      }
      if (op === 'in' || op === 'not in') return { t: 'In', op, a, b };
      return { t: 'Compare', op, a, b };
    }
    function aritmetica() {
      let e = termino();
      while (esOp('+') || esOp('-')) { const op = avanzar().valor; e = { t: 'BinOp', op, a: e, b: termino() }; }
      return e;
    }
    function termino() {
      let e = factor();
      while (esOp('*') || esOp('/') || esOp('//') || esOp('%') || esOp('@')) {
        const op = avanzar().valor;
        if (op === '@') throw new NoSoportado();
        e = { t: 'BinOp', op, a: e, b: factor() };
      }
      return e;
    }
    function factor() {
      if (esOp('-')) {
        avanzar();
        const v = factor();
        if (v.t === 'Num' && !v.texto.startsWith('-')) return { t: 'Num', texto: '-' + v.texto };
        return { t: 'Neg', v };
      }
      if (esOp('+') || esOp('~')) throw new NoSoportado();
      return potencia();
    }
    function potencia() {
      const base = primario();
      if (esOp('**')) { avanzar(); return { t: 'BinOp', op: '**', a: base, b: factor() }; }
      return base;
    }
    function primario() {
      let e = atomo();
      for (;;) {
        if (esOp('(')) {
          const abre = avanzar();
          const { args, kwargs } = argumentos();
          if (!esOp(')')) throw errorEn(abre, 'Falta cerrar el paréntesis «)».');
          avanzar();
          e = { t: 'Call', func: e, args, kwargs };
        } else if (esOp('[')) {
          avanzar();
          if (esOp(':') || esOp(']')) throw new NoSoportado();
          const indice = expresion();
          if (!esOp(']')) throw new NoSoportado();       // rebanadas a[1:3]
          avanzar();
          e = { t: 'Subscript', obj: e, indice };
        } else if (esOp('.')) {
          avanzar();
          if (!es('NAME')) throw errorEn(ver(), 'Después del punto «.» va el nombre de un método, por ejemplo: texto.upper()');
          e = { t: 'Attribute', obj: e, attr: avanzar().valor };
        } else break;
      }
      return e;
    }
    function argumentos() {
      const args = [], kwargs = [];
      while (!esOp(')')) {
        if (es('EOF') || es('NEWLINE')) throw new NoSoportado();
        if (esOp('*') || esOp('**')) throw new NoSoportado();
        if (es('NAME') && esOp('=', 1)) {
          const nombre = avanzar().valor; avanzar();
          kwargs.push({ nombre, valor: expresion() });
        } else {
          if (kwargs.length) throw new NoSoportado();
          const a = expresion();
          if (esClave('for')) throw new NoSoportado();
          args.push(a);
        }
        if (esOp(',')) { avanzar(); continue; }
        if (!esOp(')')) {
          const t = ver();
          if (t.tipo === 'NEWLINE' || t.tipo === 'EOF') throw new NoSoportado();
          throw errorEn(t, `Falta una coma «,» o cerrar el paréntesis antes de «${t.valor}».`);
        }
      }
      return { args, kwargs };
    }
    function atomo() {
      const t = ver();
      if (t.tipo === 'NAME') {
        if (t.valor === 'True' || t.valor === 'False') { avanzar(); return { t: 'Bool', v: t.valor }; }
        if (t.valor === 'None') { avanzar(); return { t: 'None' }; }
        if (PALABRAS_CLAVE.has(t.valor)) {
          if (t.valor === 'lambda' || t.valor === 'yield' || t.valor === 'await') throw new NoSoportado();
          throw errorEn(t, `«${t.valor}» es una palabra reservada de Python y no puede usarse aquí.`);
        }
        avanzar();
        if (t.valor === '___') return { t: 'Blank' };
        return { t: 'Name', id: t.valor };
      }
      if (t.tipo === 'NUMBER') { avanzar(); return { t: 'Num', texto: t.valor }; }
      if (t.tipo === 'HUECO') { avanzar(); return { t: 'Hueco', texto: t.valor }; }
      if (t.tipo === 'STRING') {
        avanzar();
        if (es('STRING') || t.triple || t.prefijo.includes('b') || t.prefijo.includes('r')) {
          while (es('STRING')) avanzar();
          throw new NoSoportado();
        }
        let interior = t.interior;
        if (t.comilla === "'") interior = cambiarAComillaDoble(interior);
        if (interior === null) throw new NoSoportado();
        if (t.prefijo.includes('f')) {
          if (t.comilla === "'" && t.interior.includes('"')) throw new NoSoportado();
          return { t: 'FStr', texto: interior };
        }
        return { t: 'Str', texto: interior };
      }
      if (t.tipo === 'OP' && t.valor === '(') {
        avanzar();
        if (esOp(')')) throw new NoSoportado();          // tupla vacía
        const e = expresion();
        if (esOp(',') || esClave('for')) throw new NoSoportado();
        if (!esOp(')')) throw new NoSoportado();
        avanzar();
        return e;
      }
      if (t.tipo === 'OP' && t.valor === '[') {
        avanzar();
        const items = [];
        while (!esOp(']')) {
          if (es('EOF') || es('NEWLINE')) throw new NoSoportado();
          items.push(expresion());
          if (esClave('for')) throw new NoSoportado();
          if (esOp(',')) { avanzar(); continue; }
          if (!esOp(']')) throw new NoSoportado();
        }
        avanzar();
        return { t: 'List', items };
      }
      if (t.tipo === 'OP' && t.valor === '{') throw new NoSoportado();
      if (t.tipo === 'OP' && t.valor === '...') throw new NoSoportado();
      if (t.tipo === 'INDENT') throw errorEn(t, 'Sangría inesperada.', 'IndentationError');
      throw new NoSoportado();
    }

    const cuerpo = archivo();
    return cuerpo;
  }

  /** Convierte el interior de una cadena con comilla simple al de comilla doble. */
  function cambiarAComillaDoble(interior) {
    let r = '';
    for (let k = 0; k < interior.length; k++) {
      const ch = interior[k];
      if (ch === '\\') {
        const sig = interior[k + 1];
        if (sig === "'") { r += "'"; k++; continue; }
        r += ch + (sig ?? ''); k++; continue;
      }
      if (ch === '"') { r += '\\"'; continue; }
      r += ch;
    }
    return r;
  }

  /** Revisa la sintaxis. Devuelve null o {tipo, mensaje, linea, col}. */
  function revisarSintaxis(codigo) {
    try {
      analizar(codigo);
      return null;
    } catch (e) {
      if (e instanceof ErrorPython) return { tipo: e.tipo, mensaje: e.mensaje, linea: e.linea, col: e.col };
      return null;
    }
  }

  /* ------------------------------------------------------------------ *
   * Conteo de construcciones (para restricciones como «usa while»)
   * ------------------------------------------------------------------ */
  function contar(codigo) {
    const r = {
      tokens: [], nombres: {}, llamadas: {}, metodos: {}, claves: {}, operadores: {},
      listas: 0, fstrings: 0, comentarios: 0, cadenas: 0, lineas: 0, ok: true
    };
    let res;
    try { res = tokenizar(codigo); } catch (e) { r.ok = false; return r; }
    // Las expresiones dentro de las llaves de una f-string también cuentan
    const toks = [];
    for (const t of res.toks) {
      toks.push(t);
      if (t.tipo === 'STRING' && t.prefijo && t.prefijo.includes('f')) {
        const re = /\{([^{}]+)\}/g;
        let m;
        while ((m = re.exec(t.interior.replace(/\{\{|\}\}/g, '  '))) !== null) {
          try {
            const internos = tokenizar(m[1].split(/[!:](?![=])/)[0]).toks;
            for (const x of internos) if (!['NEWLINE', 'EOF', 'INDENT', 'DEDENT'].includes(x.tipo)) toks.push(x);
          } catch (e) { /* expresión que no entendemos: se ignora */ }
        }
      }
    }
    r.lineas = codigo.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
    // Contadores y acumuladores: x = x + … , x += …
    r.acumula = 0;
    for (const l of codigo.split('\n')) {
      const m = /^\s*([A-Za-z_]\w*)\s*(\+=|=\s*([A-Za-z_]\w*)\s*\+)/.exec(l);
      if (m && (m[2] === '+=' || m[3] === m[1])) r.acumula++;
    }
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k], ant = toks[k - 1], sig = toks[k + 1];
      if (t.tipo === 'COMMENT') { r.comentarios++; continue; }
      if (t.tipo === 'STRING') { r.cadenas++; if (t.prefijo && t.prefijo.includes('f')) r.fstrings++; continue; }
      if (t.tipo === 'NAME') {
        if (PALABRAS_CLAVE.has(t.valor)) r.claves[t.valor] = (r.claves[t.valor] || 0) + 1;
        const esMetodo = ant && ant.tipo === 'OP' && ant.valor === '.';
        if (sig && sig.tipo === 'OP' && sig.valor === '(') {
          if (esMetodo) r.metodos[t.valor] = (r.metodos[t.valor] || 0) + 1;
          else r.llamadas[t.valor] = (r.llamadas[t.valor] || 0) + 1;
        }
        if (!esMetodo) r.nombres[t.valor] = (r.nombres[t.valor] || 0) + 1;
        continue;
      }
      if (t.tipo === 'OP') {
        r.operadores[t.valor] = (r.operadores[t.valor] || 0) + 1;
        if (t.valor === '[') {
          const subindice = ant && ((ant.tipo === 'NAME' && !PALABRAS_CLAVE.has(ant.valor)) || ant.tipo === 'STRING' ||
            (ant.tipo === 'OP' && (ant.valor === ')' || ant.valor === ']')));
          if (!subindice) r.listas++;
        }
      }
    }
    return r;
  }

  /* ------------------------------------------------------------------ *
   * Resaltado de sintaxis (tolerante: nunca falla)
   * ------------------------------------------------------------------ */
  const reResaltado = /(#[^\n]*)|((?:\b[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*(?:"|$)|'(?:\\.|[^'\\\n])*(?:'|$)))|(«[^»\n]*»?)|(\b\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?\b|\.\d+\b)|([\p{L}_][\p{L}\p{N}_]*)|(\n)|(\s+)|(.)/gmu;

  function resaltarLinea(html, clase, texto) {
    return html + (clase ? `<span class="${clase}">${PB.util.esc(texto)}</span>` : PB.util.esc(texto));
  }

  /** Devuelve un arreglo de líneas en HTML con el código resaltado. */
  function resaltar(codigo) {
    const lineas = [''];
    let m;
    reResaltado.lastIndex = 0;
    let prevNombre = null;
    while ((m = reResaltado.exec(codigo)) !== null) {
      if (m[0] === '') { reResaltado.lastIndex++; continue; }
      let clase = null;
      if (m[1]) clase = 'tk-com';
      else if (m[2]) clase = /^[rRbBuUfF]*[fF]/.test(m[2]) ? 'tk-fstr' : 'tk-str';
      else if (m[3]) clase = 'tk-hueco';
      else if (m[4]) clase = 'tk-num';
      else if (m[5]) {
        const w = m[5];
        if (w === 'True' || w === 'False' || w === 'None') clase = 'tk-cte';
        else if (PALABRAS_CLAVE.has(w)) clase = 'tk-kw';
        else if (w === '___') clase = 'tk-hueco';
        else if (FUNCIONES_INTEGRADAS.has(w)) clase = 'tk-fn';
        else if (prevNombre === 'def') clase = 'tk-def';
        prevNombre = w;
      } else if (m[6]) { lineas.push(''); continue; }
      else if (m[8]) clase = /[=+\-*/%<>!]/.test(m[8]) ? 'tk-op' : null;
      if (!m[5] && !m[7]) prevNombre = null;
      // Los fragmentos de varias líneas (cadenas triples) se reparten por línea
      const partes = m[0].split('\n');
      partes.forEach((parte, idx) => {
        if (idx > 0) lineas.push('');
        if (parte) lineas[lineas.length - 1] = resaltarLinea(lineas[lineas.length - 1], clase, parte);
      });
    }
    return lineas;
  }

  function esIdentificadorValido(nombre) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(nombre) && !PALABRAS_CLAVE.has(nombre);
  }

  function problemaConNombre(nombre) {
    if (!nombre) return 'Escribe un nombre.';
    if (PALABRAS_CLAVE.has(nombre)) return `«${nombre}» es una palabra reservada de Python. Elige otro nombre.`;
    if (/^[0-9]/.test(nombre)) return 'El nombre no puede empezar con un número.';
    if (/\s/.test(nombre)) return 'El nombre no puede tener espacios. Usa guion bajo: mi_nombre';
    if (/[áéíóúüñÁÉÍÓÚÜÑ]/.test(nombre)) return 'Mejor sin acentos ni ñ (por ejemplo: anio en lugar de año).';
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nombre)) return 'Usa solo letras, números y guion bajo (_).';
    if (FUNCIONES_INTEGRADAS.has(nombre)) return `«${nombre}» ya es una función de Python. Elige otro nombre para no confundirte.`;
    return null;
  }

  return {
    tokenizar, analizar, revisarSintaxis, contar, resaltar, ErrorPython,
    esIdentificadorValido, problemaConNombre, PALABRAS_CLAVE, FUNCIONES_INTEGRADAS, cambiarAComillaDoble
  };
})();
