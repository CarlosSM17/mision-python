/* =========================================================================
 * 20-bloques.js — Bloques «estilo Python».
 * Cada bloque muestra las palabras reales de Python (print, input, for…in
 * range, def) y genera exactamente una línea de código. Los colores siguen
 * las categorías de Scratch para dar continuidad.
 * ========================================================================= */
'use strict';

PB.bloques = (() => {
  const COLOR = {
    salida: '#9966FF',     // Apariencia (Scratch)
    variables: '#FF8C1A',  // Variables
    operadores: '#59C059', // Operadores
    texto: '#4C97FF',      // Movimiento
    control: '#FFAB19',    // Control
    listas: '#FF661A',     // Listas
    funciones: '#FF6680',  // Mis bloques
    azar: '#0FBD8C',       // Extensiones
    libre: '#7A869A',
    hueco: '#FFE066'
  };

  const svg = (cuerpo) => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
    `<circle cx="12" cy="12" r="10.5" fill="#ffffff" fill-opacity="0.92"/>${cuerpo}</svg>`);
  const ICONO_MAS = svg('<path d="M12 7v10M7 12h10" stroke="#3d3d5c" stroke-width="2.6" stroke-linecap="round"/>');
  const ICONO_MENOS = svg('<path d="M7 12h10" stroke="#3d3d5c" stroke-width="2.6" stroke-linecap="round"/>');

  /* ---------- Validadores de campos ---------- */
  function validarNumero(txt) {
    const t = String(txt).trim().replace(',', '.');
    return /^-?(\d+(\.\d*)?|\.\d+)$/.test(t) ? t : null;
  }
  function validarNombre(txt) {
    const t = String(txt).trim();
    return PB.py.esIdentificadorValido(t) ? t : null;
  }
  function validarParametros(txt) {
    const t = String(txt).trim();
    if (!t) return '';
    const partes = t.split(',');
    for (const p of partes) {
      if (!/^\s*[A-Za-z_][A-Za-z0-9_]*\s*(=\s*\S.*)?$/.test(p)) return null;
      const nombre = p.split('=')[0].trim();
      if (PB.py.PALABRAS_CLAVE.has(nombre)) return null;
    }
    return partes.map(p => p.trim()).join(', ');
  }
  const comillas = (txt) => PB.util.quitarComillasTipograficas(txt);

  /* ---------- Bloques con número variable de piezas (+ / −) ---------- */
  function mezclaVariadica({ min = 0, max = 12, prefijo = 'ARG', separador = ',' }) {
    return {
      saveExtraState() { return { n: this.n_ }; },
      loadExtraState(estado) {
        const n = estado && typeof estado.n === 'number' ? estado.n : this.n_;
        this.n_ = Math.max(min, Math.min(max, n));
        this.actualizarForma_();
      },
      cambiarCantidad_(delta) {
        const nuevo = Math.max(min, Math.min(max, this.n_ + delta));
        if (nuevo === this.n_) return;
        let antes = null;
        try { antes = Blockly.Events.BlockChange.getExtraBlockState_(this); } catch (e) { /* sin deshacer */ }
        Blockly.Events.setGroup(true);
        try {
          this.n_ = nuevo;
          this.actualizarForma_();
          if (antes !== null) {
            const despues = Blockly.Events.BlockChange.getExtraBlockState_(this);
            Blockly.Events.fire(new Blockly.Events.BlockChange(this, 'mutation', null, antes, despues));
          }
        } finally {
          Blockly.Events.setGroup(false);
        }
      },
      actualizarForma_() {
        // Quitar las piezas que sobran (las entradas son ARG0, ARG1, … seguidas)
        for (let i = this.n_; this.getInput(prefijo + i); i++) {
          const entrada = this.getInput(prefijo + i);
          const hijo = entrada.connection && entrada.connection.targetBlock();
          if (hijo && !hijo.isShadow()) {
            hijo.unplug();
            if (hijo.rendered) hijo.moveBy(24, 36);
          }
          this.removeInput(prefijo + i);
        }
        for (let i = 0; i < this.n_; i++) {
          if (!this.getInput(prefijo + i)) {
            const entrada = this.appendValueInput(prefijo + i);
            if (i > 0 && separador) entrada.appendField(separador);
            this.moveInputBefore(prefijo + i, 'FIN');
          }
        }
        const menos = this.getField('MENOS');
        if (menos) menos.setVisible(this.n_ > min);
        const mas = this.getField('MAS');
        if (mas) mas.setVisible(this.n_ < max);
        // No llamar a render(): en Blockly 11 fuerza el dibujo inmediato de todos los
        // bloques pendientes, incluso los que todavía se están cargando.
        if (this.queueRender && this.initialized) this.queueRender();
      }
    };
  }

  function camposMasMenos(entradaFin) {
    entradaFin.appendField(new Blockly.FieldImage(ICONO_MAS, 22, 22, '+', (campo) => campo.getSourceBlock().cambiarCantidad_(1)), 'MAS');
    entradaFin.appendField(new Blockly.FieldImage(ICONO_MENOS, 22, 22, '−', (campo) => campo.getSourceBlock().cambiarCantidad_(-1)), 'MENOS');
  }

  function definirVariadico(tipo, { etiqueta, cierre, min, max, inicio, color, salida, tooltip, campoNombre, campoObjeto }) {
    Blockly.Blocks[tipo] = Object.assign({
      init() {
        this.n_ = inicio;
        if (campoObjeto) {
          this.appendValueInput('OBJ');
          this.appendDummyInput('INICIO').appendField('.').appendField(new Blockly.FieldTextInput('metodo', validarNombre), 'NOMBRE').appendField('(');
        } else if (campoNombre) {
          this.appendDummyInput('INICIO').appendField(new Blockly.FieldTextInput('funcion', validarNombre), 'NOMBRE').appendField('(');
        } else {
          this.appendDummyInput('INICIO').appendField(etiqueta);
        }
        const fin = this.appendDummyInput('FIN').appendField(cierre);
        camposMasMenos(fin);
        this.setInputsInline(true);
        if (salida) this.setOutput(true, null);
        else { this.setPreviousStatement(true); this.setNextStatement(true); }
        this.setColour(color);
        this.setTooltip(tooltip);
        this.actualizarForma_();
      }
    }, mezclaVariadica({ min, max }));
  }

  /* ---------- Avisos para bloques fuera de lugar ---------- */
  function bloqueAnterior(b) {
    const ant = b.previousConnection && b.previousConnection.targetBlock();
    if (ant && ant.nextConnection && ant.nextConnection.targetBlock() === b) return ant;
    return null;
  }
  function dentroDe(b, tipos) {
    let p = b.getSurroundParent();
    while (p) {
      if (tipos.includes(p.type)) return true;
      p = p.getSurroundParent();
    }
    return false;
  }
  function conAviso(fn) {
    return function (ev) {
      if (!this.workspace || this.isInFlyout || this.workspace.isFlyout) return;
      if (ev && ev.type === Blockly.Events.UI) return;
      const msg = fn.call(this);
      if (this.warning_msg_ !== msg) {
        this.setWarningText(msg || null);
        this.warning_msg_ = msg;
      }
    };
  }

  const definiciones = [
    /* ---- Entrada y salida ---- */
    {
      type: 'py_input', message0: 'input( %1 )', args0: [{ type: 'input_value', name: 'PROMPT' }],
      inputsInline: true, output: null, colour: COLOR.salida,
      tooltip: 'Pide un dato a quien usa el programa. Siempre devuelve texto (str).'
    },
    {
      type: 'py_convert', message0: '%1 ( %2 )',
      args0: [{ type: 'field_dropdown', name: 'TIPO', options: [['int', 'int'], ['float', 'float'], ['str', 'str']] }, { type: 'input_value', name: 'VALOR' }],
      inputsInline: true, output: null, colour: COLOR.salida,
      tooltip: 'Convierte un valor: int → número entero, float → número decimal, str → texto.'
    },
    {
      type: 'py_comment', message0: '# %1', args0: [{ type: 'field_input', name: 'TEXTO', text: 'comentario' }],
      previousStatement: null, nextStatement: null, colour: '#8E8E9E',
      tooltip: 'Un comentario es una nota para personas. Python lo ignora.'
    },
    /* ---- Variables ---- */
    {
      type: 'py_assign', message0: '%1 = %2',
      args0: [{ type: 'field_variable', name: 'VAR', variable: 'x' }, { type: 'input_value', name: 'VALOR' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.variables,
      tooltip: 'Guarda un valor en una variable. El signo = significa «guardar», no «es igual».'
    },
    {
      type: 'py_augassign', message0: '%1 %2 %3',
      args0: [{ type: 'field_variable', name: 'VAR', variable: 'x' },
        { type: 'field_dropdown', name: 'OP', options: [['+=', '+='], ['-=', '-='], ['*=', '*='], ['/=', '/=']] },
        { type: 'input_value', name: 'VALOR' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.variables,
      tooltip: 'Atajo: x += 1 es lo mismo que x = x + 1.'
    },
    {
      type: 'py_var', message0: '%1', args0: [{ type: 'field_variable', name: 'VAR', variable: 'x' }],
      output: null, colour: COLOR.variables, tooltip: 'El valor guardado en la variable.'
    },
    /* ---- Operadores ---- */
    {
      type: 'py_number', message0: '%1', args0: [{ type: 'field_input', name: 'NUM', text: '0' }],
      output: null, colour: COLOR.operadores, tooltip: 'Un número. Con punto decimal (2.5) es float; sin punto (2) es int.'
    },
    {
      type: 'py_arith', message0: '%1 %2 %3',
      args0: [{ type: 'input_value', name: 'A' },
        { type: 'field_dropdown', name: 'OP', options: [['+', '+'], ['-', '-'], ['*', '*'], ['/', '/'], ['//', '//'], ['%', '%'], ['**', '**']] },
        { type: 'input_value', name: 'B' }],
      inputsInline: true, output: null, colour: COLOR.operadores,
      tooltip: '+ suma, - resta, * multiplica, / divide, // división entera, % residuo, ** potencia. Con texto, + une.'
    },
    {
      type: 'py_round', message0: 'round( %1 , %2 )', args0: [{ type: 'input_value', name: 'X' }, { type: 'input_value', name: 'N' }],
      inputsInline: true, output: null, colour: COLOR.operadores, tooltip: 'Redondea un número a cierta cantidad de decimales.'
    },
    {
      type: 'py_compare', message0: '%1 %2 %3',
      args0: [{ type: 'input_value', name: 'A' },
        { type: 'field_dropdown', name: 'OP', options: [['==', '=='], ['!=', '!='], ['<', '<'], ['<=', '<='], ['>', '>'], ['>=', '>=']] },
        { type: 'input_value', name: 'B' }],
      inputsInline: true, output: 'Boolean', colour: COLOR.operadores,
      tooltip: 'Compara dos valores y da True o False. == significa «es igual a»; != «es distinto de».'
    },
    {
      type: 'py_logic', message0: '%1 %2 %3',
      args0: [{ type: 'input_value', name: 'A' }, { type: 'field_dropdown', name: 'OP', options: [['and', 'and'], ['or', 'or']] }, { type: 'input_value', name: 'B' }],
      inputsInline: true, output: 'Boolean', colour: COLOR.operadores,
      tooltip: 'and: las dos condiciones deben cumplirse. or: basta con que se cumpla una.'
    },
    {
      type: 'py_not', message0: 'not %1', args0: [{ type: 'input_value', name: 'A' }],
      inputsInline: true, output: 'Boolean', colour: COLOR.operadores, tooltip: 'Invierte una condición: not True es False.'
    },
    {
      type: 'py_in', message0: '%1 %2 %3',
      args0: [{ type: 'input_value', name: 'A' }, { type: 'field_dropdown', name: 'OP', options: [['in', 'in'], ['not in', 'not in']] }, { type: 'input_value', name: 'B' }],
      inputsInline: true, output: 'Boolean', colour: COLOR.operadores, tooltip: '¿Está dentro? Sirve con listas y con texto.'
    },
    {
      type: 'py_bool', message0: '%1', args0: [{ type: 'field_dropdown', name: 'VALOR', options: [['True', 'True'], ['False', 'False']] }],
      output: 'Boolean', colour: COLOR.operadores, tooltip: 'Valor lógico: True (verdadero) o False (falso).'
    },
    /* ---- Texto ---- */
    {
      type: 'py_string', message0: '" %1 "', args0: [{ type: 'field_input', name: 'TEXTO', text: '' }],
      output: null, colour: COLOR.texto, tooltip: 'Un texto (str). Va entre comillas.'
    },
    {
      type: 'py_fstring', message0: 'f" %1 "', args0: [{ type: 'field_input', name: 'TEXTO', text: 'Hola {nombre}' }],
      output: null, colour: COLOR.texto, tooltip: 'f-string: lo que escribas entre llaves {} se reemplaza por su valor.'
    },
    {
      type: 'py_len', message0: 'len( %1 )', args0: [{ type: 'input_value', name: 'X' }],
      inputsInline: true, output: null, colour: COLOR.texto, tooltip: 'Cuántos caracteres tiene un texto o cuántos elementos tiene una lista.'
    },
    {
      type: 'py_str_method', message0: '%1 . %2 ()',
      args0: [{ type: 'input_value', name: 'X' },
        { type: 'field_dropdown', name: 'METODO', options: [['upper', 'upper'], ['lower', 'lower'], ['title', 'title'], ['capitalize', 'capitalize'], ['strip', 'strip']] }],
      inputsInline: true, output: null, colour: COLOR.texto,
      tooltip: 'upper: MAYÚSCULAS · lower: minúsculas · title: Cada Palabra · capitalize: Primera letra · strip: quita espacios de las orillas.'
    },
    /* ---- Decisiones ---- */
    {
      type: 'py_if', message0: 'if %1 :', args0: [{ type: 'input_value', name: 'COND' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.control,
      tooltip: 'Si la condición es True, hace lo de adentro.'
    },
    {
      type: 'py_elif', message0: 'elif %1 :', args0: [{ type: 'input_value', name: 'COND' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.control,
      tooltip: '«si no, si…»: va justo debajo de un if o de otro elif.'
    },
    {
      type: 'py_else', message0: 'else :', message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null, nextStatement: null, colour: COLOR.control,
      tooltip: '«si no»: se ejecuta cuando ninguna condición anterior se cumplió.'
    },
    /* ---- Bucles ---- */
    {
      type: 'py_for', message0: 'for %1 in %2 :',
      args0: [{ type: 'field_variable', name: 'VAR', variable: 'i' }, { type: 'input_value', name: 'ITER' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.control,
      tooltip: 'Repite lo de adentro una vez por cada valor: de range() o de una lista.'
    },
    {
      type: 'py_while', message0: 'while %1 :', args0: [{ type: 'input_value', name: 'COND' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.control,
      tooltip: 'Repite lo de adentro mientras la condición sea True.'
    },
    { type: 'py_break', message0: 'break', previousStatement: null, colour: COLOR.control, tooltip: 'Sale del bucle inmediatamente.' },
    { type: 'py_continue', message0: 'continue', previousStatement: null, colour: COLOR.control, tooltip: 'Salta a la siguiente vuelta del bucle.' },
    { type: 'py_pass', message0: 'pass', previousStatement: null, nextStatement: null, colour: COLOR.control, tooltip: 'No hace nada. Sirve para dejar un bloque vacío.' },
    /* ---- Listas ---- */
    {
      type: 'py_index', message0: '%1 [ %2 ]', args0: [{ type: 'input_value', name: 'LISTA' }, { type: 'input_value', name: 'INDICE' }],
      inputsInline: true, output: null, colour: COLOR.listas, tooltip: 'El elemento en esa posición. ¡Las posiciones empiezan en 0!'
    },
    {
      type: 'py_index_set', message0: '%1 [ %2 ] = %3',
      args0: [{ type: 'input_value', name: 'LISTA' }, { type: 'input_value', name: 'INDICE' }, { type: 'input_value', name: 'VALOR' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.listas, tooltip: 'Cambia el elemento que está en esa posición.'
    },
    {
      type: 'py_append', message0: '%1 . %2 ( %3 )',
      args0: [{ type: 'input_value', name: 'LISTA' }, { type: 'field_dropdown', name: 'METODO', options: [['append', 'append'], ['remove', 'remove']] }, { type: 'input_value', name: 'X' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.listas,
      tooltip: 'append: agrega al final de la lista. remove: quita la primera vez que aparece ese valor.'
    },
    {
      type: 'py_func1', message0: '%1 ( %2 )',
      args0: [{ type: 'field_dropdown', name: 'FUNC', options: [['max', 'max'], ['min', 'min'], ['sum', 'sum'], ['sorted', 'sorted'], ['abs', 'abs']] }, { type: 'input_value', name: 'X' }],
      inputsInline: true, output: null, colour: COLOR.listas,
      tooltip: 'max: el mayor · min: el menor · sum: la suma · sorted: ordenada · abs: valor absoluto.'
    },
    /* ---- Azar ---- */
    {
      type: 'py_import', message0: 'import %1', args0: [{ type: 'field_dropdown', name: 'MODULO', options: [['random', 'random'], ['math', 'math'], ['time', 'time']] }],
      previousStatement: null, nextStatement: null, colour: COLOR.azar, tooltip: 'Trae un módulo de Python. Va al inicio del programa.'
    },
    {
      type: 'py_randint', message0: 'random.randint( %1 , %2 )', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }],
      inputsInline: true, output: null, colour: COLOR.azar, tooltip: 'Un número entero al azar entre A y B (incluidos). Necesita import random.'
    },
    {
      type: 'py_choice', message0: 'random.choice( %1 )', args0: [{ type: 'input_value', name: 'X' }],
      inputsInline: true, output: null, colour: COLOR.azar, tooltip: 'Un elemento al azar de una lista. Necesita import random.'
    },
    /* ---- Funciones ---- */
    {
      type: 'py_def', message0: 'def %1 ( %2 ) :',
      args0: [{ type: 'field_input', name: 'NOMBRE', text: 'saludar' }, { type: 'field_input', name: 'PARAMS', text: '' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null, nextStatement: null, colour: COLOR.funciones,
      tooltip: 'Define una función nueva. Entre paréntesis van sus parámetros, separados por comas.'
    },
    {
      type: 'py_return', message0: 'return %1', args0: [{ type: 'input_value', name: 'VALOR' }],
      inputsInline: true, previousStatement: null, colour: COLOR.funciones, tooltip: 'Termina la función y devuelve un valor.'
    },
    {
      type: 'py_kwarg', message0: '%1 = %2', args0: [{ type: 'field_input', name: 'NOMBRE', text: 'end' }, { type: 'input_value', name: 'VALOR' }],
      inputsInline: true, output: null, colour: COLOR.salida, tooltip: 'Argumento con nombre, por ejemplo end="" en print.'
    },
    /* ---- Python libre ---- */
    {
      type: 'py_expr_stmt', message0: '%1', args0: [{ type: 'input_value', name: 'VALOR' }],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOR.libre, tooltip: 'Ejecuta una expresión como instrucción.'
    },
    {
      type: 'py_raw_stmt', message0: '%1', args0: [{ type: 'field_input', name: 'CODIGO', text: '' }],
      previousStatement: null, nextStatement: null, colour: COLOR.libre, tooltip: 'Una línea de Python escrita a mano.'
    },
    {
      type: 'py_raw_expr', message0: '%1', args0: [{ type: 'field_input', name: 'CODIGO', text: '' }],
      output: null, colour: COLOR.libre, tooltip: 'Una expresión de Python escrita a mano.'
    },
    {
      type: 'py_raw_block', message0: '%1 :', args0: [{ type: 'field_input', name: 'CABECERA', text: 'try' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null, nextStatement: null, colour: COLOR.libre, tooltip: 'Un bloque de Python escrito a mano.'
    },
    {
      type: 'py_hueco', message0: '✎ %1', args0: [{ type: 'field_input', name: 'CODIGO', text: '' }],
      output: null, colour: COLOR.hueco,
      tooltip: 'Hueco: escribe aquí la expresión en Python (también puedes escribirla en el panel de Python).'
    }
  ];

  function registrar() {
    if (registrar.hecho) return;
    registrar.hecho = true;
    Blockly.defineBlocksWithJsonArray(definiciones);

    // Validadores y avisos que no caben en JSON
    const conValidador = (tipo, campo, fn) => {
      const init = Blockly.Blocks[tipo].init;
      Blockly.Blocks[tipo].init = function () {
        init.call(this);
        this.getField(campo).setValidator(fn);
      };
    };
    conValidador('py_number', 'NUM', validarNumero);
    conValidador('py_def', 'NOMBRE', validarNombre);
    conValidador('py_def', 'PARAMS', validarParametros);
    conValidador('py_kwarg', 'NOMBRE', validarNombre);
    for (const t of ['py_string', 'py_fstring', 'py_comment']) conValidador(t, 'TEXTO', comillas);
    for (const t of ['py_raw_stmt', 'py_raw_expr', 'py_hueco']) conValidador(t, 'CODIGO', comillas);
    conValidador('py_raw_block', 'CABECERA', comillas);

    const avisar = (tipo, fn) => { Blockly.Blocks[tipo].onchange = conAviso(fn); };
    avisar('py_elif', function () {
      const a = bloqueAnterior(this);
      return a && (a.type === 'py_if' || a.type === 'py_elif') ? null : 'elif debe ir justo debajo de un bloque if o de otro elif.';
    });
    avisar('py_else', function () {
      const a = bloqueAnterior(this);
      return a && ['py_if', 'py_elif', 'py_for', 'py_while', 'py_raw_block'].includes(a.type) ? null : 'else debe ir justo debajo de un bloque if o elif.';
    });
    avisar('py_break', function () { return dentroDe(this, ['py_for', 'py_while']) ? null : 'break solo funciona dentro de un bucle for o while.'; });
    avisar('py_continue', function () { return dentroDe(this, ['py_for', 'py_while']) ? null : 'continue solo funciona dentro de un bucle for o while.'; });
    avisar('py_return', function () { return dentroDe(this, ['py_def']) ? null : 'return solo funciona dentro de una función (def).'; });

    // Bloques variádicos
    definirVariadico('py_print', { etiqueta: 'print(', cierre: ')', min: 0, max: 8, inicio: 1, color: COLOR.salida, salida: false, tooltip: 'Muestra en pantalla. Con + agregas más piezas separadas por comas.' });
    definirVariadico('py_list', { etiqueta: '[', cierre: ']', min: 0, max: 12, inicio: 3, color: COLOR.listas, salida: true, tooltip: 'Una lista: varios valores en orden, separados por comas.' });
    definirVariadico('py_range', { etiqueta: 'range(', cierre: ')', min: 1, max: 3, inicio: 1, color: COLOR.control, salida: true, tooltip: 'range(5) → 0,1,2,3,4 · range(1, 6) → 1…5 · range(0, 10, 2) → de 2 en 2.' });
    definirVariadico('py_call', { cierre: ')', min: 0, max: 8, inicio: 0, color: COLOR.funciones, salida: true, campoNombre: true, tooltip: 'Usa (llama) una función y obtén lo que devuelve.' });
    definirVariadico('py_call_stmt', { cierre: ')', min: 0, max: 8, inicio: 0, color: COLOR.funciones, salida: false, campoNombre: true, tooltip: 'Usa (llama) una función.' });
    definirVariadico('py_method_call', { cierre: ')', min: 0, max: 8, inicio: 0, color: COLOR.libre, salida: true, campoObjeto: true, tooltip: 'Llama un método de un objeto.' });
    for (const t of ['py_call', 'py_call_stmt', 'py_method_call']) {
      const init = Blockly.Blocks[t].init;
      Blockly.Blocks[t].init = function () { init.call(this); this.getField('NOMBRE').setValidator(validarNombre); };
    }

    // Los huecos se dibujan punteados desde la hoja de estilos (por su color).
  }

  return { registrar, COLOR, validarNumero };
})();
