/* =========================================================================
 * 66-teoria.js — Teoría gráfica: carrusel de tarjetas (una idea por tarjeta),
 * ilustraciones y el guía «Py» 🐍 con consejos.
 * Tipos de tarjeta: portada, idea, ilustracion, explorador, animacion, codigo,
 * comparar, pregunta, tabla, pasos, bloques.
 * ========================================================================= */
'use strict';

PB.teoria = (() => {
  const { el, vaciar, esc } = PB.util;
  const cod = (t) => { const c = el('code'); c.innerHTML = PB.py.resaltar(String(t))[0] || ''; return c; };

  /* ---------------- Ilustraciones ---------------- */
  const ILUS = {
    computadora(d) {
      return el('div', { class: 'il-flujo' },
        el('div', { class: 'il-paso' }, el('div', { class: 'il-emoji' }, '📝'), el('div', {}, d.a || 'Instrucciones')),
        el('div', { class: 'il-flecha' }, '➜'),
        el('div', { class: 'il-paso' }, el('div', { class: 'il-emoji' }, '💻'), el('div', {}, d.b || 'La computadora las sigue')),
        el('div', { class: 'il-flecha' }, '➜'),
        el('div', { class: 'il-paso' }, el('div', { class: 'il-emoji' }, '🎮'), el('div', {}, d.c || 'Resultado')));
    },
    consola(d) {
      const pre = el('pre', { class: 'il-ventana-codigo' });
      pre.innerHTML = PB.py.resaltar(d.codigo || 'print("Hola")').join('\n');
      const sal = el('pre', { class: 'il-ventana-salida' });
      sal.textContent = d.salida || 'Hola';
      return el('div', { class: 'il-consola' },
        el('div', { class: 'il-ventana' }, el('div', { class: 'il-ventana-barra' }, '📄 mi_programa.py'), pre),
        el('div', { class: 'il-flecha il-flecha-ejecutar' }, el('span', {}, '▶'), el('small', {}, 'Ejecutar')),
        el('div', { class: 'il-ventana oscura' }, el('div', { class: 'il-ventana-barra' }, '🖥️ Consola'), sal));
    },
    caja(d) {
      const cajas = (d.cajas || [{ nombre: d.nombre || 'edad', valor: d.valor || '12' }]).map(c =>
        el('div', { class: 'il-caja' },
          el('div', { class: 'il-caja-tapa' }),
          el('div', { class: 'il-caja-cuerpo' }, el('span', { class: 'il-caja-valor' }, c.valor)),
          el('div', { class: 'il-caja-etiqueta' }, c.nombre)));
      return el('div', { class: 'il-cajas' }, ...cajas);
    },
    tipos() {
      const t = [
        ['int', '🔢', 'Números enteros', ['7', '-3', '2026'], '#4C97FF'],
        ['float', '🌡️', 'Números decimales', ['3.14', '0.5', '-2.0'], '#0FBD8C'],
        ['str', '🔤', 'Texto (entre comillas)', ['"hola"', '"7"', '"¡Sí!"'], '#9966FF'],
        ['bool', '💡', 'Verdadero o falso', ['True', 'False'], '#FF8C1A']
      ];
      return el('div', { class: 'il-tipos' }, ...t.map(([n, i, desc, ej, color]) =>
        el('div', { class: 'il-tipo', style: { '--c': color } },
          el('div', { class: 'il-tipo-icono' }, i), el('div', { class: 'il-tipo-nombre' }, n), el('div', { class: 'il-tipo-desc' }, desc),
          el('div', { class: 'il-tipo-ej' }, ...ej.map(e => cod(e))))));
    },
    operadores() {
      const ops = [['+', 'suma', '7 + 2', '9'], ['-', 'resta', '7 - 2', '5'], ['*', 'multiplica', '7 * 2', '14'], ['/', 'divide', '7 / 2', '3.5'],
        ['//', 'división entera', '7 // 2', '3'], ['%', 'residuo', '7 % 2', '1'], ['**', 'potencia', '7 ** 2', '49']];
      return el('div', { class: 'il-ops' }, ...ops.map(([s, n, e, r]) =>
        el('div', { class: 'il-op' }, el('div', { class: 'il-op-simbolo' }, s), el('div', { class: 'il-op-nombre' }, n), el('div', { class: 'il-op-ej' }, cod(e), el('span', {}, ' → '), el('strong', {}, r)))));
    },
    'maquina-io'(d) {
      return el('div', { class: 'il-flujo' },
        el('div', { class: 'il-paso azul' }, el('div', { class: 'il-emoji' }, '⌨️'), el('div', {}, el('strong', {}, 'Entrada'), el('br'), cod(d.entrada || 'input()')), el('div', { class: 'il-dato' }, d.dato || '"Ana"')),
        el('div', { class: 'il-flecha' }, '➜'),
        el('div', { class: 'il-paso morado' }, el('div', { class: 'il-emoji' }, '🧠'), el('div', {}, el('strong', {}, 'Proceso'), el('br'), d.proceso || 'tu programa')),
        el('div', { class: 'il-flecha' }, '➜'),
        el('div', { class: 'il-paso verde' }, el('div', { class: 'il-emoji' }, '🖥️'), el('div', {}, el('strong', {}, 'Salida'), el('br'), cod(d.salidaCodigo || 'print()')), el('div', { class: 'il-dato' }, d.resultado || 'Hola, Ana')));
    },
    'tren-texto'(d) {
      const t = d.texto || 'PYTHON';
      const n = t.length;
      return el('div', { class: 'il-tren' },
        el('div', { class: 'il-tren-locomotora' }, '🚂'),
        ...[...t].map((ch, i) => el('div', { class: 'il-vagon' },
          el('div', { class: 'il-indice' }, String(i)),
          el('div', { class: 'il-letra' }, ch === ' ' ? '␣' : ch),
          el('div', { class: 'il-indice neg' }, String(i - n)))));
    },
    balanza(d) {
      const r = String(d.resultado || 'True') === 'True';
      const svg = el('div', { class: 'il-balanza' });
      const giro = d.inclinar === undefined ? (r ? -8 : 8) : d.inclinar;
      svg.innerHTML = `<svg viewBox="0 0 240 150" width="100%" style="max-width:340px">
        <polygon points="110,140 130,140 120,60" fill="#8A90AA"/>
        <g transform="rotate(${giro} 120 60)">
          <rect x="20" y="56" width="200" height="8" rx="4" fill="#575D7E"/>
          <line x1="40" y1="64" x2="30" y2="96" stroke="#8A90AA" stroke-width="2"/><line x1="40" y1="64" x2="70" y2="96" stroke="#8A90AA" stroke-width="2"/>
          <line x1="200" y1="64" x2="170" y2="96" stroke="#8A90AA" stroke-width="2"/><line x1="200" y1="64" x2="210" y2="96" stroke="#8A90AA" stroke-width="2"/>
          <path d="M22 96 h56 a28 14 0 0 1 -56 0z" fill="#4C97FF"/><path d="M162 96 h56 a28 14 0 0 1 -56 0z" fill="#FF8C1A"/>
          <text x="50" y="88" text-anchor="middle" font-size="20" font-weight="800" fill="#1E2240" font-family="monospace">${esc(d.izq || '7')}</text>
          <text x="190" y="88" text-anchor="middle" font-size="20" font-weight="800" fill="#1E2240" font-family="monospace">${esc(d.der || '3')}</text>
        </g>
        <circle cx="120" cy="60" r="16" fill="#fff" stroke="#575D7E" stroke-width="3"/>
        <text x="120" y="66" text-anchor="middle" font-size="16" font-weight="800" fill="#1E2240" font-family="monospace">${esc(d.op || '>')}</text></svg>`;
      return el('div', { class: 'il-balanza-caja' }, svg, el('div', { class: 'il-resultado ' + (r ? 'si' : 'no') }, `${d.izq || '7'} ${d.op || '>'} ${d.der || '3'}  →  ${r ? 'True' : 'False'}`));
    },
    'camino-if'(d) {
      return el('div', { class: 'il-if' + (d.marcar ? ' marcar-' + d.marcar : '') },
        el('div', { class: 'il-rombo' }, cod(d.condicion || 'edad >= 12'), el('span', {}, '?')),
        el('div', { class: 'il-ramas' },
          el('div', { class: 'il-rama si' }, el('div', { class: 'il-rama-etq' }, '✔ True'), el('div', { class: 'il-rama-caja' }, cod(d.si || 'print("Puedes pasar")'))),
          el('div', { class: 'il-rama no' }, el('div', { class: 'il-rama-etq' }, '✘ False'), el('div', { class: 'il-rama-caja' }, cod(d.no || 'print("Todavía no")')))),
        el('div', { class: 'il-union' }, '⬇ el programa continúa'));
    },
    'escalera-elif'(d) {
      const pasos = d.pasos || [['t >= 30', '"Calor"'], ['t >= 20', '"Templado"'], ['t >= 10', '"Fresco"'], [null, '"Frío"']];
      return el('div', { class: 'il-elif' }, ...pasos.map(([c, r], i) =>
        el('div', { class: 'il-elif-fila' + (d.marcar === i ? ' activa' : '') },
          el('div', { class: 'il-elif-cond' }, c ? el('span', {}, el('code', {}, i === 0 ? 'if ' : 'elif '), cod(c)) : el('code', {}, 'else')),
          el('div', { class: 'il-elif-flecha' }, c ? 'True ➜' : '➜'),
          el('div', { class: 'il-elif-res' }, cod('print(' + r + ')')),
          c && i < pasos.length - 1 ? el('div', { class: 'il-elif-baja' }, '⬇ False') : null)));
    },
    'pista-for'(d) {
      const vals = d.valores || [0, 1, 2, 3, 4];
      return el('div', { class: 'il-pista' },
        el('div', { class: 'il-pista-codigo' }, cod(d.codigo || `for ${d.variable || 'i'} in range(${vals.length}):`)),
        el('div', { class: 'il-pista-estaciones' }, ...vals.map((v, i) => el('div', { class: 'il-estacion', style: { animationDelay: (i * 0.6) + 's' } }, el('div', { class: 'il-estacion-n' }, String(v)), el('div', { class: 'il-estacion-etq' }, `vuelta ${i + 1}`)))),
        el('div', { class: 'il-corredor' }, '🏃'));
    },
    'ciclo-while'(d) {
      return el('div', { class: 'il-while' },
        el('div', { class: 'il-rombo' }, cod(d.condicion || 'n > 0'), el('span', {}, '?')),
        el('div', { class: 'il-while-cuerpo' }, el('div', { class: 'il-rama-etq si' }, '✔ True: repite'), el('div', { class: 'il-rama-caja' }, ...(d.cuerpo || ['print(n)', 'n = n - 1']).map(l => el('div', {}, cod(l)))), el('div', { class: 'il-regreso' }, '↩ vuelve a preguntar')),
        el('div', { class: 'il-rama-etq no' }, '✘ False: sale del bucle ➜'));
    },
    'estante-lista'(d) {
      const items = d.elementos || ['"lápiz"', '"cuaderno"', '"regla"'];
      return el('div', { class: 'il-estante' },
        el('div', { class: 'il-estante-nombre' }, cod((d.nombre || 'mochila') + ' =')),
        el('div', { class: 'il-estante-fila' }, el('span', { class: 'il-corchete' }, '['), ...items.map((it, i) => el('div', { class: 'il-objeto' }, el('div', { class: 'il-objeto-valor' }, cod(it)), el('div', { class: 'il-indice' }, String(i)))), el('span', { class: 'il-corchete' }, ']')),
        el('div', { class: 'il-estante-tabla' }));
    },
    'maquina-funcion'(d) {
      return el('div', { class: 'il-flujo' },
        el('div', { class: 'il-dato grande' }, d.entrada || '4'),
        el('div', { class: 'il-flecha' }, '➜'),
        el('div', { class: 'il-maquina' }, el('div', { class: 'il-maquina-nombre' }, `${d.nombre || 'doble'}(${d.parametro || 'n'})`), el('div', { class: 'il-engranes' }, '⚙️⚙️'), cod(d.codigo || 'return n * 2')),
        el('div', { class: 'il-flecha' }, '➜'),
        el('div', { class: 'il-dato grande verde' }, d.salida || '8'));
    },
    error(d) {
      const pre = el('pre', { class: 'il-ventana-codigo' });
      pre.innerHTML = PB.py.resaltar(d.codigo || 'print("Hola)').map((l, i) => (i + 1 === (d.linea || 1) ? `<span class="il-subrayado">${l}</span>` : l)).join('\n');
      return el('div', { class: 'il-error' },
        el('div', { class: 'il-ventana' }, el('div', { class: 'il-ventana-barra' }, '📄 programa.py'), pre),
        el('div', { class: 'il-error-burbuja' }, el('strong', {}, '⚠ ' + (d.tipo || 'SyntaxError')), el('div', {}, d.mensaje || 'Falta cerrar las comillas.')));
    }
  };

  function ilustracion(nombre, datos = {}) {
    const fn = ILUS[nombre];
    return el('div', { class: 'ilustracion ilus-' + nombre }, fn ? fn(datos) : el('span', {}, nombre));
  }

  /* ---------------- Tarjetas ---------------- */
  function burbujaPy(texto) {
    return el('div', { class: 'tt-py' }, el('div', { class: 'tt-py-avatar' }, '🐍'), el('div', { class: 'tt-py-burbuja' }, el('strong', {}, 'Py dice: '), el('span', { html: texto })));
  }

  function bloquesEn(cont, codigo, limpiezas) {
    const div = el('div', { class: 'bloques-lectura', style: { height: '200px' } });
    cont.appendChild(div);
    setTimeout(() => {
      if (!document.body.contains(div)) return;
      const ws = PB.blockly.crearLectura(div, 0.8);
      try { PB.conv.cargar(ws, codigo); } catch (e) { /* nada */ }
      setTimeout(() => PB.blockly.encuadrar(ws, 0.85), 40);
      limpiezas.push(() => { try { ws.dispose(); } catch (e) { /* nada */ } });
    }, 0);
  }

  function tarjeta(t, limpiezas = []) {
    const visual = el('div', { class: 'tt-visual' });
    const texto = el('div', { class: 'tt-texto' });
    const caja = el('div', { class: 'tt tt-' + t.tipo }, visual, texto);
    const titulo = () => (t.titulo ? el('h3', { class: 'tt-titulo' }, t.titulo) : null);
    const parrafo = () => (t.texto ? el('div', { class: 'tt-parrafo', html: t.texto }) : null);
    switch (t.tipo) {
      case 'portada':
        caja.classList.add('tt-centro');
        visual.appendChild(el('div', { class: 'tt-icono-grande rebote' }, t.icono || '🚀'));
        texto.append(el('h2', { class: 'tt-titulo-grande' }, t.titulo), parrafo());
        break;
      case 'idea':
        visual.appendChild(el('div', { class: 'tt-icono-grande' }, t.icono || '💡'));
        texto.append(titulo(), parrafo());
        if (t.codigo) texto.appendChild(PB.bloqueCodigo(t.codigo));
        if (t.salida !== undefined) texto.append(el('div', { class: 'tt-salida-etq' }, '🖥️ Se ve en la pantalla:'), PB.bloqueCodigo(t.salida, { clase: 'salida' }));
        break;
      case 'ilustracion':
        caja.classList.add('tt-vertical');
        visual.appendChild(ilustracion(t.nombre, t.datos || {}));
        texto.append(titulo(), parrafo());
        if (t.codigo) texto.appendChild(PB.bloqueCodigo(t.codigo));
        break;
      case 'explorador':
        caja.classList.add('tt-vertical');
        texto.append(titulo(), parrafo());
        visual.classList.add('no-deslizar');
        PB.exploradores.crear(t.nombre, visual, t.datos || {});
        caja.insertBefore(texto, visual);
        break;
      case 'animacion':
        caja.classList.add('tt-vertical');
        PB.comp.animacion(visual, t.animacion);
        visual.classList.add('no-deslizar');
        texto.append(titulo(), parrafo());
        caja.insertBefore(texto, visual);
        break;
      case 'codigo':
        caja.classList.add('tt-vertical');
        texto.append(titulo(), parrafo());
        PB.comp.codigoProbable(visual, t.codigo, t.nota);
        visual.classList.add('no-deslizar');
        caja.insertBefore(texto, visual);
        break;
      case 'comparar': {
        caja.classList.add('tt-vertical');
        texto.append(titulo(), parrafo());
        const lado = (x, bien) => el('div', { class: 'tt-lado ' + (bien ? 'bien' : 'mal') },
          el('div', { class: 'tt-lado-etq' }, bien ? '✔ Así sí' : '✘ Así no'),
          x.codigo ? PB.bloqueCodigo(x.codigo) : el('div', { html: x.texto || '' }),
          x.nota ? el('div', { class: 'tt-lado-nota', html: x.nota }) : null);
        visual.appendChild(el('div', { class: 'tt-comparar' }, lado(t.mal, false), lado(t.bien, true)));
        caja.insertBefore(texto, visual);
        break;
      }
      case 'pregunta':
        caja.classList.add('tt-vertical');
        visual.classList.add('no-deslizar');
        texto.appendChild(el('div', { class: 'tt-etq-pregunta' }, '🤔 ¿Lo entendiste?'));
        PB.comp.pregunta(visual, t, null, {});
        caja.insertBefore(texto, visual);
        break;
      case 'tabla': {
        caja.classList.add('tt-vertical');
        texto.append(titulo(), parrafo());
        const tabla = el('table', { class: 'tt-tabla' },
          t.encabezados ? el('thead', {}, el('tr', {}, ...t.encabezados.map(h => el('th', { html: h })))) : null,
          el('tbody', {}, ...t.filas.map(f => el('tr', {}, ...f.map(c => el('td', { html: c }))))));
        visual.appendChild(el('div', { class: 'tabla-scroll' }, tabla));
        caja.insertBefore(texto, visual);
        break;
      }
      case 'pasos':
        caja.classList.add('tt-vertical');
        texto.append(titulo(), parrafo());
        visual.appendChild(el('div', { class: 'tt-pasos' }, ...t.pasos.map((p, i) =>
          el('div', { class: 'tt-paso', style: { animationDelay: (i * 0.12) + 's' } }, el('div', { class: 'tt-paso-num' }, p.icono || String(i + 1)), el('div', { html: p.texto })))));
        caja.insertBefore(texto, visual);
        break;
      case 'bloques': {
        caja.classList.add('tt-vertical');
        texto.append(titulo(), parrafo());
        visual.classList.add('no-deslizar');
        const fila = el('div', { class: 'bloques-y-python' });
        visual.appendChild(fila);
        bloquesEn(fila, t.codigo, limpiezas);
        fila.appendChild(PB.bloqueCodigo(t.codigo, { numeros: true }));
        caja.insertBefore(texto, visual);
        break;
      }
      default:
        texto.append(titulo(), parrafo());
    }
    if (t.py) caja.appendChild(burbujaPy(t.py));
    return caja;
  }

  /* ---------------- Carrusel ---------------- */
  function carrusel(contenedor, tarjetas, { alTerminar, etiquetaSiguiente, alSiguiente } = {}) {
    const raiz = el('div', { class: 'carrusel' });
    contenedor.appendChild(raiz);
    const total = tarjetas.length + 1;   // + la tarjeta final
    let i = 0, todas = false, limpiezas = [];
    const escenario = el('div', { class: 'car-escenario' });
    const puntos = el('div', { class: 'car-puntos' });
    const contador = el('span', { class: 'car-contador' });
    const btnAnt = el('button', { class: 'btn btn-suave car-btn', onclick: () => ir(i - 1), 'aria-label': 'Anterior' }, '◀ Anterior');
    const btnSig = el('button', { class: 'btn btn-primario car-btn', onclick: () => ir(i + 1), 'aria-label': 'Siguiente' }, 'Siguiente ▶');
    const btnTodas = el('button', { class: 'btn btn-chico btn-suave', onclick: () => { todas = !todas; pintar(); } }, '☰ Ver todas');
    raiz.append(el('div', { class: 'car-barra' }, contador, puntos, btnTodas), escenario, el('div', { class: 'car-controles' }, btnAnt, btnSig));

    const limpiar = () => { for (const f of limpiezas) { try { f(); } catch (e) { /* nada */ } } limpiezas = []; };
    PB.app.alSalir(limpiar);

    function final() {
      if (alTerminar) alTerminar();
      return el('div', { class: 'tt tt-centro tt-final' },
        el('div', { class: 'tt-visual' }, el('div', { class: 'tt-icono-grande rebote' }, '🎉')),
        el('div', { class: 'tt-texto' }, el('h2', { class: 'tt-titulo-grande' }, '¡Teoría completada!'),
          el('p', {}, 'Ahora observa un ejemplo, juega con las actividades y pon a prueba lo que aprendiste.'),
          alSiguiente ? el('button', { class: 'btn btn-primario btn-grande', onclick: alSiguiente }, etiquetaSiguiente || 'Siguiente ▶') : null));
    }

    function pintar(dir = 0) {
      limpiar();
      vaciar(escenario);
      vaciar(puntos);
      raiz.classList.toggle('todas', todas);
      btnTodas.textContent = todas ? '▭ Una por una' : '☰ Ver todas';
      if (todas) {
        tarjetas.forEach(t => escenario.appendChild(tarjeta(t, limpiezas)));
        escenario.appendChild(final());
        contador.textContent = `${tarjetas.length} tarjetas`;
        btnAnt.hidden = btnSig.hidden = true;
        return;
      }
      btnAnt.hidden = btnSig.hidden = false;
      for (let k = 0; k < total; k++) {
        puntos.appendChild(el('button', { class: 'car-punto' + (k === i ? ' activo' : '') + (k < i ? ' visto' : ''), onclick: () => ir(k), 'aria-label': `Tarjeta ${k + 1}` }));
      }
      contador.textContent = `${i + 1} / ${total}`;
      const nodo = i < tarjetas.length ? tarjeta(tarjetas[i], limpiezas) : final();
      if (dir) nodo.classList.add(dir > 0 ? 'entra-der' : 'entra-izq');
      escenario.appendChild(nodo);
      btnAnt.disabled = i === 0;
      btnSig.disabled = i === total - 1;
      btnSig.textContent = i === total - 2 ? 'Terminar ✔' : 'Siguiente ▶';
    }

    function ir(k) {
      if (k < 0 || k >= total || k === i) return;
      const dir = k > i ? 1 : -1;
      i = k;
      PB.juego.sonido('clic');
      pintar(dir);
      const r = raiz.getBoundingClientRect();
      if (r.top < 0) raiz.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    // Deslizar con el dedo (fuera de las zonas interactivas)
    let x0 = null;
    escenario.addEventListener('pointerdown', (ev) => {
      if (todas || ev.target.closest('input, button, select, textarea, .no-deslizar, pre, .codigo')) { x0 = null; return; }
      x0 = ev.clientX;
    });
    escenario.addEventListener('pointerup', (ev) => {
      if (x0 === null) return;
      const dx = ev.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 60) ir(i + (dx < 0 ? 1 : -1));
    });
    const teclas = (ev) => {
      if (todas || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (ev.key === 'ArrowRight') ir(i + 1);
      if (ev.key === 'ArrowLeft') ir(i - 1);
    };
    document.addEventListener('keydown', teclas);
    PB.app.alSalir(() => document.removeEventListener('keydown', teclas));

    pintar();
    return raiz;
  }

  return { carrusel, tarjeta, ilustracion, ILUS };
})();
