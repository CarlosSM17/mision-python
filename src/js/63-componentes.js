/* =========================================================================
 * 63-componentes.js — Componentes reutilizables de las vistas:
 * menú emergente, insignias, visor de ejemplos (Predecir → Ejecutar),
 * preguntas de opción múltiple, bloques de solo lectura y animaciones.
 * ========================================================================= */
'use strict';

PB.comp = (() => {
  const { el, vaciar } = PB.util;

  /* ---------- Menú emergente ---------- */
  function menuEmergente(ancla, opciones) {
    document.querySelectorAll('.menu-emergente').forEach(m => m.remove());
    const menu = el('div', { class: 'menu-emergente', role: 'menu' });
    for (const [texto, accion] of opciones) {
      menu.appendChild(el('button', { class: 'menu-item', role: 'menuitem', onclick: () => { menu.remove(); accion(); } }, texto));
    }
    document.body.appendChild(menu);
    const r = ancla.getBoundingClientRect();
    const ancho = menu.offsetWidth;
    menu.style.top = Math.min(window.innerHeight - menu.offsetHeight - 8, r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, Math.min(window.innerWidth - ancho - 8, r.right - ancho)) + 'px';
    const cerrar = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('pointerdown', cerrar, true); } };
    setTimeout(() => document.addEventListener('pointerdown', cerrar, true), 0);
  }

  /* ---------- Insignias ---------- */
  function insigniaSVG(unidad, ganada = true, tam = 64) {
    const color = ganada ? unidad.color : '#C9CED9';
    const caja = el('div', { class: 'insignia' + (ganada ? ' ganada' : ' bloqueada'), title: unidad.insignia + (ganada ? '' : ' (por ganar)') });
    caja.innerHTML = `<svg width="${tam}" height="${tam}" viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5" fill="${color}" stroke="#ffffff" stroke-width="3"/>
      <polygon points="32,10 51,21 51,43 32,54 13,43 13,21" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-dasharray="3 3"/>
      <text x="32" y="41" text-anchor="middle" font-size="24">${ganada ? unidad.icono || '★' : '🔒'}</text></svg>`;
    return caja;
  }

  /* ---------- Bloques de solo lectura a partir de Python ---------- */
  function bloquesLectura(contenedor, codigo, { alto = 180, escala = 0.75 } = {}) {
    const div = el('div', { class: 'bloques-lectura', style: { height: alto + 'px' } });
    contenedor.appendChild(div);
    let ws = null;
    const montar = () => {
      if (ws || !document.body.contains(div)) return;
      ws = PB.blockly.crearLectura(div, escala);
      try { PB.conv.cargar(ws, codigo); } catch (e) { div.textContent = 'No se pudo mostrar como bloques.'; }
      setTimeout(() => PB.blockly.encuadrar(ws, escala), 40);
      PB.app.alSalir(() => { try { ws.dispose(); } catch (e) { /* nada */ } });
    };
    setTimeout(montar, 0);
    return { div, get ws() { return ws; } };
  }

  /* ---------- Pregunta de opción múltiple ---------- */
  /**
   * p: {pregunta, codigo?, bloques?, opciones:[...], correcta, explicacion, codigoOpciones?}
   * clave: dónde guardar la respuesta (o null)
   * opciones: {unaVez, alResponder(correcta, indice), mostrarSiempre}
   */
  function pregunta(contenedor, p, clave, { unaVez = false, alResponder = null } = {}) {
    const caja = el('div', { class: 'pregunta' });
    contenedor.appendChild(caja);
    caja.appendChild(el('div', { class: 'pregunta-texto', html: p.pregunta }));
    if (p.codigo) caja.appendChild(PB.bloqueCodigo(p.codigo, { numeros: p.codigo.split('\n').length > 2 }));
    if (p.bloques) bloquesLectura(caja, p.bloques, { alto: p.altoBloques || 150 });
    const lista = el('div', { class: 'opciones' + (p.codigoOpciones ? ' opciones-codigo' : '') });
    caja.appendChild(lista);
    const retro = el('div', { class: 'retro', hidden: true });
    caja.appendChild(retro);
    const previa = clave ? PB.progreso.respuesta(clave) : null;
    const botones = p.opciones.map((op, i) => {
      const b = el('button', { class: 'opcion', type: 'button', onclick: () => elegir(i) });
      b.appendChild(el('span', { class: 'opcion-letra' }, String.fromCharCode(65 + i)));
      if (p.codigoOpciones) b.appendChild(PB.bloqueCodigo(op, { clase: 'en-opcion' }));
      else b.appendChild(el('span', { class: 'opcion-texto', html: op }));
      lista.appendChild(b);
      return b;
    });
    function marcar(i, guardar) {
      const ok = i === p.correcta;
      botones.forEach((b, j) => {
        b.classList.toggle('elegida', j === i);
        b.classList.toggle('correcta', j === p.correcta && (ok || unaVez));
        b.classList.toggle('incorrecta', j === i && !ok);
        if (unaVez && !PB.estado.docente) b.disabled = true;
      });
      retro.hidden = false;
      retro.className = 'retro ' + (ok ? 'retro-ok' : 'retro-no');
      vaciar(retro);
      retro.appendChild(el('strong', {}, ok ? '✓ ¡Correcto! ' : (unaVez ? '✗ No era esa. ' : '✗ Todavía no. ')));
      if (ok || unaVez) { if (p.explicacion) retro.appendChild(el('span', { html: p.explicacion })); }
      else retro.appendChild(el('span', {}, 'Vuelve a leer el código con calma e inténtalo otra vez.'));
      if (guardar && clave) PB.progreso.responder(clave, { respuesta: i, correcta: ok });
      if (alResponder) alResponder(ok, i);
    }
    function elegir(i) {
      if (unaVez && previa && !PB.estado.docente) return;
      marcar(i, true);
    }
    if (previa && typeof previa.respuesta === 'number') marcar(previa.respuesta, false);
    if (PB.estado.docente) caja.appendChild(el('div', { class: 'nota docente-nota' }, '🔑 Respuesta correcta: ' + String.fromCharCode(65 + p.correcta)));
    return caja;
  }

  /* ---------- Visor de ejemplos: Predecir → Ejecutar → Investigar ---------- */
  class Visor {
    constructor(contenedor, { codigo, modo, sesion }) {
      this.codigo = codigo;
      this.modo = modo;
      this.raiz = el('div', { class: 'visor' + (modo <= 2 ? ' visor-bloques' : ' visor-texto') });
      contenedor.appendChild(this.raiz);
      this.velocidad = 700;
      const izq = el('div', { class: 'visor-izq' });
      const der = el('div', { class: 'visor-der' });
      this.raiz.append(izq, der);
      if (modo <= 2) {
        const div = el('div', { class: 'blockly-div' });
        izq.appendChild(div);
        setTimeout(() => {
          if (!document.body.contains(div)) return;
          this.ws = PB.blockly.crearLectura(div, 0.8);
          try { PB.conv.cargar(this.ws, codigo); } catch (e) { /* nada */ }
          this.gen = PB.gen.generar(this.ws);
          this.panel.mostrar(this.gen);
          setTimeout(() => PB.blockly.encuadrar(this.ws, 0.85), 40);
          PB.app.alSalir(() => { try { this.ws.dispose(); } catch (e) { /* nada */ } });
        }, 0);
        der.appendChild(el('div', { class: 'lateral-cabeza' }, '🐍 Python'));
        const cont = el('div', { class: 'panel-python-cont' });
        der.appendChild(cont);
        this.panel = new PB.PanelPython(cont, {});
      } else {
        this.editor = new PB.Editor(izq, { codigo, soloLectura: true });
      }
      const controles = el('div', { class: 'visor-controles' },
        this.btnRun = el('button', { class: 'btn btn-ejecutar', onclick: () => this.ejecutar(false) }, '▶ Ejecutar'),
        this.btnPaso = el('button', { class: 'btn btn-suave', onclick: () => this.ejecutar(true) }, '👣 Paso a paso'),
        this.btnStop = el('button', { class: 'btn btn-detener', hidden: true, onclick: () => PB.ejecutor.detener() }, '⏹ Detener'));
      der.appendChild(controles);
      const abajo = el('div', { class: 'visor-abajo' });
      der.appendChild(abajo);
      this.consola = new PB.Consola(abajo);
      this.vars = new PB.TablaVariables(abajo);
      this.bloqueado = false;
      PB.app.alSalir(() => { if (PB.ejecutor.ocupado) PB.ejecutor.detener(); });
    }

    bloquear(si, mensaje) {
      this.bloqueado = si;
      this.btnRun.disabled = si;
      this.btnPaso.disabled = si;
      this.btnRun.title = si ? mensaje : '';
      this.btnPaso.title = si ? mensaje : '';
    }

    _codigo() { return this.modo <= 2 && this.gen ? this.gen.codigo : this.codigo; }

    _marcar(n) {
      if (this.panel) this.panel.marcar(n, 'actual');
      if (this.ws) this.ws.highlightBlock(n && this.gen ? this.gen.lineaABloque[n] || null : null);
      if (this.editor) { this.editor.limpiarMarcas('actual'); if (n) this.editor.marcarLinea(n, 'actual'); }
    }

    async ejecutar(paso) {
      if (PB.ejecutor.ocupado || this.bloqueado) return;
      this.consola.limpiar();
      this.vars.limpiar();
      this.raiz.classList.toggle('paso-activo', paso);
      this.btnRun.hidden = this.btnPaso.hidden = true;
      this.btnStop.hidden = false;
      const codigo = this._codigo();
      const res = await PB.ejecutor.ejecutar(codigo, {
        alSalida: t => this.consola.escribir(t),
        alEntrada: () => this.consola.pedir(),
        paso: paso ? { retardo: this.velocidad, alLinea: (n, v, l) => { this._marcar(n); this.vars.mostrar(v, l, n); } } : null
      });
      this.consola.cancelarPedido();
      this._marcar(null);
      this.btnRun.hidden = this.btnPaso.hidden = false;
      this.btnStop.hidden = true;
      if (res.error) this.consola.mostrarError(PB.errores.explicar(res.error, codigo));
      else this.consola.mensaje('✔ El programa terminó.', 'exito');
    }
  }

  /* ---------- Bloque de código de teoría que se puede probar ---------- */
  function codigoProbable(contenedor, codigo, nota) {
    const caja = el('div', { class: 'codigo-probable' });
    caja.appendChild(PB.bloqueCodigo(codigo, { numeros: codigo.split('\n').length > 3 }));
    const salida = el('div', { class: 'mini-consola', hidden: true });
    const consola = new PB.Consola(salida);
    const btn = el('button', {
      class: 'btn btn-chico btn-ejecutar', onclick: async () => {
        if (PB.ejecutor.ocupado) return;
        salida.hidden = false;
        consola.limpiar();
        btn.disabled = true;
        const r = await PB.ejecutor.ejecutar(codigo, { alSalida: t => consola.escribir(t), alEntrada: () => consola.pedir() });
        btn.disabled = false;
        if (r.error) consola.mostrarError(PB.errores.explicar(r.error, codigo));
      }
    }, '▶ Probar');
    caja.appendChild(el('div', { class: 'codigo-acciones' }, btn, nota ? el('span', { class: 'nota', html: nota }) : null));
    caja.appendChild(salida);
    contenedor.appendChild(caja);
    return caja;
  }

  /* ---------- Animaciones de la información de apoyo ---------- */
  function animacion(contenedor, tipo) {
    const caja = el('div', { class: 'animacion anim-' + tipo });
    contenedor.appendChild(caja);
    const fn = ANIMACIONES[tipo];
    if (fn) fn(caja); else caja.textContent = '';
    return caja;
  }

  function temporizador(caja, pasos, ms, pintar) {
    let i = 0, t = null;
    const controles = el('div', { class: 'anim-controles' });
    const btn = el('button', { class: 'btn btn-chico btn-suave' }, '▶ Reproducir');
    const paso = el('button', { class: 'btn btn-chico btn-suave' }, 'Paso ▸');
    const reiniciar = el('button', { class: 'btn btn-chico btn-suave' }, '↺');
    controles.append(btn, paso, reiniciar);
    caja.appendChild(controles);
    const detener = () => { clearInterval(t); t = null; btn.textContent = '▶ Reproducir'; };
    const avanzar = () => {
      if (i >= pasos - 1) { detener(); return false; }
      i++; pintar(i); return true;
    };
    btn.onclick = () => {
      if (t) { detener(); return; }
      if (i >= pasos - 1) { i = 0; pintar(0); }
      btn.textContent = '⏸ Pausa';
      t = setInterval(() => { if (!avanzar()) detener(); }, ms);
    };
    paso.onclick = () => { detener(); avanzar(); };
    reiniciar.onclick = () => { detener(); i = 0; pintar(0); };
    PB.app.alSalir(detener);
    pintar(0);
  }

  const ANIMACIONES = {
    // Variables como cajas con etiqueta
    variables(caja) {
      const pasos = [
        { linea: 'puntos = 0', cajas: { puntos: '0' }, nota: 'Se crea una caja llamada «puntos» y se guarda 0 adentro.' },
        { linea: 'puntos = puntos + 10', cajas: { puntos: '10' }, nota: 'Python calcula primero la derecha (0 + 10) y guarda el resultado.' },
        { linea: 'nombre = "Ana"', cajas: { puntos: '10', nombre: '"Ana"' }, nota: 'Otra caja, ahora con texto (str).' },
        { linea: 'puntos = 25', cajas: { puntos: '25', nombre: '"Ana"' }, nota: 'Guardar un valor nuevo reemplaza al anterior.' }
      ];
      const codigo = el('div', { class: 'anim-codigo' });
      const zona = el('div', { class: 'anim-cajas' });
      const nota = el('p', { class: 'anim-nota' });
      caja.append(codigo, zona, nota);
      temporizador(caja, pasos.length, 1800, i => {
        codigo.innerHTML = pasos.map((p, j) => `<div class="${j === i ? 'actual' : j < i ? 'hecho' : ''}">${PB.py.resaltar(p.linea)[0]}</div>`).join('');
        vaciar(zona);
        for (const [k, v] of Object.entries(pasos[i].cajas)) {
          const cambio = i > 0 && pasos[i - 1].cajas[k] !== v;
          zona.appendChild(el('div', { class: 'anim-caja' + (cambio ? ' cambio' : '') }, el('div', { class: 'anim-valor' }, v), el('div', { class: 'anim-etiqueta' }, k)));
        }
        nota.textContent = pasos[i].nota;
      });
    },
    // if / else: el camino que se toma
    decision(caja) {
      const valores = [15, 4, 10];
      const zona = el('div', { class: 'anim-decision' });
      const nota = el('p', { class: 'anim-nota' });
      caja.append(zona, nota);
      temporizador(caja, valores.length, 2200, i => {
        const edad = valores[i];
        const si = edad >= 10;
        zona.innerHTML = `<div class="anim-dato">edad = ${edad}</div>
          <div class="anim-rombo">edad >= 10 ?</div>
          <div class="anim-ramas"><div class="anim-rama ${si ? 'activa' : ''}"><b>True</b><span>print("Puedes subir")</span></div>
          <div class="anim-rama ${si ? '' : 'activa'}"><b>False</b><span>print("Todavía no")</span></div></div>`;
        nota.textContent = `Con edad = ${edad}, la condición es ${si ? 'True' : 'False'}: se ejecuta solo el camino ${si ? 'del if' : 'del else'}.`;
      });
    },
    // Bucle for con contador
    bucle(caja) {
      const n = 4;
      const zona = el('div', { class: 'anim-bucle' });
      const nota = el('p', { class: 'anim-nota' });
      caja.append(el('div', { class: 'anim-codigo' }, PB.bloqueCodigo('for i in range(4):\n    print("Vuelta", i)')), zona, nota);
      temporizador(caja, n + 1, 1300, k => {
        const vueltas = [];
        for (let j = 0; j < n; j++) vueltas.push(`<div class="anim-vuelta ${j < k ? 'hecha' : ''} ${j === k - 1 ? 'actual' : ''}">${j}</div>`);
        zona.innerHTML = `<div class="anim-flecha">↻</div><div class="anim-vueltas">${vueltas.join('')}</div>`;
        nota.textContent = k === 0 ? 'range(4) da los números 0, 1, 2 y 3.' : (k <= n ? `Vuelta con i = ${k - 1}: se imprime «Vuelta ${k - 1}».` : '');
        if (k === n) nota.textContent += ' Se acabaron los números: el bucle termina.';
      });
    },
    // while: repetir mientras se cumpla
    mientras(caja) {
      const zona = el('div', { class: 'anim-bucle' });
      const nota = el('p', { class: 'anim-nota' });
      caja.append(el('div', { class: 'anim-codigo' }, PB.bloqueCodigo('n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1\nprint("¡Despegue!")')), zona, nota);
      const estados = [3, 2, 1, 0];
      temporizador(caja, estados.length, 1500, k => {
        const n = estados[k];
        zona.innerHTML = `<div class="anim-dato">n = ${n}</div><div class="anim-rombo ${n > 0 ? 'si' : 'no'}">n > 0 → ${n > 0 ? 'True' : 'False'}</div>`;
        nota.textContent = n > 0 ? `Como ${n} > 0 es True, se imprime ${n} y n baja a ${n - 1}.` : 'Ahora 0 > 0 es False: el while termina y se imprime «¡Despegue!».';
      });
    },
    // Listas con posiciones desde 0
    lista(caja) {
      const elementos = ['"lápiz"', '"libreta"', '"regla"'];
      const zona = el('div', { class: 'anim-lista' });
      const nota = el('p', { class: 'anim-nota' });
      caja.append(zona, nota);
      const pasos = [
        { items: elementos, marca: -1, texto: 'mochila = ["lápiz", "libreta", "regla"] — tres elementos en orden.' },
        { items: elementos, marca: 0, texto: 'mochila[0] es "lápiz": ¡la primera posición es 0!' },
        { items: elementos, marca: 2, texto: 'mochila[2] es "regla", el último. len(mochila) es 3.' },
        { items: [...elementos, '"goma"'], marca: 3, texto: 'mochila.append("goma") agrega al final, en la posición 3.' }
      ];
      temporizador(caja, pasos.length, 2000, i => {
        const p = pasos[i];
        zona.innerHTML = p.items.map((v, j) => `<div class="anim-celda ${j === p.marca ? 'marca' : ''}"><div class="anim-valor">${PB.util.esc(v)}</div><div class="anim-indice">${j}</div></div>`).join('');
        nota.textContent = p.texto;
      });
    },
    // Funciones como máquinas
    funcion(caja) {
      const zona = el('div', { class: 'anim-funcion' });
      const nota = el('p', { class: 'anim-nota' });
      caja.append(el('div', { class: 'anim-codigo' }, PB.bloqueCodigo('def doble(n):\n    return n * 2\n\nprint(doble(4))')), zona, nota);
      const pasos = ['entra', 'procesa', 'sale'];
      temporizador(caja, pasos.length, 1600, i => {
        zona.innerHTML = `<div class="anim-entrada ${i >= 0 ? 'activa' : ''}">4</div><div class="anim-maquina ${i === 1 ? 'trabajando' : ''}">doble<br><small>n * 2</small></div><div class="anim-salida ${i === 2 ? 'activa' : ''}">${i === 2 ? '8' : '?'}</div>`;
        nota.textContent = ['El valor 4 entra a la función y se guarda en el parámetro n.', 'La función calcula n * 2.', 'return devuelve 8, y print lo muestra.'][i];
      });
    }
  };

  return { menuEmergente, insigniaSVG, bloquesLectura, pregunta, Visor, codigoProbable, animacion };
})();

// Accesos cortos usados por el taller
PB.vistas = PB.vistas || {};
PB.vistas.menuEmergente = PB.comp.menuEmergente;
PB.vistas.insigniaSVG = (u, ganada) => PB.comp.insigniaSVG(u, ganada);
