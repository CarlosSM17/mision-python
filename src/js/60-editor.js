/* =========================================================================
 * 60-editor.js — Editor de texto, panel de Python, consola, variables y
 * barra de símbolos.
 *  · El editor usa un <textarea> con el resaltado detrás: funciona bien con
 *    el teclado del iPad (letra de 16 px para que Safari no haga zoom).
 *  · Las comillas “tipográficas” del iPad se cambian por comillas rectas.
 * ========================================================================= */
'use strict';

(() => {
  const { el, vaciar, esc } = PB.util;
  const ESPACIOS = '    ';

  /* ---------------------------------------------------------------- */
  class Editor {
    constructor(contenedor, { codigo = '', soloLectura = false, alCambiar = null } = {}) {
      this.alCambiar = alCambiar;
      this.marcas = {};
      this.raiz = el('div', { class: 'editor' + (soloLectura ? ' solo-lectura' : '') });
      this.numeros = el('div', { class: 'editor-numeros', 'aria-hidden': 'true' });
      this.capaNumeros = el('div', { class: 'editor-numeros-capa' });
      this.numeros.appendChild(this.capaNumeros);
      this.area = el('div', { class: 'editor-area' });
      this.resaltado = el('div', { class: 'editor-resaltado', 'aria-hidden': 'true' });
      this.texto = el('textarea', {
        class: 'editor-texto', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off',
        wrap: 'off', 'aria-label': 'Editor de código Python', 'data-gramm': 'false'
      });
      if (soloLectura) this.texto.readOnly = true;
      this.area.append(this.resaltado, this.texto);
      this.raiz.append(this.numeros, this.area);
      contenedor.appendChild(this.raiz);
      this.texto.value = codigo;
      this.texto.addEventListener('input', () => this._alEscribir());
      this.texto.addEventListener('scroll', () => this._sincronizar());
      this.texto.addEventListener('keydown', (ev) => this._teclas(ev));
      this._pintar();
    }

    get valor() { return this.texto.value; }
    set valor(v) { this.texto.value = v; this._pintar(); }

    _alEscribir() {
      const v = this.texto.value;
      const limpio = PB.util.quitarComillasTipograficas(v);
      if (limpio !== v) {
        const a = this.texto.selectionStart, b = this.texto.selectionEnd;
        this.texto.value = limpio;
        this.texto.setSelectionRange(a, b);
      }
      this._pintar();
      if (this.alCambiar) this.alCambiar(this.texto.value);
    }

    _pintar() {
      const lineas = PB.py.resaltar(this.texto.value);
      const htmlLineas = lineas.map((h, i) => `<div class="ed-linea${this.marcas[i + 1] ? ' ' + this.marcas[i + 1] : ''}">${h || ' '}</div>`);
      this.resaltado.innerHTML = htmlLineas.join('');
      this.capaNumeros.innerHTML = lineas.map((_, i) => `<div class="ed-num${this.marcas[i + 1] ? ' ' + this.marcas[i + 1] : ''}">${i + 1}</div>`).join('');
      this._sincronizar();
    }

    _sincronizar() {
      const x = this.texto.scrollLeft, y = this.texto.scrollTop;
      this.resaltado.style.transform = `translate(${-x}px, ${-y}px)`;
      this.capaNumeros.style.transform = `translateY(${-y}px)`;
    }

    _teclas(ev) {
      if (this.texto.readOnly) return;
      const t = this.texto;
      if (ev.key === 'Tab') {
        ev.preventDefault();
        this.sangrar(ev.shiftKey ? -1 : 1);
        return;
      }
      if (ev.key === 'Enter' && !ev.isComposing) {
        ev.preventDefault();
        const ini = t.selectionStart;
        const inicioLinea = t.value.lastIndexOf('\n', ini - 1) + 1;
        const linea = t.value.slice(inicioLinea, ini);
        let sangria = (linea.match(/^[ \t]*/) || [''])[0];
        const sinComentario = linea.replace(/#.*$/, '').trimEnd();
        if (sinComentario.endsWith(':')) sangria += ESPACIOS;
        if (/^\s*(return|break|continue|pass)\b/.test(linea)) sangria = sangria.slice(0, Math.max(0, sangria.length - 4));
        this.insertar('\n' + sangria);
        return;
      }
      if (ev.key === 'Backspace' && t.selectionStart === t.selectionEnd) {
        const ini = t.selectionStart;
        const inicioLinea = t.value.lastIndexOf('\n', ini - 1) + 1;
        const antes = t.value.slice(inicioLinea, ini);
        if (antes.length >= 4 && /^ +$/.test(antes) && antes.length % 4 === 0) {
          ev.preventDefault();
          t.setSelectionRange(ini - 4, ini);
          this.insertar('');
        }
      }
    }

    /** Inserta texto en el cursor conservando la opción de deshacer. */
    insertar(texto) {
      const t = this.texto;
      if (t.readOnly) return;
      if (document.activeElement !== t) t.focus({ preventScroll: true });
      let ok = false;
      try { ok = document.execCommand('insertText', false, texto); } catch (e) { ok = false; }
      if (!ok) {
        const a = t.selectionStart, b = t.selectionEnd;
        t.setRangeText(texto, a, b, 'end');
        this._alEscribir();
      }
    }

    sangrar(dir) {
      const t = this.texto;
      const v = t.value;
      const a = t.selectionStart, b = t.selectionEnd;
      const ini = v.lastIndexOf('\n', a - 1) + 1;
      if (a === b && dir > 0) { this.insertar(ESPACIOS); return; }
      let fin = v.indexOf('\n', b === a ? b : b - 1);
      if (fin < 0) fin = v.length;
      const bloque = v.slice(ini, fin);
      const nuevo = bloque.split('\n').map(l => dir > 0 ? ESPACIOS + l : l.replace(/^ {1,4}/, '')).join('\n');
      t.setSelectionRange(ini, fin);
      this.insertar(nuevo);
      t.setSelectionRange(ini, ini + nuevo.length);
    }

    marcarLinea(n, clase) {
      if (!n) return;
      this.marcas[n] = clase;
      this._pintar();
      // Desplazar para que la línea sea visible
      const alto = parseFloat(getComputedStyle(this.texto).lineHeight) || 24;
      const y = (n - 1) * alto;
      if (y < this.texto.scrollTop || y > this.texto.scrollTop + this.texto.clientHeight - alto * 2) {
        this.texto.scrollTop = Math.max(0, y - this.texto.clientHeight / 3);
      }
    }
    limpiarMarcas(clase) {
      if (clase) { for (const k of Object.keys(this.marcas)) if (this.marcas[k] === clase) delete this.marcas[k]; }
      else this.marcas = {};
      this._pintar();
    }
    enfocar() { this.texto.focus(); }
    soloLectura(v) { this.texto.readOnly = v; this.raiz.classList.toggle('solo-lectura', v); }
  }

  /* ---------------------------------------------------------------- */
  class PanelPython {
    constructor(contenedor, { alClicLinea, alEditarHueco } = {}) {
      this.alClicLinea = alClicLinea;
      this.alEditarHueco = alEditarHueco;
      this.raiz = el('div', { class: 'panel-python' });
      contenedor.appendChild(this.raiz);
      this.firma = null;
      this.marcas = {};
      this.lineas = [];
    }

    mostrar(gen) {
      const lineas = gen.lineas;
      const firma = lineas.map(l => l.segmentos.map(s => (s.hueco !== undefined ? '⟨' + s.hueco + '⟩' : s.texto)).join('')).join('\n');
      const enfocado = this.raiz.contains(document.activeElement) && document.activeElement.classList.contains('pl-hueco');
      if (firma === this.firma && enfocado) {
        // Solo actualiza los huecos que no se están editando
        for (const inp of this.raiz.querySelectorAll('.pl-hueco')) {
          if (inp === document.activeElement) continue;
          const h = gen.huecos.find(x => x.id === inp.dataset.id);
          if (h && inp.value !== h.texto) inp.value = h.texto;
        }
        return;
      }
      this.firma = firma;
      this.lineas = lineas;
      vaciar(this.raiz);
      if (!lineas.length) {
        this.raiz.appendChild(el('div', { class: 'pl-vacio' }, 'Aquí aparecerá el código Python de tus bloques.'));
        return;
      }
      lineas.forEach((l, i) => {
        const n = i + 1;
        const codigo = el('span', { class: 'pl-codigo' });
        for (const s of l.segmentos) {
          if (s.hueco !== undefined) {
            const inp = el('input', {
              class: 'pl-hueco', type: 'text', value: s.texto, 'data-id': s.hueco, placeholder: '___',
              autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off',
              size: String(Math.max(4, s.texto.length + 1)), 'aria-label': 'Hueco de la línea ' + n
            });
            inp.addEventListener('input', () => {
              const v = PB.util.quitarComillasTipograficas(inp.value);
              if (v !== inp.value) inp.value = v;
              inp.size = Math.max(4, v.length + 1);
              if (this.alEditarHueco) this.alEditarHueco(s.hueco, v);
            });
            inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); } });
            codigo.appendChild(inp);
          } else {
            const span = el('span');
            span.innerHTML = PB.py.resaltar(s.texto)[0] || '';
            codigo.appendChild(span);
          }
        }
        if (!l.segmentos.length) codigo.textContent = ' ';
        const fila = el('div', { class: 'pl-linea' + (this.marcas[n] ? ' ' + this.marcas[n] : ''), 'data-n': String(n) },
          el('span', { class: 'pl-num' }, String(n)), codigo);
        fila.addEventListener('click', (ev) => {
          if (ev.target.classList.contains('pl-hueco')) return;
          if (this.alClicLinea) this.alClicLinea(n, l.bloque);
        });
        this.raiz.appendChild(fila);
      });
    }

    marcar(n, clase, desplazar = true) {
      for (const f of this.raiz.querySelectorAll('.pl-linea.' + clase)) f.classList.remove(clase);
      for (const k of Object.keys(this.marcas)) if (this.marcas[k] === clase) delete this.marcas[k];
      if (!n) return;
      this.marcas[n] = clase;
      const fila = this.raiz.querySelector(`.pl-linea[data-n="${n}"]`);
      if (fila) {
        fila.classList.add(clase);
        if (desplazar) {
          const r = fila.getBoundingClientRect(), c = this.raiz.getBoundingClientRect();
          if (r.top < c.top || r.bottom > c.bottom) this.raiz.scrollTop += r.top - c.top - c.height / 3;
        }
      }
    }
    limpiar(clase) { this.marcar(null, clase); }
  }

  /* ---------------------------------------------------------------- */
  class Consola {
    constructor(contenedor) {
      this.raiz = el('div', { class: 'consola', role: 'log', 'aria-live': 'polite' });
      contenedor.appendChild(this.raiz);
      this.pedido = null;
      this.lineaActual = null;
      this.limpiar();
    }
    limpiar() {
      this.cancelarPedido();
      vaciar(this.raiz);
      this.lineaActual = null;
      this.raiz.appendChild(el('div', { class: 'consola-vacia' }, 'Presiona ▶ Ejecutar para ver aquí lo que muestra tu programa.'));
    }
    _quitarVacio() {
      const v = this.raiz.querySelector('.consola-vacia');
      if (v) v.remove();
    }
    _linea() {
      if (!this.lineaActual) {
        this.lineaActual = el('div', { class: 'consola-linea' });
        this.raiz.appendChild(this.lineaActual);
        const filas = this.raiz.querySelectorAll('.consola-linea');
        if (filas.length > 1500) filas[0].remove();
      }
      return this.lineaActual;
    }
    escribir(texto, clase) {
      this._quitarVacio();
      const partes = String(texto).split('\n');
      partes.forEach((p, i) => {
        if (i > 0) this.lineaActual = null;
        if (p === '' && i < partes.length - 1) { this._linea(); return; }
        if (p === '') return;
        const span = el('span', clase ? { class: clase } : null, p);
        this._linea().appendChild(span);
      });
      this.raiz.scrollTop = this.raiz.scrollHeight;
    }
    /** Muestra una caja para escribir (input). */
    pedir() {
      this._quitarVacio();
      return new Promise((resolve, reject) => {
        const linea = this._linea();
        const inp = el('input', {
          class: 'consola-entrada', type: 'text', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
          autocomplete: 'off', 'aria-label': 'Escribe la respuesta para el programa', enterkeyhint: 'send'
        });
        const boton = el('button', { class: 'consola-enviar', type: 'button', title: 'Enviar' }, 'Enviar ⏎');
        const enviar = () => {
          const v = PB.util.quitarComillasTipograficas(inp.value);
          inp.remove(); boton.remove();
          linea.appendChild(el('span', { class: 'consola-usuario' }, v));
          this.lineaActual = null;
          this.pedido = null;
          resolve(v);
        };
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); enviar(); } });
        boton.addEventListener('click', enviar);
        linea.append(inp, boton);
        this.pedido = { reject, inp, boton };
        this.raiz.scrollTop = this.raiz.scrollHeight;
        // preventScroll: sin esto, el navegador desplaza toda la página para mostrar la caja
        setTimeout(() => { inp.focus({ preventScroll: true }); this.raiz.scrollTop = this.raiz.scrollHeight; }, 30);
      });
    }
    cancelarPedido() {
      if (this.pedido) {
        this.pedido.inp.remove();
        this.pedido.boton.remove();
        this.pedido = null;
      }
    }
    /** Mensaje especial (error explicado, éxito, información). */
    mensaje(contenido, tipo = 'info') {
      this._quitarVacio();
      this.lineaActual = null;
      const caja = el('div', { class: 'consola-mensaje consola-' + tipo });
      if (contenido instanceof Node) caja.appendChild(contenido); else caja.innerHTML = contenido;
      this.raiz.appendChild(caja);
      this.raiz.scrollTop = this.raiz.scrollHeight;
      return caja;
    }
    mostrarError(exp) {
      if (!exp) return;
      const caja = el('div', {},
        el('div', { class: 'error-titulo' }, '⚠ ', exp.titulo),
        el('div', { class: 'error-texto' }, exp.texto),
        exp.original && exp.original !== exp.tipo ? el('div', { class: 'error-original' }, 'Mensaje de Python: ' + exp.original) : null);
      return this.mensaje(caja, exp.tipo === 'Detenido' ? 'info' : 'error');
    }
  }

  /* ---------------------------------------------------------------- */
  class TablaVariables {
    constructor(contenedor) {
      this.raiz = el('div', { class: 'variables' });
      contenedor.appendChild(this.raiz);
      this.previas = {};
      this.limpiar();
    }
    limpiar() {
      vaciar(this.raiz);
      this.previas = {};
      this.raiz.appendChild(el('p', { class: 'variables-vacio' }, 'Usa 👣 Paso a paso para ver cómo cambian las variables mientras el programa avanza.'));
    }
    mostrar(vars, locales, linea) {
      vaciar(this.raiz);
      this.raiz.appendChild(el('div', { class: 'variables-linea' }, linea ? `Línea ${linea}` : ''));
      const tabla = (titulo, lista, prefijo) => {
        if (!lista || !lista.length) return null;
        const t = el('table', { class: 'tabla-vars' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Variable'), el('th', {}, 'Valor'), el('th', {}, 'Tipo'))));
        const tb = el('tbody');
        for (const v of lista) {
          const k = prefijo + v.nombre;
          const cambio = this.previas[k] !== undefined && this.previas[k] !== v.valor;
          const nueva = this.previas[k] === undefined;
          tb.appendChild(el('tr', { class: cambio ? 'cambio' : nueva ? 'nueva' : '' },
            el('td', { class: 'var-nombre' }, v.nombre), el('td', { class: 'var-valor' }, v.valor), el('td', { class: 'var-tipo' }, v.tipo)));
          this.previas[k] = v.valor;
        }
        t.appendChild(tb);
        return el('div', {}, titulo ? el('div', { class: 'variables-titulo' }, titulo) : null, t);
      };
      const loc = tabla('Dentro de la función', locales, 'L:');
      const glo = tabla(locales && locales.length ? 'Variables del programa' : null, vars, 'G:');
      if (loc) this.raiz.appendChild(loc);
      if (glo) this.raiz.appendChild(glo);
      if (!loc && !glo) this.raiz.appendChild(el('p', { class: 'variables-vacio' }, 'Todavía no hay variables.'));
    }
  }

  /* ---------------------------------------------------------------- */
  const SIMBOLOS = [
    [':', ':'], ['(', '('], [')', ')'], ['"', '"'], ["'", "'"], ['=', '='], ['==', '=='], ['+', '+'], ['-', '-'],
    ['*', '*'], ['/', '/'], ['<', '<'], ['>', '>'], ['[', '['], [']', ']'], [',', ','], ['_', '_'], ['#', '#'],
    ['{', '{'], ['}', '}'], ['%', '%'], ['⇥', 'TAB'], ['⇤', 'DEDENT']
  ];
  /** Barra de símbolos para el teclado táctil. destino() devuelve el editor o input activo. */
  function barraSimbolos(contenedor, destino) {
    const barra = el('div', { class: 'barra-simbolos', role: 'toolbar', 'aria-label': 'Símbolos de Python' });
    for (const [etiqueta, valor] of SIMBOLOS) {
      const b = el('button', { type: 'button', class: 'simbolo', title: valor === 'TAB' ? 'Agregar sangría' : valor === 'DEDENT' ? 'Quitar sangría' : 'Escribir ' + etiqueta }, etiqueta);
      // pointerdown + preventDefault: el foco se queda en el editor
      b.addEventListener('pointerdown', ev => ev.preventDefault());
      b.addEventListener('mousedown', ev => ev.preventDefault());
      b.addEventListener('click', () => {
        const d = destino();
        if (!d) return;
        if (d instanceof Editor) {
          if (valor === 'TAB') d.sangrar(1);
          else if (valor === 'DEDENT') d.sangrar(-1);
          else d.insertar(valor);
        } else if (d.tagName === 'INPUT') {
          if (valor === 'TAB' || valor === 'DEDENT') return;
          const a = d.selectionStart ?? d.value.length, z = d.selectionEnd ?? d.value.length;
          d.setRangeText(valor, a, z, 'end');
          d.dispatchEvent(new Event('input', { bubbles: true }));
          d.focus();
        }
      });
      barra.appendChild(b);
    }
    contenedor.appendChild(barra);
    return barra;
  }

  /** Código Python con resaltado, solo para leer (teoría, fichas, preguntas). */
  function bloqueCodigo(codigo, { numeros = false, clase = '' } = {}) {
    const lineas = PB.py.resaltar(codigo.replace(/\n$/, ''));
    const pre = el('pre', { class: 'codigo ' + clase + (numeros ? ' con-numeros' : '') });
    pre.innerHTML = lineas.map((h, i) => numeros
      ? `<span class="cn">${i + 1}</span>${h || ' '}`
      : (h || ' ')).join('\n');
    return pre;
  }

  PB.Editor = Editor;
  PB.PanelPython = PanelPython;
  PB.Consola = Consola;
  PB.TablaVariables = TablaVariables;
  PB.barraSimbolos = barraSimbolos;
  PB.bloqueCodigo = bloqueCodigo;
  PB.esc = esc;
})();
