/* =========================================================================
 * 21-generador.js — De bloques a Python.
 * Además del código, produce un mapa línea ↔ bloque (para resaltar el bloque
 * y su línea a la vez) y la posición de los huecos editables del modo 2.
 * ========================================================================= */
'use strict';

PB.gen = (() => {
  const MARCA_S = '⁣S';                 // marca de inicio de bloque de instrucción
  const H1 = '⁣H', H2 = '⁤', H3 = '⁥';  // marcas de hueco
  const reHueco = /⁣H([^⁤]*)⁤([^⁥]*)⁥/g;

  // Precedencias de Python (menor número = se agrupa antes)
  const O = { ATOMO: 0, LLAMADA: 2, POT: 3, UNARIO: 4, MULT: 5, SUMA: 6, REL: 11, NOT: 12, AND: 13, OR: 14, NADA: 99 };
  const PREC_ARIT = { '+': O.SUMA, '-': O.SUMA, '*': O.MULT, '/': O.MULT, '//': O.MULT, '%': O.MULT, '**': O.POT };

  let G = null;

  function crear() {
    const Gen = Blockly.CodeGenerator || Blockly.Generator;
    G = new Gen('Python');
    G.INDENT = '    ';
    G.init = function () { this.isInitialized = true; };
    G.finish = function (codigo) { return codigo; };
    G.scrubNakedValue = function () { return ''; };
    G.scrub_ = function (bloque, codigo, soloEste) {
      if (bloque.outputConnection) return codigo;
      let r = MARCA_S + bloque.id + '\n' + codigo;
      const sig = bloque.nextConnection && bloque.nextConnection.targetBlock();
      if (sig && !soloEste) r += G.blockToCode(sig);
      return r;
    };

    const F = G.forBlock;

    /** Código de una entrada de valor, con paréntesis solo si hacen falta. */
    function val(b, nombre, externo, asociativo = false) {
      const hijo = b.getInputTargetBlock(nombre);
      if (!hijo) return '___';
      const r = G.blockToCode(hijo);
      if (!r || (Array.isArray(r) && r[0] === '')) return '___';
      let [codigo, interno] = Array.isArray(r) ? r : [r, O.NADA];
      const mismo = interno === externo;
      const necesita = interno > externo || (mismo && !asociativo && interno > O.LLAMADA && interno !== O.NADA);
      if (necesita) codigo = '(' + codigo + ')';
      return codigo;
    }
    const opcional = (b, nombre, externo) => (b.getInputTargetBlock(nombre) ? val(b, nombre, externo) : '');

    function cuerpo(b, nombre = 'DO') {
      let c = G.statementToCode(b, nombre) || '';
      const real = c.split('\n').some(l => {
        const t = l.trim();
        return t && !t.startsWith('#') && !t.startsWith(MARCA_S);
      });
      if (!real) c += G.INDENT + 'pass\n';
      return c;
    }
    const argumentos = (b) => {
      const r = [];
      for (let i = 0; i < (b.n_ || 0); i++) r.push(val(b, 'ARG' + i, O.NADA));
      return r.join(', ');
    };
    const nombreVar = (b) => {
      const campo = b.getField('VAR');
      const v = campo && campo.getVariable && campo.getVariable();
      return v ? v.name : (campo ? campo.getText() : 'x');
    };
    /** Escapa las comillas dobles sin tocar las secuencias \n, \t, etc. */
    function comillasDobles(txt) {
      let r = '';
      for (let k = 0; k < txt.length; k++) {
        const ch = txt[k];
        if (ch === '\\') { r += ch + (txt[k + 1] ?? '\\'); k++; continue; }
        r += ch === '"' ? '\\"' : ch;
      }
      return r;
    }
    function precedenciaTexto(txt) {
      const t = txt.trim();
      if (!t) return O.ATOMO;
      if (/^-?\d+(\.\d+)?$/.test(t) || /^[A-Za-z_][\w.]*(\([^()]*\))?(\[[^\[\]]*\])?$/.test(t) || /^f?"[^"]*"$/.test(t) || /^'[^']*'$/.test(t)) return O.ATOMO;
      return O.NADA;
    }

    F.py_print = b => 'print(' + argumentos(b) + ')\n';
    F.py_input = b => ['input(' + opcional(b, 'PROMPT', O.NADA) + ')', O.LLAMADA];
    F.py_convert = b => [b.getFieldValue('TIPO') + '(' + val(b, 'VALOR', O.NADA) + ')', O.LLAMADA];
    F.py_comment = b => {
      const t = b.getFieldValue('TEXTO').trim();
      return '#' + (t ? ' ' + t : '') + '\n';
    };
    F.py_assign = b => nombreVar(b) + ' = ' + val(b, 'VALOR', O.NADA) + '\n';
    F.py_augassign = b => nombreVar(b) + ' ' + b.getFieldValue('OP') + ' ' + val(b, 'VALOR', O.NADA) + '\n';
    F.py_var = b => [nombreVar(b), O.ATOMO];
    F.py_number = b => {
      const t = b.getFieldValue('NUM');
      return [t, t.startsWith('-') ? O.UNARIO : O.ATOMO];
    };
    F.py_arith = b => {
      const op = b.getFieldValue('OP');
      const p = PREC_ARIT[op];
      const derechaAsoc = op === '**';
      const a = val(b, 'A', p, !derechaAsoc);
      const c = val(b, 'B', p, derechaAsoc);
      return [a + ' ' + op + ' ' + c, p];
    };
    F.py_round = b => {
      const n = opcional(b, 'N', O.NADA);
      return ['round(' + val(b, 'X', O.NADA) + (n ? ', ' + n : '') + ')', O.LLAMADA];
    };
    F.py_compare = b => [val(b, 'A', O.REL) + ' ' + b.getFieldValue('OP') + ' ' + val(b, 'B', O.REL), O.REL];
    F.py_in = b => [val(b, 'A', O.REL) + ' ' + b.getFieldValue('OP') + ' ' + val(b, 'B', O.REL), O.REL];
    F.py_logic = b => {
      const op = b.getFieldValue('OP');
      const p = op === 'and' ? O.AND : O.OR;
      return [val(b, 'A', p, true) + ' ' + op + ' ' + val(b, 'B', p, true), p];
    };
    F.py_not = b => ['not ' + val(b, 'A', O.NOT, true), O.NOT];
    F.py_bool = b => [b.getFieldValue('VALOR'), O.ATOMO];
    F.py_string = b => ['"' + comillasDobles(b.getFieldValue('TEXTO')) + '"', O.ATOMO];
    F.py_fstring = b => ['f"' + comillasDobles(b.getFieldValue('TEXTO')) + '"', O.ATOMO];
    F.py_len = b => ['len(' + val(b, 'X', O.NADA) + ')', O.LLAMADA];
    F.py_str_method = b => [val(b, 'X', O.LLAMADA) + '.' + b.getFieldValue('METODO') + '()', O.LLAMADA];
    F.py_if = b => 'if ' + val(b, 'COND', O.NADA) + ':\n' + cuerpo(b);
    F.py_elif = b => 'elif ' + val(b, 'COND', O.NADA) + ':\n' + cuerpo(b);
    F.py_else = b => 'else:\n' + cuerpo(b);
    F.py_while = b => 'while ' + val(b, 'COND', O.NADA) + ':\n' + cuerpo(b);
    F.py_for = b => 'for ' + nombreVar(b) + ' in ' + val(b, 'ITER', O.NADA) + ':\n' + cuerpo(b);
    F.py_range = b => ['range(' + argumentos(b) + ')', O.LLAMADA];
    F.py_break = () => 'break\n';
    F.py_continue = () => 'continue\n';
    F.py_pass = () => 'pass\n';
    F.py_list = b => ['[' + argumentos(b) + ']', O.ATOMO];
    F.py_index = b => [val(b, 'LISTA', O.LLAMADA) + '[' + val(b, 'INDICE', O.NADA) + ']', O.LLAMADA];
    F.py_index_set = b => val(b, 'LISTA', O.LLAMADA) + '[' + val(b, 'INDICE', O.NADA) + '] = ' + val(b, 'VALOR', O.NADA) + '\n';
    F.py_append = b => val(b, 'LISTA', O.LLAMADA) + '.' + b.getFieldValue('METODO') + '(' + val(b, 'X', O.NADA) + ')\n';
    F.py_func1 = b => [b.getFieldValue('FUNC') + '(' + val(b, 'X', O.NADA) + ')', O.LLAMADA];
    F.py_import = b => 'import ' + b.getFieldValue('MODULO') + '\n';
    F.py_randint = b => ['random.randint(' + val(b, 'A', O.NADA) + ', ' + val(b, 'B', O.NADA) + ')', O.LLAMADA];
    F.py_choice = b => ['random.choice(' + val(b, 'X', O.NADA) + ')', O.LLAMADA];
    F.py_def = b => 'def ' + b.getFieldValue('NOMBRE') + '(' + b.getFieldValue('PARAMS') + '):\n' + cuerpo(b);
    F.py_return = b => {
      const v = opcional(b, 'VALOR', O.NADA);
      return 'return' + (v ? ' ' + v : '') + '\n';
    };
    F.py_call = b => [b.getFieldValue('NOMBRE') + '(' + argumentos(b) + ')', O.LLAMADA];
    F.py_call_stmt = b => b.getFieldValue('NOMBRE') + '(' + argumentos(b) + ')\n';
    F.py_method_call = b => [val(b, 'OBJ', O.LLAMADA) + '.' + b.getFieldValue('NOMBRE') + '(' + argumentos(b) + ')', O.LLAMADA];
    F.py_kwarg = b => [b.getFieldValue('NOMBRE') + '=' + val(b, 'VALOR', O.NADA), O.NADA];
    F.py_expr_stmt = b => val(b, 'VALOR', O.NADA) + '\n';
    F.py_raw_stmt = b => (b.getFieldValue('CODIGO').trim() || 'pass') + '\n';
    F.py_raw_expr = b => {
      const t = b.getFieldValue('CODIGO').trim();
      return [t || '___', precedenciaTexto(t)];
    };
    F.py_raw_block = b => b.getFieldValue('CABECERA').trim().replace(/:$/, '') + ':\n' + cuerpo(b);
    F.py_hueco = b => {
      const t = b.getFieldValue('CODIGO').trim();
      return [H1 + b.id + H2 + t + H3, precedenciaTexto(t)];
    };
  }

  /**
   * Genera el Python de un espacio de trabajo.
   * Devuelve { codigo, lineas: [{texto, segmentos, bloque}], bloqueALinea, lineaABloque, huecos }
   */
  function generar(ws) {
    if (!G) crear();
    let crudo = '';
    try { crudo = G.workspaceToCode(ws); } catch (e) { console.error('Error al generar Python', e); }
    const lineas = [];
    let pendiente = null;
    for (const l of crudo.split('\n')) {
      const t = l.trimStart();
      if (t.startsWith(MARCA_S)) { pendiente = t.slice(MARCA_S.length); continue; }
      const segmentos = [];
      let k = 0, m;
      reHueco.lastIndex = 0;
      while ((m = reHueco.exec(l)) !== null) {
        if (m.index > k) segmentos.push({ texto: l.slice(k, m.index) });
        segmentos.push({ hueco: m[1], texto: m[2] });
        k = m.index + m[0].length;
      }
      if (k < l.length) segmentos.push({ texto: l.slice(k) });
      const texto = segmentos.map(s => (s.hueco !== undefined ? (s.texto || '___') : s.texto)).join('');
      lineas.push({ texto: texto.replace(/\s+$/, ''), segmentos, bloque: pendiente });
      pendiente = null;
    }
    // Limpieza de líneas vacías al inicio, al final y repetidas
    const limpias = [];
    for (const l of lineas) {
      if (!l.texto.trim()) {
        if (!limpias.length || !limpias[limpias.length - 1].texto.trim()) continue;
        limpias.push({ texto: '', segmentos: [], bloque: null });
      } else limpias.push(l);
    }
    while (limpias.length && !limpias[limpias.length - 1].texto.trim()) limpias.pop();

    const bloqueALinea = {}, lineaABloque = {}, huecos = [];
    limpias.forEach((l, i) => {
      if (l.bloque) { bloqueALinea[l.bloque] = i + 1; lineaABloque[i + 1] = l.bloque; }
      for (const s of l.segmentos) if (s.hueco !== undefined) huecos.push({ id: s.hueco, linea: i + 1, texto: s.texto });
    });
    const codigo = limpias.map(l => l.texto).join('\n') + (limpias.length ? '\n' : '');
    return { codigo, lineas: limpias, bloqueALinea, lineaABloque, huecos };
  }

  /** La línea de un bloque cualquiera (si es un valor, la de su instrucción). */
  function lineaDeBloque(resultado, bloque) {
    let b = bloque;
    while (b) {
      if (resultado.bloqueALinea[b.id]) return resultado.bloqueALinea[b.id];
      b = b.getParent();
    }
    return null;
  }

  return { generar, lineaDeBloque, O };
})();
