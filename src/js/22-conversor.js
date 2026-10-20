/* =========================================================================
 * 22-conversor.js — De Python a bloques.
 * Convierte el árbol de PB.py.analizar en el JSON de Blockly. Así el código
 * inicial de cada reto se escribe en Python y la plataforma lo muestra como
 * bloques; también permite ver como bloques lo que el alumno escribe.
 * ========================================================================= */
'use strict';

PB.conv = (() => {
  const ARIT = new Set(['+', '-', '*', '/', '//', '%', '**']);
  const METODOS_TEXTO = new Set(['upper', 'lower', 'title', 'capitalize', 'strip']);
  const FUNC1 = new Set(['max', 'min', 'sum', 'sorted', 'abs']);

  function aBloques(codigo, opciones = {}) {
    const arbol = PB.py.analizar(codigo);           // puede lanzar ErrorPython
    const cont = { libres: 0, bloqueado: !!opciones.bloquear };
    const primero = cadena(arbol, cont);
    const bloques = primero ? [Object.assign(primero, { x: 24, y: 24 })] : [];
    return { json: { blocks: { languageVersion: 0, blocks: bloques } }, libres: cont.libres };
  }

  function cadena(sentencias, cont) {
    let primero = null, ultimo = null;
    for (const s of sentencias) {
      const b = sentencia(s, cont);
      if (!b) continue;
      if (cont.bloqueado) { b.deletable = false; b.movable = false; }
      if (!primero) primero = b;
      else ultimo.next = { block: b };
      ultimo = b;
    }
    return primero;
  }

  const conCuerpo = (b, cuerpo, cont) => {
    const c = cadena(cuerpo, cont);
    if (c) { b.inputs = b.inputs || {}; b.inputs.DO = { block: c }; }
    return b;
  };

  function entrada(expr, cont) {
    if (!expr || expr.t === 'Blank') return undefined;
    if (expr.t === 'Hueco') return { shadow: { type: 'py_hueco', fields: { CODIGO: expr.texto } } };
    const b = expresion(expr, cont);
    return b ? { block: b } : undefined;
  }

  function conEntradas(tipo, entradas, cont, extra = {}) {
    const b = Object.assign({ type: tipo }, extra);
    for (const [nombre, expr] of Object.entries(entradas)) {
      const e = entrada(expr, cont);
      if (e) { b.inputs = b.inputs || {}; b.inputs[nombre] = e; }
    }
    return b;
  }

  function variadico(tipo, args, kwargs, cont, extra = {}) {
    const todos = args.slice();
    for (const kw of kwargs || []) todos.push({ t: 'Kwarg', nombre: kw.nombre, valor: kw.valor });
    const b = Object.assign({ type: tipo, extraState: { n: todos.length } }, extra);
    todos.forEach((a, i) => {
      const e = entrada(a, cont);
      if (e) { b.inputs = b.inputs || {}; b.inputs['ARG' + i] = e; }
    });
    return b;
  }

  function sentencia(s, cont) {
    switch (s.t) {
      case 'Comment': return { type: 'py_comment', fields: { TEXTO: s.texto } };
      case 'Pass': return { type: 'py_pass' };
      case 'Break': return { type: 'py_break' };
      case 'Continue': return { type: 'py_continue' };
      case 'Import':
        if (['random', 'math', 'time'].includes(s.modulo)) return { type: 'py_import', fields: { MODULO: s.modulo } };
        cont.libres++;
        return { type: 'py_raw_stmt', fields: { CODIGO: 'import ' + s.modulo } };
      case 'Raw': cont.libres++; return { type: 'py_raw_stmt', fields: { CODIGO: s.texto } };
      case 'RawBlock': cont.libres++; return conCuerpo({ type: 'py_raw_block', fields: { CABECERA: s.cabecera } }, s.cuerpo, cont);
      case 'Assign': return conEntradas('py_assign', { VALOR: s.valor }, cont, { fields: { VAR: { name: s.nombre } } });
      case 'AugAssign': return conEntradas('py_augassign', { VALOR: s.valor }, cont, { fields: { VAR: { name: s.nombre }, OP: s.op } });
      case 'SetItem': return conEntradas('py_index_set', { LISTA: s.obj, INDICE: s.indice, VALOR: s.valor }, cont);
      case 'If': return conCuerpo(conEntradas('py_if', { COND: s.cond }, cont), s.cuerpo, cont);
      case 'Elif': return conCuerpo(conEntradas('py_elif', { COND: s.cond }, cont), s.cuerpo, cont);
      case 'Else': return conCuerpo({ type: 'py_else' }, s.cuerpo, cont);
      case 'While': return conCuerpo(conEntradas('py_while', { COND: s.cond }, cont), s.cuerpo, cont);
      case 'For': return conCuerpo(conEntradas('py_for', { ITER: s.iter }, cont, { fields: { VAR: { name: s.variable } } }), s.cuerpo, cont);
      case 'Def': return conCuerpo({ type: 'py_def', fields: { NOMBRE: s.nombre, PARAMS: s.params } }, s.cuerpo, cont);
      case 'Return': return conEntradas('py_return', { VALOR: s.valor }, cont);
      case 'Expr': return expresionComoSentencia(s.valor, cont);
    }
    cont.libres++;
    return { type: 'py_raw_stmt', fields: { CODIGO: '' } };
  }

  function expresionComoSentencia(e, cont) {
    if (e.t === 'Call') {
      if (e.func.t === 'Name') {
        if (e.func.id === 'print') return variadico('py_print', e.args, e.kwargs, cont);
        return variadico('py_call_stmt', e.args, e.kwargs, cont, { fields: { NOMBRE: e.func.id } });
      }
      if (e.func.t === 'Attribute' && (e.func.attr === 'append' || e.func.attr === 'remove') && e.args.length === 1 && !e.kwargs.length) {
        return conEntradas('py_append', { LISTA: e.func.obj, X: e.args[0] }, cont, { fields: { METODO: e.func.attr } });
      }
    }
    return conEntradas('py_expr_stmt', { VALOR: e }, cont);
  }

  function libre(texto, cont) {
    cont.libres++;
    return { type: 'py_raw_expr', fields: { CODIGO: texto } };
  }

  function expresion(e, cont) {
    switch (e.t) {
      case 'Name': return { type: 'py_var', fields: { VAR: { name: e.id } } };
      case 'Num': return { type: 'py_number', fields: { NUM: e.texto } };
      case 'Str': return { type: 'py_string', fields: { TEXTO: e.texto } };
      case 'FStr': return { type: 'py_fstring', fields: { TEXTO: e.texto } };
      case 'Bool': return { type: 'py_bool', fields: { VALOR: e.v } };
      case 'None': return libre('None', cont);
      case 'RawExpr': return libre(e.texto, cont);
      case 'Hueco': return { type: 'py_hueco', fields: { CODIGO: e.texto } };
      case 'Kwarg': return conEntradas('py_kwarg', { VALOR: e.valor }, cont, { fields: { NOMBRE: e.nombre } });
      case 'BinOp':
        if (ARIT.has(e.op)) return conEntradas('py_arith', { A: e.a, B: e.b }, cont, { fields: { OP: e.op } });
        break;
      case 'Compare': return conEntradas('py_compare', { A: e.a, B: e.b }, cont, { fields: { OP: e.op } });
      case 'In': return conEntradas('py_in', { A: e.a, B: e.b }, cont, { fields: { OP: e.op } });
      case 'BoolOp': return conEntradas('py_logic', { A: e.a, B: e.b }, cont, { fields: { OP: e.op } });
      case 'Not': return conEntradas('py_not', { A: e.v }, cont);
      case 'Neg': return libre('-' + textoDe(e.v), cont);
      case 'List': return variadico('py_list', e.items, [], cont);
      case 'Subscript': return conEntradas('py_index', { LISTA: e.obj, INDICE: e.indice }, cont);
      case 'Attribute': return libre(textoDe(e), cont);
      case 'Call': return llamada(e, cont);
    }
    return libre(textoDe(e), cont);
  }

  function llamada(e, cont) {
    const { func, args, kwargs } = e;
    const sinKw = !kwargs.length;
    if (func.t === 'Name') {
      const f = func.id;
      if (f === 'input' && sinKw && args.length <= 1) return conEntradas('py_input', { PROMPT: args[0] }, cont);
      if ((f === 'int' || f === 'float' || f === 'str') && sinKw && args.length === 1) return conEntradas('py_convert', { VALOR: args[0] }, cont, { fields: { TIPO: f } });
      if (f === 'len' && sinKw && args.length === 1) return conEntradas('py_len', { X: args[0] }, cont);
      if (FUNC1.has(f) && sinKw && args.length === 1) return conEntradas('py_func1', { X: args[0] }, cont, { fields: { FUNC: f } });
      if (f === 'round' && sinKw && (args.length === 1 || args.length === 2)) return conEntradas('py_round', { X: args[0], N: args[1] }, cont);
      if (f === 'range' && sinKw && args.length >= 1 && args.length <= 3) return variadico('py_range', args, [], cont);
      return variadico('py_call', args, kwargs, cont, { fields: { NOMBRE: f } });
    }
    if (func.t === 'Attribute') {
      if (func.obj.t === 'Name' && func.obj.id === 'random' && sinKw) {
        if (func.attr === 'randint' && args.length === 2) return conEntradas('py_randint', { A: args[0], B: args[1] }, cont);
        if (func.attr === 'choice' && args.length === 1) return conEntradas('py_choice', { X: args[0] }, cont);
      }
      if (METODOS_TEXTO.has(func.attr) && !args.length && sinKw) {
        return conEntradas('py_str_method', { X: func.obj }, cont, { fields: { METODO: func.attr } });
      }
      const b = variadico('py_method_call', args, kwargs, cont, { fields: { NOMBRE: func.attr } });
      const obj = entrada(func.obj, cont);
      if (obj) { b.inputs = b.inputs || {}; b.inputs.OBJ = obj; }
      return b;
    }
    return libre(textoDe(e), cont);
  }

  /** Reconstruye el texto de una expresión (para las piezas de Python libre). */
  function textoDe(e) {
    if (!e) return '___';
    switch (e.t) {
      case 'Name': return e.id;
      case 'Num': return e.texto;
      case 'Str': return '"' + e.texto + '"';
      case 'FStr': return 'f"' + e.texto + '"';
      case 'Bool': return e.v;
      case 'None': return 'None';
      case 'Blank': return '___';
      case 'Hueco': return e.texto || '___';
      case 'RawExpr': return e.texto;
      case 'BinOp': return '(' + textoDe(e.a) + ' ' + e.op + ' ' + textoDe(e.b) + ')';
      case 'Compare': case 'In': return textoDe(e.a) + ' ' + e.op + ' ' + textoDe(e.b);
      case 'BoolOp': return textoDe(e.a) + ' ' + e.op + ' ' + textoDe(e.b);
      case 'Not': return 'not ' + textoDe(e.v);
      case 'Neg': return '-' + textoDe(e.v);
      case 'List': return '[' + e.items.map(textoDe).join(', ') + ']';
      case 'Subscript': return textoDe(e.obj) + '[' + textoDe(e.indice) + ']';
      case 'Attribute': return textoDe(e.obj) + '.' + e.attr;
      case 'Call': return textoDe(e.func) + '(' + e.args.map(textoDe).concat(e.kwargs.map(k => k.nombre + '=' + textoDe(k.valor))).join(', ') + ')';
    }
    return '___';
  }

  /** Carga código Python como bloques en un espacio de trabajo. */
  function cargar(ws, codigo, opciones = {}) {
    const r = aBloques(codigo, opciones);
    Blockly.Events.disable();
    try {
      ws.clear();
      Blockly.serialization.workspaces.load(r.json, ws);
    } finally {
      Blockly.Events.enable();
    }
    return r;
  }

  /** Convierte una expresión escrita a mano (p. ej. en un hueco) en un bloque. */
  function expresionABloque(texto) {
    const arbol = PB.py.analizar(texto);
    if (arbol.length !== 1 || arbol[0].t !== 'Expr') return null;
    const cont = { libres: 0 };
    return expresion(arbol[0].valor, cont);
  }

  return { aBloques, cargar, expresionABloque };
})();
