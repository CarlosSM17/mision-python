/* =========================================================================
 * 67-exploradores.js — Exploradores interactivos para la teoría.
 * Widgets que responden al instante (sin ejecutar Python): el alumno cambia
 * valores y ve el resultado y el código equivalente.
 * ========================================================================= */
'use strict';

PB.exploradores = (() => {
  const { el, vaciar, esc } = PB.util;
  const cod = (t) => { const c = el('code'); c.innerHTML = PB.py.resaltar(String(t))[0] || ''; return c; };
  const campo = (valor, attrs = {}) => el('input', Object.assign({ class: 'campo exp-campo', type: 'text', value: valor, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off' }, attrs));
  const COLOR_TIPO = { int: '#4C97FF', float: '#0FBD8C', str: '#9966FF', bool: '#FF8C1A', list: '#FF661A' };
  const ICONO_TIPO = { int: '🔢', float: '🌡️', str: '🔤', bool: '💡', list: '🎒' };

  /* ---------- Mini intérprete de valores de Python ---------- */
  const reprFloat = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(Math.round(x * 1e10) / 1e10));
  function valorPy(txt) {
    const t = PB.util.quitarComillasTipograficas(String(txt)).trim();
    if (/^-?\d+$/.test(t)) return { tipo: 'int', v: parseInt(t, 10) };
    if (/^-?(\d+\.\d*|\.\d+)$/.test(t)) return { tipo: 'float', v: parseFloat(t) };
    if (/^"[^"]*"$|^'[^']*'$/.test(t)) return { tipo: 'str', v: t.slice(1, -1) };
    if (t === 'True' || t === 'False') return { tipo: 'bool', v: t === 'True' };
    if (t === 'true' || t === 'false') return { error: 'NameError', msg: `Python no conoce «${t}». Los valores lógicos van con mayúscula: ${t[0].toUpperCase() + t.slice(1)}.` };
    if (/^[A-Za-z_]\w*$/.test(t)) return { nombre: t };
    if (!t) return { error: 'SyntaxError', msg: 'Escribe un valor.' };
    return { error: 'SyntaxError', msg: 'Eso no es un valor válido. Si es un texto, ponlo entre comillas: "así".' };
  }
  function repr(x) {
    if (x.tipo === 'str') return "'" + x.v + "'";
    if (x.tipo === 'float') return reprFloat(x.v);
    if (x.tipo === 'bool') return x.v ? 'True' : 'False';
    return String(x.v);
  }
  const mostrar = (x) => (x.tipo === 'str' ? x.v : repr(x));
  const insignia = (tipo) => el('span', { class: 'exp-tipo', style: { background: COLOR_TIPO[tipo] || '#888' } }, (ICONO_TIPO[tipo] || '') + ' ' + tipo);
  const errorCaja = (tipo, msg) => el('div', { class: 'exp-error' }, el('strong', {}, '⚠ ' + tipo + ': '), msg);

  function marco(cont, nombre) {
    const raiz = el('div', { class: 'exp exp-' + nombre });
    cont.appendChild(raiz);
    const usar = () => PB.juego.usarExplorador(nombre);
    raiz.addEventListener('pointerdown', usar, { once: true });
    raiz.addEventListener('input', usar, { once: true });
    raiz.appendChild(el('div', { class: 'exp-etiqueta' }, '🔬 Explorador: ¡prueba cambiando los valores!'));
    return raiz;
  }
  function chips(lista, alElegir) {
    return el('div', { class: 'exp-chips' }, ...lista.map(t => el('button', { class: 'exp-chip', onclick: () => alElegir(t) }, el('code', {}, t))));
  }
  function lineasCodigo(lineas, activas = [], tachadas = []) {
    const pre = el('div', { class: 'exp-codigo' });
    lineas.forEach((l, i) => {
      const n = i + 1;
      const d = el('div', { class: 'exp-linea' + (activas.includes(n) ? ' activa' : '') + (tachadas.includes(n) ? ' tachada' : '') }, el('span', { class: 'err-num' }, String(n)));
      const c = el('code'); c.innerHTML = PB.py.resaltar(l)[0] || ' ';
      d.appendChild(c);
      pre.appendChild(d);
    });
    return pre;
  }
  function consolaFalsa(texto, error) {
    const c = el('div', { class: 'exp-consola' });
    if (texto) c.appendChild(el('pre', {}, texto));
    if (error) c.appendChild(el('div', { class: 'exp-consola-error' }, error));
    if (!texto && !error) c.appendChild(el('span', { class: 'nota' }, '(nada)'));
    return c;
  }
  function paso(valor, min, max, alCambiar, etq) {
    let v = valor;
    const n = el('span', { class: 'exp-paso-n' }, String(v));
    const cambiar = (d) => { v = Math.max(min, Math.min(max, v + d)); n.textContent = String(v); alCambiar(v); };
    return el('div', { class: 'exp-paso' }, el('span', { class: 'exp-paso-etq' }, etq), el('button', { class: 'mini', onclick: () => cambiar(-1) }, '−'), n, el('button', { class: 'mini', onclick: () => cambiar(1) }, '+'));
  }

  /* ---------- Operaciones con semántica de Python ---------- */
  function operar(a, op, b) {
    const num = x => x.tipo === 'int' || x.tipo === 'float' || x.tipo === 'bool';
    const nv = x => (x.tipo === 'bool' ? (x.v ? 1 : 0) : x.v);
    if (op === '+' && a.tipo === 'str' && b.tipo === 'str') return { tipo: 'str', v: a.v + b.v };
    if (op === '*' && a.tipo === 'str' && b.tipo === 'int') return { tipo: 'str', v: a.v.repeat(Math.max(0, b.v)) };
    if (!num(a) || !num(b)) {
      if (a.tipo === 'str' || b.tipo === 'str') return { error: 'TypeError', msg: op === '+' ? 'No se puede unir texto con un número usando +. Convierte con str() o int().' : `No se puede usar ${op} entre texto y número.` };
    }
    const x = nv(a), y = nv(b);
    const esFloat = a.tipo === 'float' || b.tipo === 'float';
    switch (op) {
      case '+': return { tipo: esFloat ? 'float' : 'int', v: x + y };
      case '-': return { tipo: esFloat ? 'float' : 'int', v: x - y };
      case '*': return { tipo: esFloat ? 'float' : 'int', v: x * y };
      case '/': return y === 0 ? { error: 'ZeroDivisionError', msg: 'No se puede dividir entre cero.' } : { tipo: 'float', v: x / y };
      case '//': return y === 0 ? { error: 'ZeroDivisionError', msg: 'No se puede dividir entre cero.' } : { tipo: esFloat ? 'float' : 'int', v: Math.floor(x / y) };
      case '%': return y === 0 ? { error: 'ZeroDivisionError', msg: 'No se puede dividir entre cero.' } : { tipo: esFloat ? 'float' : 'int', v: x - y * Math.floor(x / y) };
      case '**': return { tipo: esFloat || y < 0 ? 'float' : 'int', v: Math.pow(x, y) };
    }
    return { error: 'SyntaxError', msg: 'Operador desconocido.' };
  }
  function comparar(a, op, b) {
    const num = x => x.tipo === 'int' || x.tipo === 'float' || x.tipo === 'bool';
    const nv = x => (x.tipo === 'bool' ? (x.v ? 1 : 0) : x.v);
    const mismos = (num(a) && num(b)) || (a.tipo === 'str' && b.tipo === 'str');
    if (op === '==') return { tipo: 'bool', v: mismos && nv(a) === nv(b) };
    if (op === '!=') return { tipo: 'bool', v: !(mismos && nv(a) === nv(b)) };
    if (!mismos) return { error: 'TypeError', msg: `No se puede comparar con ${op} un texto con un número. Convierte primero con int().` };
    const x = nv(a), y = nv(b);
    const r = { '<': x < y, '<=': x <= y, '>': x > y, '>=': x >= y }[op];
    return { tipo: 'bool', v: r };
  }

  /* ================================================================ */
  const EXP = {
    print(cont) {
      const r = marco(cont, 'print');
      const inp = campo('¡Hola, mundo!');
      let comillas = true;
      const toggle = el('button', { class: 'exp-toggle on', onclick: () => { comillas = !comillas; toggle.classList.toggle('on', comillas); toggle.textContent = comillas ? '✔ Con comillas' : '✘ Sin comillas'; pintar(); } }, '✔ Con comillas');
      const salida = el('div');
      r.append(el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'Mensaje:'), inp, toggle), salida);
      inp.addEventListener('input', pintar);
      function pintar() {
        vaciar(salida);
        const t = inp.value;
        const linea = comillas ? `print("${t}")` : `print(${t})`;
        salida.append(el('div', { class: 'exp-linea-grande' }, cod(linea)));
        if (comillas) { salida.append(consolaFalsa(t)); return; }
        const v = valorPy(t);
        if (v.error) salida.append(consolaFalsa('', v.error + ': ' + v.msg));
        else if (v.nombre) salida.append(consolaFalsa('', `NameError: Python busca una variable llamada «${v.nombre}» y no existe. Para mostrar el texto, ponlo entre comillas.`));
        else salida.append(consolaFalsa(mostrar(v)), el('p', { class: 'nota' }, 'Los números y True/False se pueden imprimir sin comillas.'));
      }
      pintar();
    },

    variables(cont) {
      const r = marco(cont, 'variables');
      const mem = new Map();
      const historial = [];
      const nombre = campo('puntos', { style: { maxWidth: '150px' } });
      const valor = campo('0', { style: { maxWidth: '200px' } });
      const cajas = el('div', { class: 'il-cajas exp-cajas' });
      const hist = el('div', { class: 'exp-historial' });
      const msg = el('div');
      let ultimo = null;
      const guardar = () => {
        vaciar(msg);
        const n = nombre.value.trim();
        const prob = PB.py.problemaConNombre(n);
        if (prob && !/ya es una función/.test(prob)) { msg.appendChild(errorCaja('Nombre no válido', prob)); return; }
        const res = evaluar(valor.value);
        if (res.error) { msg.appendChild(errorCaja(res.error, res.msg)); return; }
        mem.set(n, res);
        ultimo = n;
        historial.unshift(`${n} = ${valor.value.trim()}`);
        PB.juego.sonido('clic');
        pintar();
      };
      function evaluar(txt) {
        const m = /^(.+?)\s*([+\-*/])\s*(.+)$/.exec(txt.trim());
        const resolver = (t) => {
          const v = valorPy(t);
          if (v.nombre) return mem.has(v.nombre) ? mem.get(v.nombre) : { error: 'NameError', msg: `La variable «${v.nombre}» todavía no existe. Primero guárdale un valor.` };
          return v;
        };
        if (m && !/^["']/.test(txt.trim())) {
          const a = resolver(m[1]), b = resolver(m[3]);
          if (a.error) return a;
          if (b.error) return b;
          return operar(a, m[2], b);
        }
        return resolver(txt);
      }
      const btn = el('button', { class: 'btn btn-primario', onclick: guardar }, '= Guardar');
      valor.addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); });
      r.append(
        el('div', { class: 'exp-fila exp-asignacion' }, nombre, el('span', { class: 'exp-igual' }, '='), valor, btn),
        chips(['puntos = 0', 'puntos = puntos + 10', 'nombre = "Ana"', 'copia = puntos', 'vidas = 3'], t => { const [a, b] = t.split(' = '); nombre.value = a; valor.value = b; guardar(); }),
        msg, cajas, el('div', { class: 'exp-etq' }, '📜 Lo que ejecutaste:'), hist);
      function pintar() {
        vaciar(cajas);
        if (!mem.size) cajas.appendChild(el('span', { class: 'nota' }, 'Todavía no hay variables. ¡Guarda una!'));
        for (const [n, v] of mem) {
          cajas.appendChild(el('div', { class: 'il-caja' + (n === ultimo ? ' cambio' : '') },
            el('div', { class: 'il-caja-tapa' }), el('div', { class: 'il-caja-cuerpo' }, el('span', { class: 'il-caja-valor' }, repr(v))),
            el('div', { class: 'il-caja-etiqueta' }, n), insignia(v.tipo)));
        }
        vaciar(hist);
        historial.slice(0, 6).forEach(h => hist.appendChild(el('div', {}, cod(h))));
      }
      pintar();
    },

    tipos(cont) {
      const r = marco(cont, 'tipos');
      const inp = campo('7');
      const res = el('div', { class: 'exp-resultado-tipo' });
      const DESC = {
        int: 'Número entero: sin punto decimal. Sirve para contar.',
        float: 'Número decimal: lleva punto (no coma). Sirve para medir.',
        str: 'Texto: va entre comillas. ¡Aunque adentro haya un número, es texto!',
        bool: 'Valor lógico: solo puede ser True o False (con mayúscula).'
      };
      r.append(el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'Escribe un valor:'), inp),
        chips(['7', '3.14', '"7"', 'True', '"hola"', '-5', '2.0', 'true', 'hola'], t => { inp.value = t; pintar(); }), res);
      inp.addEventListener('input', pintar);
      function pintar() {
        vaciar(res);
        const v = valorPy(inp.value);
        if (v.error) { res.appendChild(errorCaja(v.error, v.msg)); return; }
        if (v.nombre) { res.appendChild(errorCaja('NameError', `«${v.nombre}» sin comillas es el nombre de una variable, no un texto. Escribe "${v.nombre}" para que sea str.`)); return; }
        res.append(
          el('div', { class: 'exp-tipo-grande', style: { '--c': COLOR_TIPO[v.tipo] } }, el('span', { class: 'exp-tipo-icono' }, ICONO_TIPO[v.tipo]), el('span', {}, v.tipo)),
          el('p', {}, DESC[v.tipo]),
          el('div', { class: 'exp-linea-grande' }, cod(`type(${inp.value.trim()})`), el('span', { class: 'exp-flecha' }, '→'), el('code', {}, `<class '${v.tipo}'>`)));
      }
      pintar();
    },

    operadores(cont) {
      const r = marco(cont, 'operadores');
      const a = campo('17', { inputmode: 'decimal', style: { maxWidth: '110px' } });
      const b = campo('5', { inputmode: 'decimal', style: { maxWidth: '110px' } });
      let op = '//';
      const botones = el('div', { class: 'exp-ops' });
      const res = el('div');
      ['+', '-', '*', '/', '//', '%', '**'].forEach(o => {
        const btn = el('button', { class: 'exp-op' + (o === op ? ' activo' : ''), onclick: () => { op = o; for (const x of botones.children) x.classList.toggle('activo', x.textContent === o); pintar(); } }, o);
        botones.appendChild(btn);
      });
      r.append(el('div', { class: 'exp-fila' }, a, el('span', { class: 'exp-igual' }, op), b), botones, res);
      a.addEventListener('input', pintar); b.addEventListener('input', pintar);
      function pintar() {
        r.querySelector('.exp-igual').textContent = op;
        vaciar(res);
        const x = valorPy(a.value), y = valorPy(b.value);
        if (x.error || x.nombre || y.error || y.nombre || x.tipo === 'str' || y.tipo === 'str') { res.appendChild(errorCaja('Atención', 'Escribe dos números.')); return; }
        const z = operar(x, op, y);
        if (z.error) { res.appendChild(errorCaja(z.error, z.msg)); return; }
        res.appendChild(el('div', { class: 'exp-linea-grande' }, cod(`${a.value.trim()} ${op} ${b.value.trim()}`), el('span', { class: 'exp-flecha' }, '→'), el('strong', { class: 'exp-res' }, repr(z)), insignia(z.tipo)));
        const xi = x.v, yi = y.v;
        if ((op === '//' || op === '%') && Number.isInteger(xi) && Number.isInteger(yi) && xi >= 0 && yi > 0 && xi <= 60) {
          const q = Math.floor(xi / yi), resto = xi % yi;
          const viz = el('div', { class: 'exp-puntos' });
          for (let g = 0; g < q; g++) viz.appendChild(el('div', { class: 'exp-grupo' }, ...Array.from({ length: yi }, () => el('span', { class: 'exp-punto' }))));
          if (resto) viz.appendChild(el('div', { class: 'exp-grupo resto' }, ...Array.from({ length: resto }, () => el('span', { class: 'exp-punto naranja' }))));
          res.append(viz, el('p', { class: 'exp-explica' }, `${xi} se reparte en ${q} grupo(s) de ${yi} y sobran ${resto}. `, el('strong', {}, op === '//' ? `// da los grupos: ${q}` : `% da lo que sobra: ${resto}`)));
        } else if (op === '**' && Number.isInteger(yi) && yi > 0 && yi <= 8) {
          res.appendChild(el('p', { class: 'exp-explica' }, `${xi} ** ${yi} es ${Array(yi).fill(xi).join(' × ')} = ${repr(z)}`));
        } else if (op === '/') {
          res.appendChild(el('p', { class: 'exp-explica' }, 'La división / siempre da un decimal (float), aunque sea exacta: 10 / 5 da 2.0'));
        } else if (op === '*' && Number.isInteger(xi) && Number.isInteger(yi) && xi > 0 && yi > 0 && xi * yi <= 60) {
          const viz = el('div', { class: 'exp-puntos' });
          for (let g = 0; g < xi; g++) viz.appendChild(el('div', { class: 'exp-grupo' }, ...Array.from({ length: yi }, () => el('span', { class: 'exp-punto' }))));
          res.append(viz, el('p', { class: 'exp-explica' }, `${xi} grupos de ${yi} = ${xi * yi}`));
        }
      }
      pintar();
    },

    texto(cont) {
      const r = marco(cont, 'texto');
      const inp = campo('Python');
      const vagones = el('div');
      const slider = el('input', { type: 'range', class: 'exp-slider', min: '0', max: '5', value: '0' });
      const res = el('div');
      let operacion = 'indice';
      const ops = [['indice', 'texto[i]'], ['len', 'len(texto)'], ['upper', '.upper()'], ['lower', '.lower()'], ['title', '.title()'], ['mas', 'texto + "!"'], ['por', 'texto * 3']];
      const fila = el('div', { class: 'exp-ops' });
      ops.forEach(([k, t]) => fila.appendChild(el('button', { class: 'exp-op' + (k === operacion ? ' activo' : ''), 'data-k': k, onclick: () => { operacion = k; for (const x of fila.children) x.classList.toggle('activo', x.dataset.k === k); pintar(); } }, t)));
      r.append(el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'texto ='), inp), vagones, el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'i ='), slider), fila, res);
      inp.addEventListener('input', pintar);
      slider.addEventListener('input', pintar);
      function pintar() {
        const t = inp.value;
        const n = t.length;
        slider.min = String(-n); slider.max = String(Math.max(0, n - 1));
        if (+slider.value > n - 1) slider.value = String(Math.max(0, n - 1));
        const i = +slider.value;
        vaciar(vagones);
        vagones.appendChild(PB.teoria.ilustracion('tren-texto', { texto: t || ' ' }));
        const idx = i < 0 ? n + i : i;
        const vs = vagones.querySelectorAll('.il-vagon');
        if (operacion === 'indice' && vs[idx]) vs[idx].classList.add('marcado');
        vaciar(res);
        let codigo, salida, err = null;
        const T = JSON.stringify(t);
        switch (operacion) {
          case 'indice': codigo = `texto[${i}]`; if (!n) err = 'IndexError: el texto está vacío.'; else salida = `'${t[idx]}'`; break;
          case 'len': codigo = 'len(texto)'; salida = String(n); break;
          case 'upper': codigo = 'texto.upper()'; salida = `'${t.toUpperCase()}'`; break;
          case 'lower': codigo = 'texto.lower()'; salida = `'${t.toLowerCase()}'`; break;
          case 'title': codigo = 'texto.title()'; salida = `'${t.toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())}'`; break;
          case 'mas': codigo = 'texto + "!"'; salida = `'${t}!'`; break;
          case 'por': codigo = 'texto * 3'; salida = `'${t.repeat(3)}'`; break;
        }
        res.appendChild(el('div', { class: 'exp-linea-grande' }, cod(codigo), el('span', { class: 'exp-flecha' }, '→'), err ? el('span', { class: 'exp-consola-error' }, err) : el('strong', { class: 'exp-res' }, salida)));
        if (operacion === 'indice') res.appendChild(el('p', { class: 'exp-explica' }, `Las posiciones empiezan en 0. Con números negativos se cuenta desde el final: ${T}[-1] es la última letra.`));
      }
      pintar();
    },

    comparar(cont) {
      const r = marco(cont, 'comparar');
      const a = campo('7', { style: { maxWidth: '130px' } });
      const b = campo('3', { style: { maxWidth: '130px' } });
      const op = el('select', { class: 'campo exp-select' }, ...['==', '!=', '<', '<=', '>', '>='].map(o => el('option', { value: o }, o)));
      op.value = '>';
      const res = el('div');
      r.append(el('div', { class: 'exp-fila' }, a, op, b),
        chips(['5 == 5', '"hola" == "Hola"', '3 < 10', '"5" == 5', '10 >= 10', '"abc" < "abd"', '7 != 7'], t => {
          const m = /^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/.exec(t);
          a.value = m[1]; op.value = m[2]; b.value = m[3]; pintar();
        }), res);
      [a, b].forEach(x => x.addEventListener('input', pintar));
      op.addEventListener('change', pintar);
      function pintar() {
        vaciar(res);
        const x = valorPy(a.value), y = valorPy(b.value);
        const malo = [x, y].find(v => v.error || v.nombre);
        if (malo) { res.appendChild(errorCaja(malo.error || 'NameError', malo.msg || `«${malo.nombre}» no es un valor. Si es texto, ponlo entre comillas.`)); return; }
        const z = comparar(x, op.value, y);
        if (z.error) { res.appendChild(errorCaja(z.error, z.msg)); return; }
        let inclinar = 0;
        if (x.tipo !== 'str' && y.tipo !== 'str') inclinar = (+x.v > +y.v) ? -10 : (+x.v < +y.v) ? 10 : 0;
        res.appendChild(PB.teoria.ilustracion('balanza', { izq: a.value.trim(), der: b.value.trim(), op: op.value, resultado: z.v ? 'True' : 'False', inclinar }));
        if (x.tipo === 'str' && y.tipo !== 'str' || y.tipo === 'str' && x.tipo !== 'str') res.appendChild(el('p', { class: 'exp-explica' }, 'Un texto nunca es igual a un número: "5" == 5 es False.'));
        else if (x.tipo === 'str') res.appendChild(el('p', { class: 'exp-explica' }, 'Los textos se comparan letra por letra y las MAYÚSCULAS cuentan como distintas.'));
      }
      pintar();
    },

    logica(cont) {
      const r = marco(cont, 'logica');
      let A = true, B = false;
      const zona = el('div');
      const interruptor = (etq, get, set) => {
        const b = el('button', { class: 'exp-switch', onclick: () => { set(!get()); PB.juego.sonido('clic'); pintar(); } });
        return { b, pintar: () => { b.classList.toggle('on', get()); b.innerHTML = `<span class="exp-switch-perilla"></span><span>${etq} = <b>${get() ? 'True' : 'False'}</b></span>`; } };
      };
      const sa = interruptor('A', () => A, v => { A = v; });
      const sb = interruptor('B', () => B, v => { B = v; });
      r.append(el('div', { class: 'exp-fila exp-switches' }, sa.b, sb.b), zona,
        el('p', { class: 'nota' }, 'Imagina: A = «hice la tarea», B = «ordené mi cuarto».'));
      function foco(expr, valor, explica) {
        return el('div', { class: 'exp-foco-fila' }, el('div', { class: 'exp-foco' + (valor ? ' on' : '') }, '💡'), cod(expr), el('strong', { class: valor ? 'si' : 'no' }, valor ? 'True' : 'False'), el('span', { class: 'nota' }, explica));
      }
      function pintar() {
        sa.pintar(); sb.pintar();
        vaciar(zona);
        zona.append(
          foco('A and B', A && B, 'se enciende solo si las dos son True'),
          foco('A or B', A || B, 'se enciende si al menos una es True'),
          foco('not A', !A, 'lo contrario de A'));
      }
      pintar();
    },

    si(cont) {
      const r = marco(cont, 'si');
      const slider = el('input', { type: 'range', class: 'exp-slider', min: '0', max: '10', step: '0.5', value: '7.5' });
      const valorTxt = el('strong', { class: 'exp-res' });
      const zona = el('div');
      r.append(el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'calificacion ='), slider, valorTxt), zona);
      slider.addEventListener('input', pintar);
      function pintar() {
        const v = +slider.value;
        const vt = reprFloat(v);
        valorTxt.textContent = vt;
        const ok = v >= 6;
        vaciar(zona);
        zona.append(
          el('div', { class: 'exp-dos' },
            lineasCodigo([`calificacion = ${vt}`, 'if calificacion >= 6:', '    print("Aprobado")', 'else:', '    print("Reprobado")'], ok ? [1, 2, 3] : [1, 2, 4, 5]),
            PB.teoria.ilustracion('camino-if', { condicion: `${vt} >= 6`, si: 'print("Aprobado")', no: 'print("Reprobado")', marcar: ok ? 'si' : 'no' })),
          el('div', { class: 'exp-linea-grande' }, cod(`${vt} >= 6`), el('span', { class: 'exp-flecha' }, '→'), el('strong', { class: ok ? 'si' : 'no' }, ok ? 'True' : 'False')),
          consolaFalsa(ok ? 'Aprobado' : 'Reprobado'));
      }
      pintar();
    },

    elif(cont) {
      const r = marco(cont, 'elif');
      const slider = el('input', { type: 'range', class: 'exp-slider', min: '-5', max: '40', step: '1', value: '25' });
      const valorTxt = el('strong', { class: 'exp-res' });
      const zona = el('div');
      r.append(el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 't ='), slider, valorTxt, el('span', {}, '°C')), zona);
      slider.addEventListener('input', pintar);
      const casos = [[30, 'Calor 🥵'], [20, 'Templado 😎'], [10, 'Fresco 🧥'], [null, 'Frío 🥶']];
      function pintar() {
        const t = +slider.value;
        valorTxt.textContent = String(t);
        const k = casos.findIndex(([lim]) => lim === null || t >= lim);
        vaciar(zona);
        const lineas = ['if t >= 30:', '    print("Calor")', 'elif t >= 20:', '    print("Templado")', 'elif t >= 10:', '    print("Fresco")', 'else:', '    print("Frío")'];
        const activas = [];
        for (let j = 0; j <= k; j++) activas.push(j * 2 + 1);
        activas.push(k * 2 + 2);
        const evaluaciones = el('div', { class: 'exp-evals' });
        casos.forEach(([lim, nombre], j) => {
          if (j > k || lim === null) return;
          const ok = t >= lim;
          evaluaciones.appendChild(el('div', { class: 'exp-eval ' + (ok ? 'si' : 'no') }, cod(`${t} >= ${lim}`), ok ? ' ✔ True → ¡se ejecuta y termina!' : ' ✘ False → sigue revisando'));
        });
        if (casos[k][0] === null) evaluaciones.appendChild(el('div', { class: 'exp-eval si' }, 'Ninguna fue True → se ejecuta el else'));
        zona.append(el('div', { class: 'exp-dos' }, lineasCodigo(lineas, activas), evaluaciones), consolaFalsa(casos[k][1].split(' ')[0]),
          el('div', { class: 'exp-termometro' }, el('div', { class: 'exp-termometro-relleno', style: { width: ((t + 5) / 45 * 100) + '%' } }), el('span', {}, casos[k][1])));
      }
      pintar();
    },

    range(cont) {
      const r = marco(cont, 'range');
      let ini = 0, fin = 5, pasoV = 1, animando = null;
      const zona = el('div');
      PB.app.alSalir(() => clearInterval(animando));
      r.append(el('div', { class: 'exp-fila exp-pasos' },
        paso(ini, -10, 20, v => { ini = v; pintar(); }, 'inicio'),
        paso(fin, -10, 30, v => { fin = v; pintar(); }, 'fin'),
        paso(pasoV, -5, 5, v => { pasoV = v; pintar(); }, 'paso')), zona);
      function numeros() {
        const r2 = [];
        if (pasoV === 0) return null;
        for (let k = ini; pasoV > 0 ? k < fin : k > fin; k += pasoV) { r2.push(k); if (r2.length > 60) break; }
        return r2;
      }
      function pintar() {
        clearInterval(animando);
        vaciar(zona);
        const codigo = pasoV === 1 && ini === 0 ? `range(${fin})` : pasoV === 1 ? `range(${ini}, ${fin})` : `range(${ini}, ${fin}, ${pasoV})`;
        zona.appendChild(el('div', { class: 'exp-linea-grande' }, cod(codigo)));
        const ns = numeros();
        if (ns === null) { zona.appendChild(errorCaja('ValueError', 'El paso no puede ser 0: nunca avanzaría.')); return; }
        const fila = el('div', { class: 'exp-numeros' });
        ns.forEach(n => fila.appendChild(el('span', { class: 'exp-num' }, String(n))));
        if (!ns.length) fila.appendChild(el('span', { class: 'nota' }, 'No genera ningún número (revisa el inicio, el fin y el paso). El for no daría ninguna vuelta.'));
        const consola = el('pre', { class: 'exp-consola-pre' });
        zona.append(fila, el('p', { class: 'exp-explica' }, `Empieza en ${ini}, avanza de ${pasoV} en ${pasoV} y se detiene ANTES de llegar a ${fin}.`),
          el('button', { class: 'btn btn-suave', onclick: () => recorrer(fila, consola, codigo, ns) }, '▶ Recorrer con for'), consola);
      }
      function recorrer(fila, consola, codigo, ns) {
        clearInterval(animando);
        consola.textContent = `for i in ${codigo}:\n    print(i)\n\n`;
        let k = 0;
        const chipsN = fila.querySelectorAll('.exp-num');
        animando = setInterval(() => {
          chipsN.forEach((c, j) => c.classList.toggle('activo', j === k));
          if (k >= ns.length) { clearInterval(animando); return; }
          consola.textContent += ns[k] + '\n';
          PB.juego.sonido('tic');
          k++;
        }, 500);
      }
      pintar();
    },

    while(cont) {
      const r = marco(cont, 'while');
      let inicio = 3, olvido = false, timer = null;
      let st;
      const zona = el('div');
      PB.app.alSalir(() => clearInterval(timer));
      const btnOlvido = el('button', { class: 'exp-toggle', onclick: () => { olvido = !olvido; btnOlvido.classList.toggle('on', olvido); reiniciar(); } }, '😱 Olvidar n = n - 1');
      r.append(el('div', { class: 'exp-fila' }, paso(inicio, 0, 9, v => { inicio = v; reiniciar(); }, 'n empieza en'), btnOlvido), zona);
      function reiniciar() { clearInterval(timer); st = { pc: 0, n: inicio, salida: '', vueltas: 0, fin: false, cond: null }; pintar(); }
      function avanzar() {
        if (st.fin) return;
        const pc = st.pc;
        if (pc === 0) st.pc = 1;
        else if (pc === 1) { st.cond = st.n > 0; st.pc = st.cond ? 2 : 4; }
        else if (pc === 2) { st.salida += st.n + '\n'; st.pc = 3; }
        else if (pc === 3) { if (!olvido) st.n -= 1; st.vueltas++; st.pc = 1; if (olvido && st.vueltas >= 6) { st.fin = true; st.infinito = true; } }
        else if (pc === 4) { st.salida += '¡Despegue!\n'; st.fin = true; st.pc = 5; }
        PB.juego.sonido('tic');
        pintar();
      }
      function pintar() {
        vaciar(zona);
        const activa = [st.pc + 1].filter(n => n <= 5);
        const cond = st.cond === null ? null : st.cond;
        zona.append(
          el('div', { class: 'exp-dos' },
            lineasCodigo([`n = ${inicio}`, 'while n > 0:', '    print(n)', '    n = n - 1', 'print("¡Despegue!")'], st.fin ? [] : activa, olvido ? [4] : []),
            el('div', {},
              el('div', { class: 'il-cajas' }, el('div', { class: 'il-caja cambio' }, el('div', { class: 'il-caja-tapa' }), el('div', { class: 'il-caja-cuerpo' }, el('span', { class: 'il-caja-valor' }, String(st.n))), el('div', { class: 'il-caja-etiqueta' }, 'n'))),
              cond !== null ? el('div', { class: 'exp-eval ' + (cond ? 'si' : 'no') }, cod(`${st.n} > 0`), cond ? ' ✔ True: entra al bucle' : ' ✘ False: sale del bucle') : null,
              el('div', { class: 'nota' }, `Vueltas: ${st.vueltas}`))),
          st.infinito ? errorCaja('¡Bucle infinito!', 'n nunca cambia, así que n > 0 siempre es True. El programa se repetiría para siempre (la plataforma lo detendría).') : null,
          consolaFalsa(st.salida.trim()),
          el('div', { class: 'exp-fila' },
            el('button', { class: 'btn btn-primario', disabled: st.fin, onclick: avanzar }, '👣 Paso'),
            el('button', { class: 'btn btn-suave', disabled: st.fin, onclick: () => { clearInterval(timer); timer = setInterval(() => { if (st.fin) clearInterval(timer); else avanzar(); }, 450); } }, '▶ Ejecutar todo'),
            el('button', { class: 'btn btn-suave', onclick: reiniciar }, '↺ Reiniciar')));
      }
      reiniciar();
    },

    listas(cont) {
      const r = marco(cont, 'listas');
      const lista = ['lápiz', 'cuaderno', 'regla'];
      const log = ['mochila = ["lápiz", "cuaderno", "regla"]'];
      const inp = campo('goma', { style: { maxWidth: '160px' } });
      const slider = el('input', { type: 'range', class: 'exp-slider', min: '-4', max: '3', value: '0' });
      const zona = el('div');
      const accion = (fn, linea) => { const err = fn(); if (!err) log.unshift(linea); PB.juego.sonido('clic'); pintar(err); };
      r.append(
        el('div', { class: 'exp-fila' }, inp,
          el('button', { class: 'btn btn-chico btn-suave', onclick: () => accion(() => { lista.push(inp.value); }, `mochila.append("${inp.value}")`) }, '.append()'),
          el('button', { class: 'btn btn-chico btn-suave', onclick: () => accion(() => { lista.splice(0, 0, inp.value); }, `mochila.insert(0, "${inp.value}")`) }, '.insert(0, …)'),
          el('button', { class: 'btn btn-chico btn-suave', onclick: () => accion(() => { const k = lista.indexOf(inp.value); if (k < 0) return `ValueError: «${inp.value}» no está en la lista.`; lista.splice(k, 1); }, `mochila.remove("${inp.value}")`) }, '.remove()'),
          el('button', { class: 'btn btn-chico btn-suave', onclick: () => accion(() => { if (!lista.length) return 'IndexError: la lista está vacía.'; lista.pop(); }, 'mochila.pop()') }, '.pop()')),
        el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'i ='), slider), zona);
      slider.addEventListener('input', () => pintar());
      function pintar(err) {
        const n = lista.length;
        slider.min = String(-n - 1); slider.max = String(n);
        const i = +slider.value;
        vaciar(zona);
        const est = PB.teoria.ilustracion('estante-lista', { nombre: 'mochila', elementos: lista.map(x => JSON.stringify(x)) });
        const idx = i < 0 ? n + i : i;
        const objs = est.querySelectorAll('.il-objeto');
        if (objs[idx] && idx >= 0) objs[idx].classList.add('marcado');
        zona.append(est,
          el('div', { class: 'exp-linea-grande' }, cod(`mochila[${i}]`), el('span', { class: 'exp-flecha' }, '→'),
            idx >= 0 && idx < n ? el('strong', { class: 'exp-res' }, `'${lista[idx]}'`) : el('span', { class: 'exp-consola-error' }, 'IndexError: esa posición no existe')),
          el('div', { class: 'exp-linea-grande' }, cod('len(mochila)'), el('span', { class: 'exp-flecha' }, '→'), el('strong', { class: 'exp-res' }, String(n))),
          err ? errorCaja(err.split(':')[0], err.split(':').slice(1).join(':')) : null,
          el('div', { class: 'exp-etq' }, '📜 Lo que ejecutaste:'), el('div', { class: 'exp-historial' }, ...log.slice(0, 5).map(l => el('div', {}, cod(l)))));
      }
      pintar();
    },

    recorrer(cont) {
      const r = marco(cont, 'recorrer');
      const inp = campo('8, 9, 7, 10');
      const zona = el('div');
      let timer = null;
      PB.app.alSalir(() => clearInterval(timer));
      r.append(el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'calificaciones = ['), inp, el('span', { class: 'exp-etq' }, ']')), zona);
      inp.addEventListener('input', () => pintar());
      function numeros() { return inp.value.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(x => !isNaN(x)); }
      function pintar(k = -1, total = 0) {
        vaciar(zona);
        const ns = numeros();
        const fila = el('div', { class: 'exp-numeros' }, ...ns.map((n, j) => el('span', { class: 'exp-num' + (j === k ? ' activo' : j < k ? ' visto' : '') }, String(n))));
        const fin = k >= ns.length;
        zona.append(
          lineasCodigo(['total = 0', 'for cal in calificaciones:', '    total = total + cal', 'print(total)'], k < 0 ? [] : fin ? [4] : [2, 3]),
          fila,
          el('div', { class: 'exp-tabla-vars' }, el('span', {}, 'cal = ', el('strong', {}, k >= 0 && !fin ? String(ns[k]) : '—')), el('span', {}, 'total = ', el('strong', {}, String(total)))),
          fin ? consolaFalsa(String(total) + `\n(promedio: ${ns.length ? reprFloat(total / ns.length) : 0})`) : null,
          el('button', { class: 'btn btn-primario', onclick: animar }, '▶ Recorrer la lista'));
      }
      function animar() {
        clearInterval(timer);
        const ns = numeros();
        let k = 0, total = 0;
        pintar(0, 0);
        timer = setInterval(() => {
          if (k < ns.length) { total += ns[k]; k++; PB.juego.sonido('tic'); pintar(k, total); }
          if (k >= ns.length) clearInterval(timer);
        }, 800);
      }
      pintar();
    },

    funciones(cont) {
      const r = marco(cont, 'funciones');
      const FUN = {
        doble: { param: 'n', cuerpo: 'return n * 2', ini: '4', f: x => { const v = valorPy(x); return v.tipo === 'str' ? { tipo: 'str', v: v.v + v.v } : operar(v, '*', { tipo: 'int', v: 2 }); } },
        cuadrado: { param: 'n', cuerpo: 'return n ** 2', ini: '5', f: x => operar(valorPy(x), '**', { tipo: 'int', v: 2 }) },
        saludo: { param: 'nombre', cuerpo: 'return "Hola, " + nombre', ini: '"Ana"', f: x => { const v = valorPy(x); return v.tipo === 'str' ? { tipo: 'str', v: 'Hola, ' + v.v } : { error: 'TypeError', msg: 'Esta función une textos: dale un texto entre comillas.' }; } },
        es_par: { param: 'n', cuerpo: 'return n % 2 == 0', ini: '7', f: x => { const v = valorPy(x); if (v.tipo !== 'int') return { error: 'TypeError', msg: 'Dale un número entero.' }; return { tipo: 'bool', v: v.v % 2 === 0 }; } }
      };
      let actual = 'doble';
      const tabs = el('div', { class: 'exp-ops' });
      Object.keys(FUN).forEach(k => tabs.appendChild(el('button', { class: 'exp-op' + (k === actual ? ' activo' : ''), 'data-k': k, onclick: () => { actual = k; arg.value = FUN[k].ini; for (const x of tabs.children) x.classList.toggle('activo', x.dataset.k === k); pintar(); } }, k + '()')));
      const arg = campo(FUN[actual].ini, { style: { maxWidth: '160px' } });
      const zona = el('div');
      r.append(tabs, zona);
      function pintar(animar) {
        const F = FUN[actual];
        vaciar(zona);
        const res = F.f(arg.value);
        const maquina = PB.teoria.ilustracion('maquina-funcion', { nombre: actual, parametro: F.param, entrada: arg.value.trim() || '?', salida: res.error ? '⚠' : repr(res), codigo: F.cuerpo });
        if (animar) maquina.classList.add('trabajando');
        zona.append(
          lineasCodigo([`def ${actual}(${F.param}):`, '    ' + F.cuerpo, '', `resultado = ${actual}(${arg.value.trim()})`, 'print(resultado)']),
          el('div', { class: 'exp-fila' }, el('label', { class: 'exp-etq' }, 'Valor que entra:'), arg, el('button', { class: 'btn btn-primario', onclick: () => { PB.juego.sonido('clic'); pintar(true); } }, '⚙️ Llamar la función')),
          maquina,
          res.error ? errorCaja(res.error, res.msg) : consolaFalsa(mostrar(res)));
      }
      arg.addEventListener('keydown', e => { if (e.key === 'Enter') pintar(true); });
      pintar();
    },

    input(cont) {
      const r = marco(cont, 'input');
      const chat = el('div', { class: 'exp-chat' });
      const inp = campo('', { placeholder: 'Escribe tu respuesta…', style: { maxWidth: '220px' } });
      const zona = el('div');
      let dato = null;
      const enviar = () => {
        if (!inp.value.trim()) return;
        dato = PB.util.quitarComillasTipograficas(inp.value.trim());
        inp.value = '';
        PB.juego.sonido('clic');
        pintar();
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
      r.append(chat, el('div', { class: 'exp-fila' }, inp, el('button', { class: 'btn btn-primario', onclick: enviar }, 'Enviar ⏎')), zona);
      function prueba(expr, fn) {
        return el('button', { class: 'exp-chip', onclick: () => {
          const salida = zona.querySelector('.exp-prueba-res');
          vaciar(salida);
          const { ok, texto } = fn();
          salida.appendChild(el('div', { class: 'exp-linea-grande' }, cod(expr), el('span', { class: 'exp-flecha' }, '→'), ok ? el('strong', { class: 'exp-res' }, texto) : el('span', { class: 'exp-consola-error' }, texto)));
        } }, el('code', {}, expr));
      }
      function pintar() {
        vaciar(chat);
        chat.appendChild(el('div', { class: 'exp-burbuja bot' }, '🤖 ¿Cuántos años tienes?'));
        vaciar(zona);
        if (dato === null) { zona.appendChild(el('p', { class: 'nota' }, 'Contesta como si fueras el usuario del programa.')); return; }
        chat.appendChild(el('div', { class: 'exp-burbuja yo' }, dato));
        const esNum = /^-?\d+$/.test(dato);
        zona.append(
          el('div', { class: 'exp-linea-grande' }, cod('edad = input("¿Cuántos años tienes? ")')),
          el('div', { class: 'il-cajas' }, el('div', { class: 'il-caja cambio' }, el('div', { class: 'il-caja-tapa' }), el('div', { class: 'il-caja-cuerpo' }, el('span', { class: 'il-caja-valor' }, `'${dato}'`)), el('div', { class: 'il-caja-etiqueta' }, 'edad'), insignia('str'))),
          el('p', { class: 'exp-explica' }, '¡Ojo! Aunque escribiste un número, input() siempre lo guarda como texto (str). Prueba estas operaciones:'),
          el('div', { class: 'exp-chips' },
            prueba('edad + 1', () => ({ ok: false, texto: 'TypeError: no se puede sumar texto con número' })),
            prueba('int(edad) + 1', () => (esNum ? { ok: true, texto: String(parseInt(dato, 10) + 1) } : { ok: false, texto: `ValueError: int() no puede convertir «${dato}»` })),
            prueba('edad * 2', () => ({ ok: true, texto: `'${dato.repeat(2)}'` })),
            prueba('edad + "1"', () => ({ ok: true, texto: `'${dato}1'` }))),
          el('div', { class: 'exp-prueba-res' }));
      }
      pintar();
    }
  };

  function crear(nombre, cont, datos) {
    const fn = EXP[nombre];
    if (!fn) { cont.appendChild(el('p', {}, 'Explorador desconocido: ' + nombre)); return; }
    fn(cont, datos || {});
  }

  return { crear, NOMBRES: Object.keys(EXP), valorPy, operar, comparar };
})();
