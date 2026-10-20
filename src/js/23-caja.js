/* =========================================================================
 * 23-caja.js — Caja de herramientas por sesión y creación de espacios de
 * trabajo de Blockly (tema, diálogos propios, categorías dinámicas).
 * ========================================================================= */
'use strict';

PB.blockly = (() => {
  const C = () => PB.bloques.COLOR;
  const B = (type, fields, extra) => ({ block: Object.assign({ type }, fields ? { fields } : {}, extra || {}) });
  const HUECO = () => ({ shadow: { type: 'py_hueco', fields: { CODIGO: '' } } });
  const num = (n) => B('py_number', { NUM: String(n) });
  const txt = (t) => B('py_string', { TEXTO: t });

  /* Catálogo: tipo de bloque, categoría, sesión en que aparece y contenido
   * por defecto (modo 1) y, si cambia, en el modo 2 (con huecos). */
  const CATALOGO = [
    { tipo: 'py_print', cat: 'salida', s: 0, m1: { extraState: { n: 1 }, inputs: { ARG0: txt('¡Hola!') } } },
    { tipo: 'py_input', cat: 'salida', s: 3, m1: { inputs: { PROMPT: txt('¿Cómo te llamas? ') } } },
    { tipo: 'py_convert', cat: 'salida', s: 3, m1: { fields: { TIPO: 'int' }, inputs: { VALOR: B('py_input', null, { inputs: { PROMPT: txt('¿Cuántos años tienes? ') } }) } } },
    { tipo: 'py_convert', cat: 'salida', s: 3, m1: { fields: { TIPO: 'str' } } },
    { tipo: 'py_kwarg', cat: 'salida', s: 8, m1: { fields: { NOMBRE: 'end' }, inputs: { VALOR: txt('') } } },
    { tipo: 'py_comment', cat: 'salida', s: 1, m1: { fields: { TEXTO: 'comentario' } } },

    { tipo: 'py_number', cat: 'operadores', s: 1, m1: { fields: { NUM: '0' } } },
    { tipo: 'py_arith', cat: 'operadores', s: 2, m1: { fields: { OP: '+' } } },
    { tipo: 'py_arith', cat: 'operadores', s: 2, m1: { fields: { OP: '*' } } },
    { tipo: 'py_round', cat: 'operadores', s: 2, m1: { inputs: { N: num(2) } } },
    { tipo: 'py_bool', cat: 'operadores', s: 5, m1: { fields: { VALOR: 'True' } } },
    { tipo: 'py_compare', cat: 'operadores', s: 5, m1: { fields: { OP: '==' } } },
    { tipo: 'py_compare', cat: 'operadores', s: 5, m1: { fields: { OP: '>=' } } },
    { tipo: 'py_logic', cat: 'operadores', s: 6, m1: { fields: { OP: 'and' } } },
    { tipo: 'py_logic', cat: 'operadores', s: 6, m1: { fields: { OP: 'or' } } },
    { tipo: 'py_not', cat: 'operadores', s: 6 },
    { tipo: 'py_in', cat: 'operadores', s: 12, m1: { fields: { OP: 'in' } } },

    { tipo: 'py_string', cat: 'texto', s: 0, m1: { fields: { TEXTO: 'Hola' } } },
    { tipo: 'py_arith', cat: 'texto', s: 4, m1: { fields: { OP: '+' }, inputs: { A: txt('Hola, ') } } },
    { tipo: 'py_fstring', cat: 'texto', s: 4, m1: { fields: { TEXTO: 'Hola {nombre}' } } },
    { tipo: 'py_len', cat: 'texto', s: 4 },
    { tipo: 'py_str_method', cat: 'texto', s: 4, m1: { fields: { METODO: 'upper' } } },

    { tipo: 'py_if', cat: 'decisiones', s: 5, m2: { inputs: { COND: HUECO() } } },
    { tipo: 'py_elif', cat: 'decisiones', s: 6, m2: { inputs: { COND: HUECO() } } },
    { tipo: 'py_else', cat: 'decisiones', s: 5 },
    { tipo: 'py_pass', cat: 'decisiones', s: 5 },

    { tipo: 'py_for', cat: 'bucles', s: 8, m1: { fields: { VAR: { name: 'i' } }, inputs: { ITER: B('py_range', null, { extraState: { n: 1 }, inputs: { ARG0: num(5) } }) } },
      m2: { fields: { VAR: { name: 'i' } }, inputs: { ITER: B('py_range', null, { extraState: { n: 1 }, inputs: { ARG0: HUECO() } }) } } },
    { tipo: 'py_range', cat: 'bucles', s: 8, m1: { extraState: { n: 2 }, inputs: { ARG0: num(1), ARG1: num(6) } } },
    { tipo: 'py_while', cat: 'bucles', s: 9, m2: { inputs: { COND: HUECO() } } },
    { tipo: 'py_break', cat: 'bucles', s: 10 },
    { tipo: 'py_continue', cat: 'bucles', s: 10 },

    { tipo: 'py_list', cat: 'listas', s: 11, m1: { extraState: { n: 3 } } },
    { tipo: 'py_list', cat: 'listas', s: 11, m1: { extraState: { n: 0 } } },
    { tipo: 'py_index', cat: 'listas', s: 11, m1: { inputs: { INDICE: num(0) } } },
    { tipo: 'py_index_set', cat: 'listas', s: 11, m1: { inputs: { INDICE: num(0) } } },
    { tipo: 'py_append', cat: 'listas', s: 11, m1: { fields: { METODO: 'append' } } },
    { tipo: 'py_len', cat: 'listas', s: 11 },
    { tipo: 'py_func1', cat: 'listas', s: 12, m1: { fields: { FUNC: 'max' } } },
    { tipo: 'py_func1', cat: 'listas', s: 12, m1: { fields: { FUNC: 'sum' } } },
    { tipo: 'py_in', cat: 'listas', s: 12, m1: { fields: { OP: 'in' } } },

    { tipo: 'py_import', cat: 'azar', s: 9, m1: { fields: { MODULO: 'random' } } },
    { tipo: 'py_randint', cat: 'azar', s: 9, m1: { inputs: { A: num(1), B: num(10) } } },
    { tipo: 'py_choice', cat: 'azar', s: 12 },

    { tipo: 'py_hueco', cat: 'libre', s: 5, modoMin: 2 },
    { tipo: 'py_raw_expr', cat: 'libre', s: 5, modoMin: 2, m1: { fields: { CODIGO: '' } } },
    { tipo: 'py_raw_stmt', cat: 'libre', s: 5, modoMin: 2, m1: { fields: { CODIGO: '' } } }
  ];

  // Bloques de las categorías dinámicas (para poder restringirlos)
  const DINAMICOS = {
    variables: [{ tipo: 'py_assign', s: 2 }, { tipo: 'py_var', s: 2 }, { tipo: 'py_augassign', s: 10 }],
    funciones: [{ tipo: 'py_def', s: 13 }, { tipo: 'py_return', s: 14 }, { tipo: 'py_call_stmt', s: 13 }, { tipo: 'py_call', s: 14 }]
  };

  const CATEGORIAS = [
    { id: 'salida', nombre: 'Entrada y salida', color: () => C().salida },
    { id: 'variables', nombre: 'Variables', color: () => C().variables, dinamica: 'PY_VARIABLES' },
    { id: 'operadores', nombre: 'Operadores', color: () => C().operadores },
    { id: 'texto', nombre: 'Texto', color: () => C().texto },
    { id: 'decisiones', nombre: 'Decisiones', color: () => C().control },
    { id: 'bucles', nombre: 'Bucles', color: () => C().control },
    { id: 'listas', nombre: 'Listas', color: () => C().listas },
    { id: 'azar', nombre: 'Azar', color: () => C().azar },
    { id: 'funciones', nombre: 'Funciones', color: () => C().funciones, dinamica: 'PY_FUNCIONES' },
    { id: 'libre', nombre: 'Escribir Python', color: () => C().libre }
  ];

  /** ¿Se puede usar este tipo de bloque en esta situación? */
  function permitido(tipo, s, contexto) {
    if (contexto.permitidos) return contexto.permitidos.includes(tipo);
    return s <= contexto.sesion;
  }

  /** Arma la caja de herramientas para una sesión y un modo. */
  function construirCaja({ sesion, modo, permitidos }) {
    const ctx = { sesion, modo, permitidos };
    const contenido = [];
    for (const cat of CATEGORIAS) {
      if (cat.dinamica) {
        const lista = DINAMICOS[cat.id].filter(d => permitido(d.tipo, d.s, ctx));
        if (!lista.length) continue;
        contenido.push({ kind: 'category', name: cat.nombre, colour: cat.color(), custom: cat.dinamica });
        continue;
      }
      const bloques = CATALOGO
        .filter(e => e.cat === cat.id && permitido(e.tipo, e.s, ctx) && (!e.modoMin || modo >= e.modoMin || (permitidos && permitidos.includes(e.tipo))))
        .map(e => Object.assign({ kind: 'block', type: e.tipo }, PB.util.clonar((modo === 2 && e.m2) || e.m1 || {})));
      // Evitar repetidos exactos
      const vistos = new Set();
      const unicos = bloques.filter(b => { const k = JSON.stringify(b); if (vistos.has(k)) return false; vistos.add(k); return true; });
      if (!unicos.length) continue;
      contenido.push({ kind: 'category', name: cat.nombre, colour: cat.color(), contents: unicos });
    }
    return { kind: 'categoryToolbox', contents: contenido };
  }

  /* ---------- Configuración global de Blockly (una sola vez) ---------- */
  let tema = null;
  let configurado = false;
  function configurar() {
    if (configurado) return;
    configurado = true;
    PB.bloques.registrar();
    try {
      tema = Blockly.Theme.defineTheme('pb-tema', {
        base: Blockly.Themes.Zelos || Blockly.Themes.Classic,
        componentStyles: {
          workspaceBackgroundColour: '#F8F9FC',
          toolboxBackgroundColour: '#FFFFFF',
          toolboxForegroundColour: '#3A3F58',
          flyoutBackgroundColour: '#EEF1F8',
          flyoutForegroundColour: '#3A3F58',
          flyoutOpacity: 1,
          scrollbarColour: '#C5CBDD',
          scrollbarOpacity: 0.8,
          insertionMarkerColour: '#000000',
          insertionMarkerOpacity: 0.2
        },
        fontStyle: { family: '"Nunito", "Segoe UI", system-ui, sans-serif', weight: '700', size: 12 },
        startHats: false
      });
    } catch (e) { tema = null; }

    Blockly.dialog.setAlert((msg, cb) => { PB.ui.alerta(msg).then(() => cb && cb()); });
    Blockly.dialog.setConfirm((msg, cb) => { PB.ui.confirmar(msg).then(v => cb && cb(v)); });
    Blockly.dialog.setPrompt((msg, porDefecto, cb) => {
      PB.ui.pedirTexto(msg, porDefecto, { titulo: 'Nombre de variable', validar: PB.py.problemaConNombre }).then(v => cb(v));
    });
    const M = Blockly.Msg;
    M.NEW_VARIABLE = 'Crear variable…';
    M.RENAME_VARIABLE = 'Cambiar nombre de la variable…';
    M.DELETE_VARIABLE = 'Borrar la variable «%1»';
    M.VARIABLE_ALREADY_EXISTS = 'Ya existe una variable llamada «%1».';
  }

  /* ---------- Categorías dinámicas ---------- */
  function registrarDinamicas(ws, ctx) {
    ws.registerButtonCallback('CREAR_VARIABLE', async () => {
      const nombre = await PB.ui.pedirTexto('Escribe el nombre de la nueva variable (sin espacios ni acentos):', '', {
        titulo: 'Nueva variable', placeholder: 'por ejemplo: puntos',
        validar: n => PB.py.problemaConNombre(n) || (ws.getVariable(n) ? 'Ya existe una variable con ese nombre.' : null)
      });
      if (nombre) {
        ws.createVariable(nombre);
        ws.ultimaVariable_ = nombre;
        const caja = ws.getToolbox();
        if (caja && caja.refreshSelection) caja.refreshSelection();
      }
    });

    ws.registerToolboxCategoryCallback('PY_VARIABLES', (w) => {
      const items = [{ kind: 'button', text: '➕ Crear variable', callbackKey: 'CREAR_VARIABLE' }];
      const vars = w.getVariablesOfType('').map(v => v.name).sort((a, b) => a.localeCompare(b));
      const puede = (t) => permitido(t, DINAMICOS.variables.find(d => d.tipo === t).s, ctx);
      if (!vars.length) {
        items.push({ kind: 'label', text: 'Primero crea una variable.' });
        return items;
      }
      const principal = vars.includes(w.ultimaVariable_) ? w.ultimaVariable_ : vars[0];
      if (puede('py_assign')) {
        items.push({ kind: 'block', type: 'py_assign', fields: { VAR: { name: principal } },
          inputs: { VALOR: ctx.modo === 2 ? HUECO() : num(0) } });
      }
      if (puede('py_augassign')) {
        items.push({ kind: 'block', type: 'py_augassign', fields: { VAR: { name: principal }, OP: '+=' },
          inputs: { VALOR: ctx.modo === 2 ? HUECO() : num(1) } });
      }
      if (puede('py_var')) {
        for (const v of vars) items.push({ kind: 'block', type: 'py_var', fields: { VAR: { name: v } } });
      }
      return items;
    });

    ws.registerToolboxCategoryCallback('PY_FUNCIONES', (w) => {
      const items = [];
      const puede = (t) => permitido(t, DINAMICOS.funciones.find(d => d.tipo === t).s, ctx);
      if (puede('py_def')) items.push({ kind: 'block', type: 'py_def', fields: { NOMBRE: 'saludar', PARAMS: '' } });
      if (puede('py_return')) items.push({ kind: 'block', type: 'py_return' });
      const defs = w.getAllBlocks(false).filter(b => b.type === 'py_def' && !b.isInFlyout);
      const nombres = new Map();
      for (const d of defs) {
        const params = d.getFieldValue('PARAMS').trim();
        nombres.set(d.getFieldValue('NOMBRE'), params ? params.split(',').length : 0);
      }
      if (nombres.size) items.push({ kind: 'label', text: 'Tus funciones:' });
      for (const [nombre, n] of nombres) {
        if (puede('py_call_stmt')) items.push({ kind: 'block', type: 'py_call_stmt', fields: { NOMBRE: nombre }, extraState: { n } });
        if (puede('py_call')) items.push({ kind: 'block', type: 'py_call', fields: { NOMBRE: nombre }, extraState: { n } });
      }
      if (!nombres.size && puede('py_call_stmt')) {
        items.push({ kind: 'label', text: 'Cuando definas una función, aquí aparecerá para usarla.' });
      }
      return items;
    });
  }

  function opcionesBase(extra) {
    return Object.assign({
      renderer: 'zelos',
      theme: tema || undefined,
      media: PB.config.rutaMediaBlockly,
      sounds: false,
      trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 0.85, maxScale: 2.2, minScale: 0.35, scaleSpeed: 1.15, pinch: true },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 28, length: 3, colour: '#E2E6F0', snap: false },
      oneBasedIndex: false
    }, extra || {});
  }

  /** Espacio de trabajo editable. */
  function crearEspacio(div, { sesion, modo, permitidos, escala }) {
    configurar();
    const ctx = { sesion, modo, permitidos };
    const ws = Blockly.inject(div, opcionesBase({
      toolbox: construirCaja(ctx),
      zoom: { controls: true, wheel: true, startScale: escala || 0.85, maxScale: 2.2, minScale: 0.35, scaleSpeed: 1.15, pinch: true }
    }));
    registrarDinamicas(ws, ctx);
    arreglarMedia(div);
    return ws;
  }

  /** Espacio de trabajo de solo lectura (ejemplos, pistas, preguntas). */
  function crearLectura(div, escala = 0.8) {
    configurar();
    const ws = Blockly.inject(div, opcionesBase({
      readOnly: true, trashcan: false,
      zoom: { controls: true, wheel: false, startScale: escala, maxScale: 2, minScale: 0.3, pinch: true },
      move: { scrollbars: true, drag: true, wheel: true }
    }));
    arreglarMedia(div);
    return ws;
  }

  /** En la versión sin conexión, los íconos de Blockly vienen incrustados. */
  function arreglarMedia(div) {
    if (!PB.config.spritesBlockly) return;
    for (const img of div.querySelectorAll('image')) {
      const href = img.getAttribute('xlink:href') || img.getAttribute('href') || '';
      if (href.endsWith('sprites.png')) {
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', PB.config.spritesBlockly);
        img.setAttribute('href', PB.config.spritesBlockly);
      }
    }
  }

  /** Pone una escala legible y muestra el programa desde su esquina superior izquierda. */
  function encuadrar(ws, escala = 0.85) {
    try {
      Blockly.svgResize(ws);
      ws.setScale(escala);
      if (!ws.getTopBlocks(false).length) { ws.scrollCenter(); return; }
      const m = ws.getMetrics();
      ws.scroll(-(m.contentLeft - 16), -(m.contentTop - 16));
    } catch (e) { /* sin bloques */ }
  }

  return { construirCaja, crearEspacio, crearLectura, encuadrar, configurar, CATALOGO };
})();
