/* =========================================================================
 * 61-taller.js — El taller: donde se resuelve cada reto.
 *
 * Modos de trabajo (CLT4BP):
 *   1 Bloques    → se arma con bloques; el Python se ve, solo para leer
 *   2 Completar  → se arma con bloques y se escriben en Python los huecos
 *   3 Con apoyo  → se escribe Python; los bloques sirven de pista
 *   4 Libre      → se escribe Python; bloques solo como borrador
 * ========================================================================= */
'use strict';

PB.Taller = (() => {
  const { el, vaciar } = PB.util;
  const NOMBRES_MODO = { 1: 'Bloques', 2: 'Completar', 3: 'Con apoyo', 4: 'Libre' };
  const DESC_MODO = {
    1: 'Arma el programa con bloques. El Python aparece a un lado para que lo leas.',
    2: 'Arma con bloques y escribe en Python lo que va en los huecos amarillos ✎ (en el bloque o en el panel de Python).',
    3: 'Escribe el programa en Python. Si te atoras, abre los bloques como pista.',
    4: 'Escribe tu programa en Python, de principio a fin. Puedes usar bloques como borrador.'
  };
  const NOMBRE_NIVEL = { explorador: 'Explorador', programador: 'Programador', maestro: 'Maestro' };
  const VELOCIDADES = [{ t: 'Lento', ms: 1100 }, { t: 'Normal', ms: 600 }, { t: 'Rápido', ms: 220 }];

  class Taller {
    /**
     * opciones: { sesion, reto, nivel, modo, tipo ('micro'|'reto'|'extra'|'proyecto'|'libre'),
     *             codigoInicial, claveExtra, alSuperar(res), alVolver(), titulo, etiqueta }
     */
    constructor(contenedor, opciones) {
      this.o = opciones;
      this.sesion = opciones.sesion;
      this.reto = opciones.reto || { id: 'libre', titulo: opciones.titulo || 'Taller libre' };
      this.nivel = opciones.nivel || null;
      this.modoMin = PB.estado.docente ? 1 : (opciones.modoMinimo || this.sesion.modo || 1);
      const preferido = PB.progreso.borrador('modo:' + this.reto.id + ':' + (this.nivel || '-'));
      this.modo = Math.max(this.modoMin, opciones.modo || preferido || this.sesion.modo || 1);
      this.gen = { codigo: '', lineas: [], bloqueALinea: {}, lineaABloque: {}, huecos: [] };
      this.pistasVistas = 0;
      this.destruido = false;
      this.velocidad = 1;
      this.vista = 'trabajo';

      this.raiz = el('div', { class: 'taller' });
      contenedor.appendChild(this.raiz);
      this._armar();
      this._entrarModo(this.modo, true);
      this._observarTamano();
    }

    /* ------------------------------------------------------------ */
    get claveBase() { return this.reto.id + ':' + (this.nivel || '-') + (this.o.claveExtra ? ':' + this.o.claveExtra : ''); }
    get esProyecto() { return this.o.tipo === 'proyecto'; }
    get esLibre() { return this.o.tipo === 'libre'; }

    codigoInicial() {
      if (this.o.codigoInicial !== undefined) return this.o.codigoInicial;
      const n = this.reto.niveles && this.nivel && this.reto.niveles[this.nivel];
      if (n && n.inicio !== undefined) return n.inicio;
      return this.reto.inicio || '';
    }

    /* ---------------- Estructura ---------------- */
    _armar() {
      const r = this.raiz;
      // Cabecera
      const etiqueta = this.o.etiqueta || ({ reto: 'Reto rápido', mision: 'Misión', extra: 'Reto extra', proyecto: 'Proyecto', libre: 'Taller libre' }[this.o.tipo] || 'Reto');
      this.btnEnunciado = el('button', { class: 'btn btn-suave btn-chico', onclick: () => this._alternarEnunciado(), 'aria-expanded': 'true' }, '📄 Enunciado');
      this.selModo = el('div', { class: 'selector-modo', role: 'radiogroup', 'aria-label': 'Modo de trabajo' });
      for (let m = 1; m <= 4; m++) {
        const b = el('button', {
          class: 'modo-btn', role: 'radio', 'data-modo': String(m), title: DESC_MODO[m],
          disabled: m < this.modoMin ? true : null,
          onclick: () => this.cambiarModo(m)
        }, el('span', { class: 'modo-num' }, String(m)), el('span', { class: 'modo-nombre' }, NOMBRES_MODO[m]));
        this.selModo.appendChild(b);
      }
      this.btnEjecutar = el('button', { class: 'btn btn-ejecutar', onclick: () => this.ejecutar() }, '▶ Ejecutar');
      this.btnPaso = el('button', { class: 'btn btn-suave', onclick: () => this.ejecutar(true), title: 'Ejecutar línea por línea y ver las variables' }, '👣 Paso a paso');
      this.btnDetener = el('button', { class: 'btn btn-detener', onclick: () => PB.ejecutor.detener(), hidden: true }, '⏹ Detener');
      this.btnComprobar = el('button', { class: 'btn btn-primario', onclick: () => this.comprobar() }, this.esProyecto ? '✔ Revisar requisitos' : '✔ Comprobar');
      if (this.esLibre) this.btnComprobar.hidden = true;
      this.btnMas = el('button', { class: 'btn btn-suave btn-icono', onclick: (ev) => this._menu(ev), title: 'Más opciones', 'aria-label': 'Más opciones' }, '⋯');

      this.controlesPaso = el('div', { class: 'controles-paso', hidden: true },
        this.btnPausa = el('button', { class: 'btn btn-chico btn-suave', onclick: () => this._pausar() }, '⏸ Pausa'),
        this.btnSiguiente = el('button', { class: 'btn btn-chico btn-suave', onclick: () => PB.ejecutor.siguientePaso(), disabled: true }, 'Siguiente ▸'),
        this.btnVelocidad = el('button', { class: 'btn btn-chico btn-suave', onclick: () => this._cambiarVelocidad() }, 'Velocidad: Normal'));

      r.appendChild(el('div', { class: 'taller-cabeza' },
        el('div', { class: 'taller-titulo' },
          this.o.alVolver ? el('button', { class: 'btn-icono volver', onclick: () => this.o.alVolver(), title: 'Volver', 'aria-label': 'Volver' }, '←') : null,
          el('div', {},
            el('div', { class: 'taller-etiqueta' }, etiqueta, this.nivel ? el('span', { class: 'chip chip-' + this.nivel }, NOMBRE_NIVEL[this.nivel]) : null),
            el('h2', {}, this.o.titulo || this.reto.titulo))),
        el('div', { class: 'taller-controles' }, this.btnEnunciado, this.selModo, this.btnEjecutar, this.btnPaso, this.btnDetener, this.btnComprobar, this.btnMas),
        this.controlesPaso));

      // Enunciado: abierto la primera vez; si ya hay trabajo guardado, plegado
      const yaTrabajo = PB.progreso.borrador('b:' + this.claveBase) || PB.progreso.borrador('t:' + this.claveBase);
      this.enunciado = el('div', { class: 'taller-enunciado' + (yaTrabajo ? '' : ' abierto') });
      this.btnEnunciado.setAttribute('aria-expanded', String(!yaTrabajo));
      r.appendChild(this.enunciado);
      this._pintarEnunciado();

      // Pestañas para pantallas angostas
      this.pestanas = el('div', { class: 'taller-pestanas', role: 'tablist' });
      r.appendChild(this.pestanas);

      // Cuerpo
      this.trabajo = el('div', { class: 'taller-trabajo' });
      this.lateralSup = el('div', { class: 'lateral-sup' });
      this.lateralInf = el('div', { class: 'lateral-inf' });
      this.subPestanas = el('div', { class: 'sub-pestanas', role: 'tablist' });
      this.contConsola = el('div', { class: 'sub-panel sub-consola activo' });
      this.contVars = el('div', { class: 'sub-panel sub-vars' });
      this.contResultados = el('div', { class: 'sub-panel sub-resultados' });
      for (const [k, t] of [['consola', 'Consola'], ['vars', 'Variables'], ['resultados', 'Resultados']]) {
        this.subPestanas.appendChild(el('button', { class: 'sub-pestana' + (k === 'consola' ? ' activo' : ''), 'data-sub': k, role: 'tab', onclick: () => this._sub(k) }, t));
      }
      this.lateralInf.append(this.subPestanas, this.contConsola, this.contVars, this.contResultados);
      this.cuerpo = el('div', { class: 'taller-cuerpo' }, this.trabajo, el('div', { class: 'taller-lateral' }, this.lateralSup, this.lateralInf));
      r.appendChild(this.cuerpo);

      this.consola = new PB.Consola(this.contConsola);
      this.tablaVars = new PB.TablaVariables(this.contVars);
      vaciar(this.contResultados).appendChild(el('p', { class: 'nota centro' }, this.esProyecto ? 'Presiona «Revisar requisitos» para ver la lista de cotejo.' : 'Presiona «✔ Comprobar» para revisar tu programa con los casos de prueba.'));
      this._actualizarSelectorModo();
    }

    _sub(k) {
      for (const b of this.subPestanas.children) b.classList.toggle('activo', b.dataset.sub === k);
      this.contConsola.classList.toggle('activo', k === 'consola');
      this.contVars.classList.toggle('activo', k === 'vars');
      this.contResultados.classList.toggle('activo', k === 'resultados');
      if (this.raiz.classList.contains('angosto')) this._vista('inf');
    }

    _pestanasAngostas() {
      vaciar(this.pestanas);
      const sup = this.modo <= 2 ? '🐍 Python' : '🧩 Bloques';
      const trabajo = this.modo <= 2 ? '🧩 Bloques' : '✍ Código';
      for (const [k, t] of [['trabajo', trabajo], ['sup', sup], ['inf', '▶ Consola']]) {
        this.pestanas.appendChild(el('button', { class: 'taller-pestana' + (this.vista === k ? ' activo' : ''), 'data-vista': k, role: 'tab', onclick: () => this._vista(k) }, t));
      }
    }
    _vista(k) {
      this.vista = k;
      this.raiz.dataset.vista = k;
      for (const b of this.pestanas.children) b.classList.toggle('activo', b.dataset.vista === k);
      setTimeout(() => this._redimensionar(), 30);
    }

    _alternarEnunciado(forzar) {
      const abierto = forzar !== undefined ? forzar : !this.enunciado.classList.contains('abierto');
      this.enunciado.classList.toggle('abierto', abierto);
      this.btnEnunciado.setAttribute('aria-expanded', String(abierto));
      setTimeout(() => this._redimensionar(), 260);
    }

    _pintarEnunciado() {
      const e = vaciar(this.enunciado);
      const reto = this.reto;
      const nivel = reto.niveles && this.nivel ? reto.niveles[this.nivel] || {} : {};
      const col = el('div', { class: 'enunciado-principal' });
      if (reto.historia) col.appendChild(el('p', { class: 'historia' }, reto.historia));
      if (reto.enunciado || this.o.enunciado) col.appendChild(el('div', { class: 'tarea', html: this.o.enunciado || reto.enunciado }));
      if (nivel.enunciado) col.appendChild(el('div', { class: 'tarea-nivel nivel-' + this.nivel, html: '<strong>' + NOMBRE_NIVEL[this.nivel] + ':</strong> ' + nivel.enunciado }));
      const cfg = PB.verificador.configuracion(reto, this.nivel);
      if (cfg.requiere.length || cfg.prohibe.length) {
        const lista = el('ul', { class: 'requisitos' });
        this.listaRequisitos = lista;
        this._pintarRequisitos(null);
        col.appendChild(el('div', { class: 'requisitos-caja' }, el('strong', {}, this.esProyecto ? 'Lista de cotejo:' : 'Tu programa debe:'), lista));
      }
      const ejemplo = reto.ejemplo || (cfg.pruebas[0] && !this.esProyecto ? this._ejemploDePrueba(cfg.pruebas[0]) : null);
      if (ejemplo) col.appendChild(el('div', { class: 'ejemplo-ejecucion' }, el('strong', {}, 'Ejemplo de ejecución:'), PB.bloqueCodigo(ejemplo, { clase: 'salida' })));
      e.appendChild(col);

      const lado = el('div', { class: 'enunciado-lado' });
      lado.appendChild(el('div', { class: 'modo-explicacion' }, el('strong', {}, 'Modo ' + this.modo + ' · ' + NOMBRES_MODO[this.modo] + ': '), DESC_MODO[this.modo]));
      const pistas = nivel.pistas || reto.pistas || [];
      if (pistas.length) {
        const cajaPistas = el('div', { class: 'pistas' });
        const pintar = () => {
          vaciar(cajaPistas);
          pistas.slice(0, this.pistasVistas).forEach((p, i) => {
            cajaPistas.appendChild(el('div', { class: 'pista' }, el('span', { class: 'pista-num' }, `Pista ${i + 1}`), el('span', { html: p })));
          });
          if (this.pistasVistas < pistas.length) {
            const etiquetas = ['¿Qué concepto uso?', '¿Cómo se organiza el programa?', '¿Qué pieza falta?'];
            cajaPistas.appendChild(el('button', {
              class: 'btn btn-suave btn-chico', onclick: () => { this.pistasVistas++; pintar(); }
            }, `💡 Pista ${this.pistasVistas + 1} de ${pistas.length}: ${etiquetas[Math.min(this.pistasVistas, 2)]}`));
          }
        };
        pintar();
        lado.appendChild(cajaPistas);
      }
      const fichas = this.sesion.fichas || [];
      if (fichas.length) {
        const det = el('details', { class: 'fichas-taller' }, el('summary', {}, '📑 Fichas de sintaxis'));
        for (const f of fichas) {
          det.appendChild(el('div', { class: 'ficha-mini' }, el('div', { class: 'ficha-titulo' }, f.titulo), PB.bloqueCodigo(f.codigo), f.nota ? el('p', { class: 'nota', html: f.nota }) : null));
        }
        lado.appendChild(det);
      }
      e.appendChild(lado);
    }

    _ejemploDePrueba(p) {
      if (!p.contiene && !p.exacto) return null;
      const partes = [];
      if (p.entradas && p.entradas.length) partes.push('Si escribes: ' + p.entradas.join(', '));
      if (p.azar && p.azar.length) partes.push((partes.length ? 'y el' : 'Si el') + ' valor al azar es ' + p.azar.join(', '));
      partes.push(partes.length ? 'debe aparecer:' : 'Debe aparecer:');
      return partes.join(' ') + '\n' + (p.exacto || p.contiene.join('\n'));
    }

    _pintarRequisitos(resultados) {
      if (!this.listaRequisitos) return;
      const cfg = PB.verificador.configuracion(this.reto, this.nivel);
      const items = resultados || PB.verificador.revisarRestricciones('', cfg.requiere, cfg.prohibe).map(x => Object.assign(x, { ok: null }));
      vaciar(this.listaRequisitos);
      for (const it of items) {
        this.listaRequisitos.appendChild(el('li', { class: it.ok === true ? 'ok' : it.ok === false ? 'no' : '' }, it.texto));
      }
    }

    _actualizarSelectorModo() {
      for (const b of this.selModo.children) {
        const m = +b.dataset.modo;
        b.classList.toggle('activo', m === this.modo);
        b.setAttribute('aria-checked', String(m === this.modo));
        b.disabled = m < this.modoMin;
      }
      this.raiz.classList.remove('modo-1', 'modo-2', 'modo-3', 'modo-4');
      this.raiz.classList.add('modo-' + this.modo);
    }

    /* ---------------- Modos ---------------- */
    async cambiarModo(m) {
      if (m === this.modo || m < this.modoMin) return;
      if (PB.ejecutor.ocupado) PB.ejecutor.detener();
      const codigo = this.codigoActual();
      const deBloques = this.modo <= 2, aBloques = m <= 2;
      if (deBloques && !aBloques) {
        // Pasamos el Python de los bloques al editor
        PB.progreso.guardarBorrador('t:' + this.claveBase, codigo);
      } else if (!deBloques && aBloques) {
        const diag = PB.py.revisarSintaxis(codigo);
        if (diag) {
          PB.ui.alerta(`Antes de volver a los bloques corrige el error de la línea ${diag.linea}: ${diag.mensaje}`, 'No se puede convertir');
          return;
        }
        try {
          const r = PB.conv.aBloques(codigo);
          PB.progreso.guardarBorrador('b:' + this.claveBase, { bloques: r.json, generado: true });
        } catch (e) { /* se queda el borrador anterior */ }
      }
      PB.progreso.guardarBorrador('modo:' + this.reto.id + ':' + (this.nivel || '-'), m);
      this._entrarModo(m, false);
    }

    _entrarModo(m, inicial) {
      this.modo = m;
      this._actualizarSelectorModo();
      this._limpiarTrabajo();
      if (m <= 2) this._montarBloques(inicial); else this._montarTexto(inicial);
      this._pestanasAngostas();
      this._vista('trabajo');
      if (!inicial) this._pintarEnunciado();
      setTimeout(() => this._redimensionar(), 50);
    }

    _limpiarTrabajo() {
      for (const ws of [this.ws, this.wsPista]) { if (ws) { try { ws.dispose(); } catch (e) { /* nada */ } } }
      this.ws = null; this.wsPista = null; this.editor = null; this.panel = null;
      vaciar(this.trabajo); vaciar(this.lateralSup);
    }

    _montarBloques(inicial) {
      const div = el('div', { class: 'blockly-div' });
      this.trabajo.appendChild(div);
      this.ws = PB.blockly.crearEspacio(div, { sesion: this.sesion.numero, modo: this.modo, permitidos: this.reto.bloques || null, escala: PB.estado.escalaBloques });
      // Panel de Python
      const cab = el('div', { class: 'lateral-cabeza' }, el('span', {}, '🐍 Python'), el('span', { class: 'nota' }, this.modo === 2 ? 'Escribe en los huecos amarillos' : 'Toca una línea para ver su bloque'));
      const cont = el('div', { class: 'panel-python-cont' });
      this.lateralSup.append(cab, cont);
      this.panel = new PB.PanelPython(cont, {
        alClicLinea: (n, id) => {
          if (!id || !this.ws) return;
          const b = this.ws.getBlockById(id);
          if (b) { b.select(); this._centrarSiFuera(b); }
        },
        alEditarHueco: (id, texto) => {
          const b = this.ws && this.ws.getBlockById(id);
          if (b) b.setFieldValue(texto, 'CODIGO');
        }
      });
      if (this.modo === 2) {
        this.barra = PB.barraSimbolos(this.lateralSup, () => (document.activeElement && document.activeElement.classList.contains('pl-hueco')) ? document.activeElement : this._ultimoHueco);
        this.lateralSup.addEventListener('focusin', ev => { if (ev.target.classList.contains('pl-hueco')) this._ultimoHueco = ev.target; });
      }
      // Contenido inicial: borrador o código del reto
      const borrador = PB.progreso.borrador('b:' + this.claveBase);
      let cargado = false;
      if (borrador && borrador.bloques) {
        try {
          Blockly.Events.disable();
          Blockly.serialization.workspaces.load(borrador.bloques, this.ws);
          cargado = true;
        } catch (e) { console.warn('Borrador dañado', e); } finally { Blockly.Events.enable(); }
      }
      if (!cargado) {
        try { PB.conv.cargar(this.ws, this.codigoInicial()); } catch (e) { console.warn('Código inicial no convertible', e); }
      }
      const regenerar = PB.util.debounce(() => this._regenerar(true), 120);
      this.ws.addChangeListener((ev) => {
        if (this.destruido) return;
        if (ev.type === Blockly.Events.SELECTED) { this._alSeleccionar(ev.newElementId); return; }
        if (ev.isUiEvent) return;
        regenerar();
      });
      this._regenerar(false);
      setTimeout(() => PB.blockly.encuadrar(this.ws, PB.estado.escalaBloques || 0.85), 60);
    }

    _centrarSiFuera(b) {
      try {
        const m = this.ws.getMetrics();
        const xy = b.getRelativeToSurfaceXY();
        const x = xy.x * this.ws.scale, y = xy.y * this.ws.scale;
        if (x < m.viewLeft || x > m.viewLeft + m.viewWidth - 40 || y < m.viewTop || y > m.viewTop + m.viewHeight - 40) this.ws.centerOnBlock(b.id);
      } catch (e) { /* nada */ }
    }

    _alSeleccionar(id) {
      if (!this.panel) return;
      if (!id) { this.panel.limpiar('sel'); return; }
      const b = this.ws.getBlockById(id);
      const n = b ? PB.gen.lineaDeBloque(this.gen, b) : null;
      this.panel.marcar(n, 'sel');
    }

    _regenerar(guardar) {
      if (!this.ws) return;
      this.gen = PB.gen.generar(this.ws);
      this.panel.mostrar(this.gen);
      if (guardar) {
        const json = Blockly.serialization.workspaces.save(this.ws);
        PB.progreso.guardarBorrador('b:' + this.claveBase, { bloques: json });
      }
      if (this.esProyecto) this._requisitosEnVivo();
    }

    _montarTexto(inicial) {
      const cont = el('div', { class: 'editor-cont' });
      this.trabajo.appendChild(cont);
      let codigo = PB.progreso.borrador('t:' + this.claveBase);
      if (codigo === undefined || codigo === null) codigo = this._inicialComoTexto();
      const guardar = PB.util.debounce((v) => {
        PB.progreso.guardarBorrador('t:' + this.claveBase, v);
        if (this.esProyecto) this._requisitosEnVivo();
        if (this.pistaActiva === 'mio') this._pintarPistaMio();
      }, 400);
      this.editor = new PB.Editor(cont, { codigo, alCambiar: (v) => { this.editor.limpiarMarcas('error'); guardar(v); } });
      PB.barraSimbolos(this.trabajo, () => this.editor);
      // Panel lateral de bloques (pista o borrador)
      const opciones = this.modo === 3 ? [['mio', 'Mi código'], ['pista', 'Pista'], ['borrador', 'Borrador']] : [['mio', 'Mi código'], ['borrador', 'Borrador']];
      const seg = el('div', { class: 'segmentado' });
      for (const [k, t] of opciones) seg.appendChild(el('button', { class: 'seg-btn', 'data-k': k, onclick: () => this._pista(k) }, t));
      this.cuerpoPista = el('div', { class: 'pista-bloques' });
      const cab = el('div', { class: 'lateral-cabeza' }, el('span', {}, '🧩 Bloques'), seg,
        el('button', { class: 'btn-icono btn-plegar', title: 'Mostrar u ocultar los bloques', 'aria-label': 'Mostrar u ocultar los bloques', onclick: () => this._plegarPista() }, '▾'));
      this.lateralSup.append(cab, this.cuerpoPista);
      this.segPista = seg;
      this.raiz.classList.toggle('pista-plegada', this.modo === 4);
      this._pista(this.modo === 3 ? 'mio' : 'borrador', true);
      if (this.esProyecto) this._requisitosEnVivo();
    }

    _inicialComoTexto() {
      const c = this.codigoInicial();
      return c.replace(/«([^»]*)»/g, (_, t) => t || '___');
    }

    _plegarPista() {
      this.raiz.classList.toggle('pista-plegada');
      setTimeout(() => this._redimensionar(), 260);
    }

    _pista(k, inicial) {
      this.pistaActiva = k;
      for (const b of this.segPista.children) b.classList.toggle('activo', b.dataset.k === k);
      if (this.wsPista) { try { this.wsPista.dispose(); } catch (e) { /* nada */ } this.wsPista = null; }
      vaciar(this.cuerpoPista);
      if (!inicial && this.raiz.classList.contains('pista-plegada')) this._plegarPista();
      if (k === 'mio') this._pintarPistaMio();
      else if (k === 'pista') {
        const div = el('div', { class: 'blockly-div' });
        this.cuerpoPista.appendChild(el('p', { class: 'nota pista-nota' }, 'Así empieza la solución. Las piezas vacías son las que tú debes completar.'), div);
        this.wsPista = PB.blockly.crearLectura(div, 0.7);
        const n = this.reto.niveles && this.reto.niveles.explorador;
        const base = (n && n.inicio) || this.codigoInicial();
        try { PB.conv.cargar(this.wsPista, base); } catch (e) { /* nada */ }
        setTimeout(() => PB.blockly.encuadrar(this.wsPista, 0.75), 60);
      } else if (k === 'borrador') {
        const div = el('div', { class: 'blockly-div' });
        const acciones = el('div', { class: 'pista-acciones' },
          el('button', { class: 'btn btn-chico btn-suave', onclick: () => this._borradorAEditor() }, '⬅ Pasar al editor'),
          el('button', { class: 'btn btn-chico btn-suave', onclick: () => this._editorABorrador() }, 'Traer del editor ➡'));
        this.cuerpoPista.append(acciones, div);
        this.wsPista = PB.blockly.crearEspacio(div, { sesion: this.sesion.numero, modo: 1, permitidos: null, escala: 0.7 });
        const b = PB.progreso.borrador('bb:' + this.claveBase);
        if (b) { try { Blockly.serialization.workspaces.load(b, this.wsPista); } catch (e) { /* nada */ } }
        this.wsPista.addChangeListener(PB.util.debounce((ev) => {
          if (this.destruido || !this.wsPista) return;
          PB.progreso.guardarBorrador('bb:' + this.claveBase, Blockly.serialization.workspaces.save(this.wsPista));
        }, 400));
      }
      setTimeout(() => this._redimensionar(), 60);
    }

    _pintarPistaMio() {
      if (!this.cuerpoPista || this.pistaActiva !== 'mio') return;
      const codigo = this.editor ? this.editor.valor : '';
      if (!this.wsPista) {
        vaciar(this.cuerpoPista);
        this.avisoPista = el('p', { class: 'nota pista-nota' }, 'Tu código, convertido en bloques.');
        const div = el('div', { class: 'blockly-div' });
        this.cuerpoPista.append(this.avisoPista, div);
        this.wsPista = PB.blockly.crearLectura(div, 0.7);
      }
      const diag = PB.py.revisarSintaxis(codigo);
      if (diag) {
        this.avisoPista.textContent = `Corrige la línea ${diag.linea} para ver tus bloques: ${diag.mensaje}`;
        this.avisoPista.classList.add('aviso-error');
        return;
      }
      this.avisoPista.textContent = 'Tu código, convertido en bloques.';
      this.avisoPista.classList.remove('aviso-error');
      try { PB.conv.cargar(this.wsPista, codigo); PB.blockly.encuadrar(this.wsPista, 0.75); } catch (e) { /* nada */ }
    }

    async _borradorAEditor() {
      if (!this.wsPista) return;
      const codigo = PB.gen.generar(this.wsPista).codigo;
      if (!codigo.trim()) { PB.ui.aviso('El borrador está vacío.', 'info'); return; }
      if (this.editor.valor.trim() && !(await PB.ui.confirmar('Se reemplazará lo que tienes en el editor por el código del borrador. ¿Continuar?', 'Pasar al editor', 'Reemplazar'))) return;
      this.editor.valor = codigo;
      PB.progreso.guardarBorrador('t:' + this.claveBase, codigo);
    }

    _editorABorrador() {
      const diag = PB.py.revisarSintaxis(this.editor.valor);
      if (diag) { PB.ui.alerta(`Corrige primero la línea ${diag.linea}: ${diag.mensaje}`); return; }
      try { PB.conv.cargar(this.wsPista, this.editor.valor); PB.blockly.encuadrar(this.wsPista, 0.75); } catch (e) { /* nada */ }
    }

    /* ---------------- Código actual ---------------- */
    codigoActual() {
      if (this.modo <= 2) {
        if (this.ws) this.gen = PB.gen.generar(this.ws);
        return this.gen.codigo;
      }
      return this.editor ? this.editor.valor : '';
    }

    _marcarLinea(n, clase) {
      if (this.modo <= 2) {
        if (this.panel) this.panel.marcar(n, clase);
        if (this.ws) {
          const id = n ? this.gen.lineaABloque[n] : null;
          if (clase === 'actual') this.ws.highlightBlock(id || null);
          if (clase === 'error' && id) {
            const b = this.ws.getBlockById(id);
            if (b) { b.select(); this._centrarSiFuera(b); }
          }
        }
      } else if (this.editor) {
        this.editor.limpiarMarcas(clase);
        if (n) this.editor.marcarLinea(n, clase);
      }
    }
    _limpiarMarcas() {
      if (this.panel) { this.panel.limpiar('actual'); this.panel.limpiar('error'); }
      if (this.ws) this.ws.highlightBlock(null);
      if (this.editor) this.editor.limpiarMarcas();
    }

    /* ---------------- Ejecutar ---------------- */
    _ocupado(si, paso) {
      this.btnEjecutar.hidden = si;
      this.btnPaso.hidden = si;
      this.btnDetener.hidden = !si;
      this.btnComprobar.disabled = si;
      this.controlesPaso.hidden = !(si && paso);
      this.raiz.classList.toggle('paso-activo', !!(si && paso));
      setTimeout(() => this._redimensionar(), 30);
    }

    async ejecutar(paso = false) {
      if (PB.ejecutor.ocupado) return;
      const codigo = this.codigoActual();
      this._limpiarMarcas();
      this.consola.limpiar();
      this._sub('consola');
      if (this.raiz.classList.contains('angosto')) this._vista('inf');
      if (!codigo.trim()) {
        this.consola.mensaje(this.modo <= 2 ? 'Tu programa está vacío: arrastra bloques desde la caja de herramientas.' : 'Tu programa está vacío: escribe código en el editor.', 'info');
        return;
      }
      const diag = PB.py.revisarSintaxis(codigo);
      if (diag) {
        const exp = PB.errores.explicar({ tipo: diag.tipo, mensaje: diag.mensaje, linea: diag.linea, original: diag.tipo }, codigo);
        this.consola.mostrarError(exp);
        this._marcarLinea(exp.linea, 'error');
        return;
      }
      if (paso) {
        this.tablaVars.limpiar();
        PB.ejecutor.pausar(false);
        this.btnPausa.textContent = '⏸ Pausa';
        this.btnSiguiente.disabled = true;
      }
      this._ocupado(true, paso);
      const res = await PB.ejecutor.ejecutar(codigo, {
        alSalida: t => this.consola.escribir(t),
        alEntrada: () => {
          if (this.raiz.classList.contains('angosto')) this._vista('inf');
          return this.consola.pedir();
        },
        paso: paso ? {
          retardo: VELOCIDADES[this.velocidad].ms,
          alLinea: (linea, vars, locales) => {
            this._marcarLinea(linea, 'actual');
            this.tablaVars.mostrar(vars, locales, linea);
          }
        } : null
      });
      this.consola.cancelarPedido();
      this._ocupado(false);
      if (this.ws) this.ws.highlightBlock(null);
      if (this.panel) this.panel.limpiar('actual');
      if (this.editor) this.editor.limpiarMarcas('actual');
      if (res.error) {
        const exp = PB.errores.explicar(res.error, codigo);
        this.consola.mostrarError(exp);
        if (exp.linea) this._marcarLinea(exp.linea, 'error');
      } else {
        this.consola.mensaje('✔ El programa terminó.', 'exito');
      }
      PB.progreso.registrarEjecucion(this.claveBase, codigo, !res.error);
      if (PB.ganchos) PB.ganchos.alEjecutar(!res.error, res.error);
      if (paso && PB.ganchos) PB.ganchos.alPaso();
      if (this.esProyecto) this._requisitosEnVivo();
    }

    _pausar() {
      const p = !PB.ejecutor.pausado;
      PB.ejecutor.pausar(p);
      this.btnPausa.textContent = p ? '▶ Seguir' : '⏸ Pausa';
      this.btnSiguiente.disabled = !p;
    }
    _cambiarVelocidad() {
      this.velocidad = (this.velocidad + 1) % VELOCIDADES.length;
      PB.ejecutor.fijarRetardo(VELOCIDADES[this.velocidad].ms);
      this.btnVelocidad.textContent = 'Velocidad: ' + VELOCIDADES[this.velocidad].t;
    }

    /* ---------------- Comprobar ---------------- */
    _requisitosEnVivo() {
      if (!this.esProyecto || !this.listaRequisitos) return;
      const codigo = this.codigoActual();
      const cfg = PB.verificador.configuracion(this.reto, this.nivel);
      const r = PB.verificador.revisarRestricciones(codigo, cfg.requiere, cfg.prohibe);
      r.push({ texto: 'se ejecuta completo sin errores (ejecútalo con ▶)', ok: PB.progreso.ejecucionOk(this.claveBase, codigo) });
      this._pintarRequisitos(r);
      return r;
    }

    async comprobar() {
      if (PB.ejecutor.ocupado) return;
      const codigo = this.codigoActual();
      this._limpiarMarcas();
      this._sub('resultados');
      const caja = vaciar(this.contResultados);
      PB.progreso.sumarIntento(this.reto.id);

      if (this.esProyecto) {
        const r = this._requisitosEnVivo() || [];
        const cumplidos = r.filter(x => x.ok).length;
        PB.progreso.guardarRequisitos(this.reto.id, cumplidos, r.length);
        caja.appendChild(el('h3', {}, `Lista de cotejo: ${cumplidos} de ${r.length}`));
        const ul = el('ul', { class: 'requisitos grande' });
        for (const it of r) ul.appendChild(el('li', { class: it.ok ? 'ok' : 'no' }, it.texto));
        caja.appendChild(ul);
        if (cumplidos === r.length) {
          const rp = PB.progreso.marcarReto(this.reto.id, 'programador', this.modo);
          caja.appendChild(el('div', { class: 'resultado-ok' }, '🎉 ¡Tu proyecto cumple todos los requisitos! Descárgalo (⋯ → Descargar .py) y prepárate para presentarlo.'));
          const xpP = PB.ganchos ? PB.ganchos.alSuperar({ reto: this.reto, tipo: 'proyecto', nuevo: rp.nuevo, fallos: this.fallos || 0 }) : 0;
          this._celebrar({ proyecto: true, xp: xpP });
          if (this.o.alSuperar) this.o.alSuperar({ ok: true });
        } else {
          caja.appendChild(el('p', { class: 'nota' }, 'Sigue trabajando: cuando cumplas todos los puntos, tu proyecto quedará entregado.'));
        }
        return;
      }

      caja.appendChild(el('p', { class: 'nota centro' }, 'Revisando…'));
      this.btnComprobar.disabled = true;
      const res = await PB.verificador.verificar(codigo, this.reto, this.nivel, {
        alProgreso: (i, n) => { caja.firstChild.textContent = `Revisando prueba ${i} de ${n}…`; }
      });
      this.btnComprobar.disabled = false;
      vaciar(caja);
      this._pintarResultados(caja, res, codigo);
      if (!res.ok) this.fallos = (this.fallos || 0) + 1;
      if (res.ok) {
        const nivel = this.nivel || 'programador';
        const r = PB.progreso.marcarReto(this.reto.id, nivel, this.modo);
        const insignias = PB.progreso.revisarInsignias();
        const xp = PB.ganchos ? PB.ganchos.alSuperar({ reto: this.reto, tipo: this.o.tipo, nivel, nuevo: r.nuevo, fallos: this.fallos || 0 }) : 0;
        this._celebrar({ nivel: this.nivel, nuevo: r.nuevo, insignias, xp });
        if (this.o.alSuperar) this.o.alSuperar({ ok: true, nivel, nuevo: r.nuevo });
      }
    }

    _pintarResultados(caja, res, codigo) {
      if (res.vacio) { caja.appendChild(el('p', { class: 'resultado-no' }, 'Tu programa está vacío.')); return; }
      if (res.sintaxis) {
        caja.appendChild(el('div', { class: 'resultado-no' }, el('strong', {}, '⚠ ' + res.sintaxis.titulo), el('p', {}, res.sintaxis.texto)));
        this._marcarLinea(res.sintaxis.linea, 'error');
        return;
      }
      const okTotal = res.ok;
      caja.appendChild(el('div', { class: okTotal ? 'resultado-ok' : 'resultado-no' },
        okTotal ? '🎉 ¡Reto superado! Tu programa pasó todas las pruebas.' : 'Todavía no: revisa lo que está en rojo.'));
      if (res.huecos) caja.appendChild(el('div', { class: 'res-item no' }, `✗ Quedan ${res.huecos} hueco(s) «___» sin completar.`));
      for (const rq of res.restricciones) {
        caja.appendChild(el('div', { class: 'res-item ' + (rq.ok ? 'ok' : 'no') }, (rq.ok ? '✓ ' : '✗ ') + 'Debe ' + rq.texto));
      }
      this._pintarRequisitos(res.restricciones);
      res.pruebas.forEach((p, idx) => {
        const det = el('details', { class: 'res-prueba ' + (p.ok ? 'ok' : 'no'), open: !p.ok && res.pruebas.findIndex(x => !x.ok) === idx ? true : null },
          el('summary', {}, (p.ok ? '✓ ' : '✗ ') + p.nombre + ' — ' + p.entradas),
          p.detalle ? el('p', { class: 'res-detalle' }, p.error ? '⚠ ' + p.error.titulo + ': ' + p.detalle : p.detalle) : null,
          el('div', { class: 'res-salida-titulo' }, 'Lo que mostró tu programa:'),
          PB.bloqueCodigo(p.salida || '(nada)', { clase: 'salida' }));
        caja.appendChild(det);
        if (!p.ok && p.error && p.error.linea && idx === res.pruebas.findIndex(x => !x.ok)) this._marcarLinea(p.error.linea, 'error');
      });
    }

    _celebrar({ nivel, nuevo, insignias = [], proyecto, xp = 0 }) {
      if (PB.juego) { PB.juego.sonido('fin'); PB.juego.confeti(); }
      const estrellas = proyecto ? 3 : (PB.progreso.ESTRELLAS[nivel] || 0);
      const cuerpo = el('div', { class: 'celebracion' },
        estrellas
          ? el('div', { class: 'estrellas-grandes' }, ...[1, 2, 3].map(i => el('span', { class: i <= estrellas ? 'llena' : '' }, '★')))
          : el('div', { class: 'estrellas-grandes' }, el('span', { class: 'llena' }, '🎉')),
        el('p', {}, proyecto ? '¡Proyecto entregado!' : (this.o.tipo === 'reto' ? '¡Reto superado!' : this.o.tipo === 'extra' ? '¡Reto extra superado!' : `¡Reto superado en nivel ${NOMBRE_NIVEL[nivel] || 'Programador'}!`)),
        nivel && nivel !== 'maestro' && this.reto.niveles && this.reto.niveles.maestro ? el('p', { class: 'nota' }, nivel === 'explorador' ? '¿Te animas con el nivel Programador?' : '¿Te animas con el nivel Maestro?') : null,
        xp ? el('div', { class: 'celebracion-xp' }, `+${xp} XP`) : null);
      for (const u of insignias) {
        cuerpo.appendChild(el('div', { class: 'insignia-nueva' }, PB.vistas.insigniaSVG(u, true), el('div', {}, el('strong', {}, '¡Nueva insignia!'), el('div', {}, u.insignia))));
      }
      const botones = [{ texto: 'Seguir aquí', valor: 'quedarse' }];
      if (this.o.alSiguiente) botones.push({ texto: 'Siguiente →', tipo: 'primario', valor: 'siguiente' });
      else botones[0].tipo = 'primario';
      PB.ui.modal({ titulo: '¡Muy bien!', contenido: cuerpo, botones, clase: 'modal-celebracion' }).then(v => {
        if (v === 'siguiente' && this.o.alSiguiente) this.o.alSiguiente();
      });
    }

    /* ---------------- Menú ⋯ ---------------- */
    _menu(ev) {
      const opciones = [
        ['↺ Empezar de nuevo', () => this.reiniciar()],
        ['⬇ Descargar .py', () => this.descargar()],
        ['📋 Copiar el código', () => PB.archivos.copiar(this.codigoActual(), 'Tu código')]
      ];
      if (this.modo <= 2) {
        opciones.push(['🔍 Acercar bloques', () => this.ws && this.ws.zoomCenter(1)]);
        opciones.push(['🔎 Alejar bloques', () => this.ws && this.ws.zoomCenter(-1)]);
        opciones.push(['🧹 Ordenar bloques', () => this.ws && this.ws.cleanUp()]);
      }
      if (PB.estado.docente && this._solucion()) opciones.push(['🔑 Ver solución (docente)', () => this.verSolucion()]);
      PB.vistas.menuEmergente(ev.currentTarget, opciones.filter(o => o[1]));
    }

    _solucion() {
      const n = this.reto.niveles && this.nivel && this.reto.niveles[this.nivel];
      return (n && n.solucion) || this.reto.solucion || null;
    }

    verSolucion() {
      const sol = this._solucion();
      PB.ui.modal({
        titulo: 'Solución de referencia', ancho: '760px',
        contenido: (c) => {
          c.appendChild(el('p', { class: 'nota' }, 'Hay muchas soluciones correctas: esta es solo una.'));
          c.appendChild(PB.bloqueCodigo(sol, { numeros: true }));
        },
        botones: [{ texto: 'Cerrar', valor: null }, {
          texto: 'Cargar en el taller', tipo: 'primario', accion: () => {
            if (this.modo <= 2) { try { PB.conv.cargar(this.ws, sol); this._regenerar(true); PB.blockly.encuadrar(this.ws); } catch (e) { /* nada */ } }
            else { this.editor.valor = sol; PB.progreso.guardarBorrador('t:' + this.claveBase, sol); }
          }
        }]
      });
    }

    async reiniciar() {
      if (!(await PB.ui.confirmar('Se borrará lo que hiciste en este reto y volverá el código inicial. ¿Continuar?', 'Empezar de nuevo', 'Sí, empezar de nuevo', 'Cancelar', true))) return;
      this._limpiarMarcas();
      if (this.modo <= 2) {
        PB.progreso.guardarBorrador('b:' + this.claveBase, null);
        try { PB.conv.cargar(this.ws, this.codigoInicial()); } catch (e) { this.ws.clear(); }
        this._regenerar(true);
        PB.blockly.encuadrar(this.ws, PB.estado.escalaBloques || 0.85);
      } else {
        PB.progreso.guardarBorrador('t:' + this.claveBase, null);
        this.editor.valor = this._inicialComoTexto();
      }
      this.consola.limpiar();
    }

    descargar() {
      const codigo = this.codigoActual();
      const a = PB.progreso.alumno();
      const cabecera = `# ${this.o.titulo || this.reto.titulo}\n# Sesión ${this.sesion.numero} · ${PB.config.nombreCurso}\n# ${a.nombre ? 'Autor: ' + a.nombre + ' · ' : ''}${PB.util.fechaCorta(PB.util.hoyISO())}\n\n`;
      const nombre = `sesion-${String(this.sesion.numero).padStart(2, '0')}-${PB.util.slug(this.o.titulo || this.reto.titulo)}.py`;
      PB.archivos.descargar(nombre, cabecera + codigo, 'text/x-python');
    }

    /* ---------------- Tamaño ---------------- */
    _observarTamano() {
      const revisar = () => {
        if (this.destruido) return;
        const ancho = this.raiz.clientWidth;
        const angosto = ancho > 0 && ancho < 820;
        if (angosto !== this.raiz.classList.contains('angosto')) {
          this.raiz.classList.toggle('angosto', angosto);
          this._vista(this.vista || 'trabajo');
        }
        this._redimensionar();
      };
      if (window.ResizeObserver) {
        this.observador = new ResizeObserver(PB.util.debounce(revisar, 60));
        this.observador.observe(this.raiz);
      } else {
        this._alRedimensionar = PB.util.debounce(revisar, 100);
        window.addEventListener('resize', this._alRedimensionar);
      }
      setTimeout(revisar, 0);
    }

    _redimensionar() {
      for (const ws of [this.ws, this.wsPista]) {
        if (ws) { try { Blockly.svgResize(ws); } catch (e) { /* nada */ } }
      }
    }

    destruir() {
      this.destruido = true;
      if (PB.ejecutor.ocupado) PB.ejecutor.detener();
      if (this.observador) this.observador.disconnect();
      if (this._alRedimensionar) window.removeEventListener('resize', this._alRedimensionar);
      this._limpiarTrabajo();
      this.raiz.remove();
    }
  }

  return Taller;
})();
