/* =========================================================================
 * 65-actividades.js — Actividades interactivas (minijuegos).
 * Todas funcionan con toques (sin arrastrar), pensadas para iPad:
 *   ordenar · error · completar · clasificar · relacionar · salida · traza
 *   vf (verdadero o falso contra reloj) · memorama · teclear
 * ========================================================================= */
'use strict';

PB.actividades = (() => {
  const { el, vaciar, normalizar } = PB.util;

  const TIPOS = {
    ordenar: { icono: '🧩', nombre: 'Ordena el código' },
    error: { icono: '🐞', nombre: 'Caza el error' },
    completar: { icono: '✏️', nombre: 'Completa el código' },
    clasificar: { icono: '🗂️', nombre: 'Clasifica' },
    relacionar: { icono: '🔗', nombre: 'Relaciona' },
    salida: { icono: '🔮', nombre: '¿Qué imprime?' },
    traza: { icono: '🕵️', nombre: 'Traza las variables' },
    vf: { icono: '⚡', nombre: 'Verdadero o falso' },
    memorama: { icono: '🧠', nombre: 'Memorama' },
    teclear: { icono: '⌨️', nombre: 'Mecanografía Python' }
  };
  const ERRORES = ['SyntaxError', 'NameError', 'TypeError', 'IndentationError', 'ValueError', 'IndexError', 'ZeroDivisionError'];
  const COLORES_PAR = ['#9966FF', '#FF8C1A', '#0FBD8C', '#E21B3C', '#1368CE', '#D89E00', '#FF6680', '#26890C'];

  const mezclar = (a) => PB.kahoot.mezclar(a);
  const lineaHtml = (t) => PB.py.resaltar(t)[0] || ' ';
  const sinEspacios = (s) => PB.util.quitarComillasTipograficas(String(s)).replace(/\s+/g, '').replace(/'/g, '"');

  function sacudir(nodo) {
    nodo.classList.remove('sacudir');
    void nodo.offsetWidth;
    nodo.classList.add('sacudir');
  }

  function miniConsola(cont) {
    const caja = el('div', { class: 'act-consola', hidden: true });
    cont.appendChild(caja);
    const consola = new PB.Consola(caja);
    return {
      async ejecutar(codigo, entradas) {
        if (PB.ejecutor.ocupado) return null;
        caja.hidden = false;
        consola.limpiar();
        const r = await PB.ejecutor.ejecutar(codigo, entradas
          ? { entradas, alSalida: t => consola.escribir(t) }
          : { alSalida: t => consola.escribir(t), alEntrada: () => consola.pedir() });
        consola.cancelarPedido();
        if (r.error) {
          consola.mostrarError(PB.errores.explicar(r.error, codigo));
          if (PB.ganchos) PB.ganchos.alEjecutar(false, r.error);
        } else if (PB.ganchos) PB.ganchos.alEjecutar(true);
        return r;
      }
    };
  }

  /** Abre una actividad. opciones: { alSiguiente, alVolver, etiquetaSiguiente } */
  function abrir(contenedor, act, opciones = {}) {
    const meta = TIPOS[act.tipo] || { icono: '🎮', nombre: 'Actividad' };
    const raiz = el('div', { class: 'actividad act-' + act.tipo });
    contenedor.appendChild(raiz);
    const hecha = PB.juego.actividadHecha(act.id);
    raiz.appendChild(el('div', { class: 'act-cabeza' },
      opciones.alVolver ? el('button', { class: 'btn-icono volver', onclick: opciones.alVolver, title: 'Volver', 'aria-label': 'Volver' }, '←') : null,
      el('div', { class: 'act-icono' }, meta.icono),
      el('div', {}, el('div', { class: 'act-tipo' }, meta.nombre, hecha ? el('span', { class: 'chip chip-ok' }, '✔ Completada') : null), el('h2', {}, act.titulo)),
      el('div', { class: 'act-xp' }, `+${(act.xp || 60) + 20} XP`)));
    if (act.instrucciones) raiz.appendChild(el('p', { class: 'act-instrucciones', html: act.instrucciones }));
    const cuerpo = el('div', { class: 'act-cuerpo' });
    const mensaje = el('div', { class: 'act-mensaje', 'aria-live': 'polite' });
    raiz.append(cuerpo, mensaje);

    const ctx = {
      intentos: 0,
      terminado: false,
      decir(texto, tipo = 'info') {
        vaciar(mensaje);
        if (!texto) return;
        mensaje.className = 'act-mensaje act-mensaje-' + tipo;
        mensaje.appendChild(texto instanceof Node ? texto : el('span', { html: texto }));
      },
      fallo(texto) {
        ctx.intentos++;
        PB.juego.sonido('incorrecto');
        sacudir(cuerpo);
        ctx.decir(texto || 'Todavía no. ¡Inténtalo otra vez!', 'no');
      },
      exito({ puntaje = 1, extra = null } = {}) {
        if (ctx.terminado) return;
        ctx.terminado = true;
        ctx.intentos++;
        const r = PB.juego.completarActividad(act, { intentos: ctx.intentos, puntaje });
        PB.juego.sonido('correcto');
        PB.juego.confeti(1400, 90);
        const panel = el('div', { class: 'act-exito' },
          el('div', { class: 'act-exito-emoji' }, ctx.intentos <= 1 ? '🌟' : '🎉'),
          el('div', {},
            el('strong', {}, ctx.intentos <= 1 ? '¡Perfecto, a la primera!' : '¡Lo lograste!'),
            r.xp ? el('div', { class: 'act-exito-xp' }, `+${r.xp} XP`) : el('div', { class: 'nota' }, 'Ya habías ganado los XP de esta actividad.'),
            act.explicacion ? el('div', { class: 'nota', html: act.explicacion }) : null),
          extra,
          el('div', { class: 'act-exito-botones' },
            el('button', { class: 'btn btn-suave', onclick: () => { vaciar(contenedor); abrir(contenedor, act, opciones); } }, '↺ Repetir'),
            opciones.alSiguiente ? el('button', { class: 'btn btn-primario', onclick: opciones.alSiguiente }, opciones.etiquetaSiguiente || 'Siguiente ▶') : null));
        vaciar(mensaje);
        raiz.appendChild(panel);
        setTimeout(() => panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
      }
    };
    const fn = JUEGOS[act.tipo];
    if (fn) fn(cuerpo, act, ctx);
    else cuerpo.textContent = 'Tipo de actividad desconocido: ' + act.tipo;
    return raiz;
  }

  const JUEGOS = {
    /* ---------------- Ordenar (Parsons) ---------------- */
    ordenar(c, act, ctx) {
      const conSangria = !!act.sangria;
      const solucion = act.lineas.map(l => ({ texto: l.trim(), nivel: Math.round((l.match(/^ */)[0].length) / 4) }));
      const alternativas = [solucion, ...(act.alternativas || []).map(a => a.map(l => ({ texto: l.trim(), nivel: Math.round((l.match(/^ */)[0].length) / 4) })))];
      let piezas = solucion.map((l, i) => ({ id: 'p' + i, texto: l.texto, nivel: conSangria ? 0 : l.nivel }))
        .concat((act.distractores || []).map((d, i) => ({ id: 'd' + i, texto: d.trim(), nivel: 0 })));
      do { piezas = mezclar(piezas); } while (piezas.length > 1 && piezas.every((p, i) => p.id === 'p' + i));
      let respuesta = [];
      const zonaPiezas = el('div', { class: 'ord-piezas' });
      const zonaResp = el('ol', { class: 'ord-respuesta' });
      const consola = el('div');
      c.append(
        el('div', { class: 'ord-titulo' }, '1. Toca las piezas en el orden correcto'), zonaPiezas,
        el('div', { class: 'ord-titulo' }, '2. Tu programa' + (conSangria ? ' (usa ◀ ▶ para la sangría)' : '')), zonaResp,
        el('div', { class: 'act-botones' },
          el('button', { class: 'btn btn-primario', onclick: comprobar }, '✔ Comprobar'),
          act.ejecutable !== false ? el('button', { class: 'btn btn-suave', onclick: probar }, '▶ Probar mi programa') : null,
          el('button', { class: 'btn btn-suave', onclick: () => { respuesta = []; pintar(); ctx.decir(''); } }, '↺ Reiniciar')),
        consola);
      const mc = miniConsola(consola);
      const codigoActual = () => respuesta.map(p => '    '.repeat(p.nivel) + p.texto).join('\n');
      function probar() { if (respuesta.length) mc.ejecutar(codigoActual(), act.entradas); else ctx.decir('Primero arma tu programa.'); }
      function pintar(marcas) {
        vaciar(zonaPiezas);
        const libres = piezas.filter(p => !respuesta.includes(p));
        if (!libres.length) zonaPiezas.appendChild(el('span', { class: 'nota' }, '¡Usaste todas las piezas!'));
        for (const p of libres) {
          const b = el('button', { class: 'ord-pieza', onclick: () => { respuesta.push(p); PB.juego.sonido('clic'); pintar(); } });
          b.innerHTML = `<code>${lineaHtml(p.texto)}</code>`;
          if (!conSangria && p.nivel) b.style.paddingLeft = (12 + p.nivel * 22) + 'px';
          zonaPiezas.appendChild(b);
        }
        vaciar(zonaResp);
        if (!respuesta.length) zonaResp.appendChild(el('li', { class: 'ord-vacio' }, 'Aquí aparecerá tu programa.'));
        respuesta.forEach((p, k) => {
          const linea = el('code', { class: 'ord-linea-codigo', style: { paddingLeft: (p.nivel * 1.6) + 'em' } });
          linea.innerHTML = lineaHtml(p.texto);
          const marca = marcas ? marcas[k] : '';
          const mover = (d) => { const j = k + d; if (j < 0 || j >= respuesta.length) return; [respuesta[k], respuesta[j]] = [respuesta[j], respuesta[k]]; pintar(); };
          zonaResp.appendChild(el('li', { class: 'ord-linea ' + marca },
            linea,
            el('span', { class: 'ord-controles' },
              conSangria ? el('button', { class: 'mini', title: 'Quitar sangría', onclick: () => { p.nivel = Math.max(0, p.nivel - 1); pintar(); } }, '◀') : null,
              conSangria ? el('button', { class: 'mini', title: 'Agregar sangría', onclick: () => { p.nivel = Math.min(4, p.nivel + 1); pintar(); } }, '▶') : null,
              el('button', { class: 'mini', title: 'Subir', onclick: () => mover(-1) }, '↑'),
              el('button', { class: 'mini', title: 'Bajar', onclick: () => mover(1) }, '↓'),
              el('button', { class: 'mini', title: 'Quitar', onclick: () => { respuesta.splice(k, 1); if (conSangria) p.nivel = 0; pintar(); } }, '✕'))));
        });
      }
      function comprobar() {
        if (ctx.terminado) return;
        const n = solucion.length;
        if (respuesta.length < n) { ctx.fallo(`Faltan piezas: tu programa tiene ${respuesta.length} de ${n} líneas.`); return; }
        let mejor = null, mejorAciertos = -1;
        for (const sol of alternativas) {
          const marcas = respuesta.map((p, k) => (sol[k] && sol[k].texto === p.texto && sol[k].nivel === p.nivel ? 'ok' : 'no'));
          const aciertos = marcas.filter(m => m === 'ok').length;
          if (aciertos === n && respuesta.length === n) { pintar(marcas); ctx.exito(); return; }
          if (aciertos > mejorAciertos) { mejorAciertos = aciertos; mejor = marcas; }
        }
        pintar(mejor);
        const sobra = respuesta.some(p => p.id[0] === 'd');
        ctx.fallo(sobra ? 'Usaste una pieza que no va en el programa (hay piezas trampa).' : `Tienes ${mejorAciertos} de ${n} líneas en su lugar. Las rojas están mal ubicadas${conSangria ? ' o con la sangría incorrecta' : ''}.`);
      }
      pintar();
    },

    /* ---------------- Caza el error ---------------- */
    error(c, act, ctx) {
      const lineas = act.codigo.split('\n');
      const correctas = act.lineas || [act.linea];
      let fase = 'buscar', fallos = 0;
      const lista = el('div', { class: 'err-codigo' });
      const panel = el('div', { class: 'err-panel' });
      const consola = el('div');
      lineas.forEach((t, k) => {
        const n = k + 1;
        const fila = el('button', { class: 'err-linea', onclick: () => elegir(n, fila) }, el('span', { class: 'err-num' }, String(n)));
        const code = el('code');
        code.innerHTML = lineaHtml(t);
        fila.appendChild(code);
        lista.appendChild(fila);
      });
      c.append(lista,
        el('div', { class: 'act-botones' }, act.ejecutable !== false ? el('button', { class: 'btn btn-suave', onclick: () => mc.ejecutar(act.codigo, act.entradas) }, '▶ Ejecutar y ver qué dice Python') : null),
        consola, panel);
      const mc = miniConsola(consola);
      function elegir(n, fila) {
        if (fase !== 'buscar' || ctx.terminado) return;
        if (correctas.includes(n)) {
          fase = 'encontrado';
          fila.classList.add('ok');
          PB.juego.sonido('correcto');
          const caja = el('div', { class: 'err-encontrado' }, el('strong', {}, '🎯 ¡Encontraste el error en la línea ' + n + '!'));
          if (act.explicacion) caja.appendChild(el('p', { html: act.explicacion }));
          if (act.correccion !== undefined) {
            const mal = el('code'); mal.innerHTML = lineaHtml(lineas[n - 1].trim());
            const bien = el('code'); bien.innerHTML = lineaHtml(act.correccion.trim());
            caja.appendChild(el('div', { class: 'err-diff' }, el('div', { class: 'err-mal' }, '✘ ', mal), el('div', { class: 'err-bien' }, '✔ ', bien)));
          }
          vaciar(panel).appendChild(caja);
          if (act.tipoError && act.tipoError !== 'logico') preguntarTipo(caja);
          else ctx.exito({ puntaje: fallos ? 0.7 : 1 });
        } else {
          fallos++;
          fila.classList.add('no');
          setTimeout(() => fila.classList.remove('no'), 700);
          if (fallos >= 3) {
            const fc = lista.children[correctas[0] - 1];
            fc.classList.add('pista');
            ctx.fallo('Esa línea está bien. Mira la línea que parpadea.');
          } else ctx.fallo(fallos === 2 && act.pista ? 'Pista: ' + act.pista : 'Esa línea está bien. Sigue buscando.');
        }
      }
      function preguntarTipo(caja) {
        const otros = mezclar(ERRORES.filter(e => e !== act.tipoError)).slice(0, 3);
        const ops = mezclar([act.tipoError, ...otros]);
        const fila = el('div', { class: 'err-tipos' });
        caja.append(el('p', { class: 'err-tipo-pregunta' }, '¿Qué error mostraría Python?'), fila);
        ops.forEach(op => {
          const b = el('button', { class: 'btn btn-suave', onclick: () => {
            if (ctx.terminado) return;
            if (op === act.tipoError) { b.classList.add('ok'); ctx.exito({ puntaje: fallos ? 0.7 : 1 }); }
            else { b.classList.add('no'); fallos++; ctx.fallo(`No es ${op}. Piensa: ¿falta algo al escribir (sintaxis), un nombre que no existe, o tipos que no se pueden mezclar?`); }
          } }, el('code', {}, op));
          fila.appendChild(b);
        });
      }
    },

    /* ---------------- Completar ---------------- */
    completar(c, act, ctx) {
      const partes = act.codigo.split(/⟦([^⟧]*)⟧/);
      const huecos = [];
      const pre = el('pre', { class: 'comp-codigo' });
      partes.forEach((p, k) => {
        if (k % 2 === 0) {
          const s = el('span');
          s.innerHTML = PB.py.resaltar(p).join('\n');
          pre.appendChild(s);
        } else {
          const alternativas = p.split('|');
          const inp = el('input', {
            class: 'comp-hueco', type: 'text', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off',
            size: String(Math.max(3, Math.max(...alternativas.map(a => a.length)) + 1)), 'aria-label': 'Hueco ' + (huecos.length + 1)
          });
          inp.addEventListener('input', () => { inp.value = PB.util.quitarComillasTipograficas(inp.value); inp.classList.remove('ok', 'no'); });
          inp.addEventListener('focus', () => { ultimo = inp; });
          huecos.push({ inp, alternativas });
          pre.appendChild(inp);
        }
      });
      let ultimo = null;
      c.appendChild(pre);
      if (act.opciones) {
        const banco = el('div', { class: 'comp-banco' }, el('span', { class: 'nota' }, 'Toca una pieza para ponerla en el hueco seleccionado:'));
        for (const op of mezclar(act.opciones)) {
          const b = el('button', { class: 'comp-ficha', onclick: () => {
            const destino = (ultimo && !ultimo.classList.contains('ok')) ? ultimo : huecos.map(h => h.inp).find(i => !i.value) || huecos[0].inp;
            destino.value = op; destino.classList.remove('ok', 'no');
            const sig = huecos.map(h => h.inp).find(i => !i.value);
            ultimo = sig || destino;
            if (sig) sig.focus({ preventScroll: true });
            PB.juego.sonido('clic');
          } }, el('code', {}, op));
          banco.appendChild(b);
        }
        c.appendChild(banco);
      }
      const consola = el('div');
      c.append(el('div', { class: 'act-botones' }, el('button', { class: 'btn btn-primario', onclick: comprobar }, '✔ Comprobar')), consola);
      const mc = miniConsola(consola);
      function comprobar() {
        if (ctx.terminado) return;
        let bien = 0;
        for (const h of huecos) {
          const ok = h.alternativas.some(a => sinEspacios(a) === sinEspacios(h.inp.value));
          h.inp.classList.toggle('ok', ok);
          h.inp.classList.toggle('no', !ok);
          if (ok) bien++;
        }
        if (bien === huecos.length) {
          ctx.exito({ puntaje: ctx.intentos ? 0.8 : 1 });
          if (act.ejecutable !== false) {
            let codigo = '';
            partes.forEach((p, k) => { codigo += k % 2 === 0 ? p : huecos[(k - 1) / 2].inp.value; });
            mc.ejecutar(codigo, act.entradas || []);
          }
        } else ctx.fallo(`Tienes ${bien} de ${huecos.length} huecos correctos. Los rojos todavía no.`);
      }
    },

    /* ---------------- Clasificar ---------------- */
    clasificar(c, act, ctx) {
      const items = mezclar(act.elementos.map((e, i) => Object.assign({ id: i, en: null }, e)));
      let seleccionado = null;
      const bandeja = el('div', { class: 'cla-bandeja' });
      const cajas = el('div', { class: 'cla-cajas' });
      const cajasPorId = {};
      for (const cat of act.categorias) {
        const lista = el('div', { class: 'cla-lista' });
        const caja = el('button', { class: 'cla-caja', style: { '--c': cat.color || '#4C97FF' }, onclick: () => colocar(cat.id) },
          el('div', { class: 'cla-caja-titulo' }, cat.icono ? cat.icono + ' ' : '', cat.nombre), lista);
        cajasPorId[cat.id] = lista;
        cajas.appendChild(caja);
      }
      c.append(el('div', { class: 'ord-titulo' }, 'Toca un elemento y después la caja donde va'), bandeja, cajas,
        el('div', { class: 'act-botones' }, el('button', { class: 'btn btn-primario', onclick: comprobar }, '✔ Comprobar')));
      function ficha(it) {
        const b = el('span', { class: 'cla-ficha' + (seleccionado === it ? ' sel' : '') + (it.estado ? ' ' + it.estado : ''), role: 'button', tabindex: '0' });
        if (it.codigo !== false) b.appendChild(el('code', {}, it.texto)); else b.textContent = it.texto;
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (it.estado === 'ok' || ctx.terminado) return;
          if (it.en !== null) { it.en = null; seleccionado = it; }
          else seleccionado = seleccionado === it ? null : it;
          PB.juego.sonido('clic');
          pintar();
        });
        return b;
      }
      function colocar(cat) {
        if (!seleccionado) { ctx.decir('Primero toca un elemento de arriba.'); return; }
        seleccionado.en = cat;
        seleccionado.estado = '';
        seleccionado = items.find(i => i.en === null) || null;
        PB.juego.sonido('clic');
        pintar();
      }
      function pintar() {
        vaciar(bandeja);
        const libres = items.filter(i => i.en === null);
        if (!libres.length) bandeja.appendChild(el('span', { class: 'nota' }, 'Todos colocados. ¡Comprueba!'));
        libres.forEach(i => bandeja.appendChild(ficha(i)));
        for (const id of Object.keys(cajasPorId)) {
          vaciar(cajasPorId[id]);
          items.filter(i => i.en === id).forEach(i => cajasPorId[id].appendChild(ficha(i)));
        }
      }
      function comprobar() {
        if (ctx.terminado) return;
        if (items.some(i => i.en === null)) { ctx.decir('Coloca todos los elementos antes de comprobar.'); return; }
        let mal = 0;
        for (const i of items) {
          if (i.en === i.cat) i.estado = 'ok';
          else { i.estado = 'no'; mal++; }
        }
        pintar();
        if (!mal) { ctx.exito({ puntaje: ctx.intentos ? 0.8 : 1 }); return; }
        ctx.fallo(`${mal} elemento(s) en la caja equivocada. Regresaron arriba.`);
        setTimeout(() => { for (const i of items) if (i.estado === 'no') { i.en = null; i.estado = ''; } pintar(); }, 900);
      }
      pintar();
    },

    /* ---------------- Relacionar ---------------- */
    relacionar(c, act, ctx) {
      const izq = act.pares.map((p, i) => ({ id: i, texto: p[0] }));
      const der = mezclar(act.pares.map((p, i) => ({ id: i, texto: p[1] })));
      const parejas = new Map();      // idIzq → objeto der
      const bloqueadas = new Set();
      let selIzq = null;
      const colIzq = el('div', { class: 'rel-col' }), colDer = el('div', { class: 'rel-col' });
      c.append(el('div', { class: 'ord-titulo' }, 'Toca un elemento de la izquierda y después su pareja de la derecha'),
        el('div', { class: 'rel-columnas' }, colIzq, colDer),
        el('div', { class: 'act-botones' }, el('button', { class: 'btn btn-primario', onclick: comprobar }, '✔ Comprobar')));
      const contenido = (t, esCodigo) => (esCodigo ? el('code', {}, t) : el('span', { html: t }));
      const indicePar = (idIzq) => [...parejas.keys()].indexOf(idIzq);
      function pintar() {
        vaciar(colIzq); vaciar(colDer);
        for (const it of izq) {
          const par = parejas.has(it.id);
          const color = par ? COLORES_PAR[indicePar(it.id) % COLORES_PAR.length] : null;
          colIzq.appendChild(el('button', {
            class: 'rel-item' + (selIzq === it.id ? ' sel' : '') + (bloqueadas.has(it.id) ? ' ok' : ''), style: color ? { '--c': color, borderColor: color } : null,
            onclick: () => { if (bloqueadas.has(it.id)) return; if (par) parejas.delete(it.id); selIzq = it.id; PB.juego.sonido('clic'); pintar(); }
          }, contenido(it.texto, act.codigoIzq !== false)));
        }
        for (const it of der) {
          const duenio = [...parejas.entries()].find(([, d]) => d === it);
          const color = duenio ? COLORES_PAR[indicePar(duenio[0]) % COLORES_PAR.length] : null;
          colDer.appendChild(el('button', {
            class: 'rel-item' + (duenio && bloqueadas.has(duenio[0]) ? ' ok' : ''), style: color ? { '--c': color, borderColor: color } : null,
            onclick: () => {
              if (duenio && bloqueadas.has(duenio[0])) return;
              if (selIzq === null) { ctx.decir('Primero toca un elemento de la izquierda.'); return; }
              if (duenio) parejas.delete(duenio[0]);
              parejas.set(selIzq, it);
              selIzq = izq.find(x => !parejas.has(x.id)) ? izq.find(x => !parejas.has(x.id)).id : null;
              PB.juego.sonido('clic');
              pintar();
            }
          }, contenido(it.texto, act.codigoDer !== false)));
        }
      }
      function comprobar() {
        if (ctx.terminado) return;
        if (parejas.size < izq.length) { ctx.decir('Forma todas las parejas antes de comprobar.'); return; }
        let mal = 0;
        for (const [idIzq, d] of [...parejas.entries()]) {
          if (d.id === idIzq) bloqueadas.add(idIzq);
          else { parejas.delete(idIzq); mal++; }
        }
        selIzq = izq.find(x => !parejas.has(x.id)) ? izq.find(x => !parejas.has(x.id)).id : null;
        pintar();
        if (!mal) ctx.exito({ puntaje: ctx.intentos ? 0.8 : 1 });
        else ctx.fallo(`${mal} pareja(s) incorrecta(s). Se deshicieron: vuelve a intentarlo.`);
      }
      selIzq = 0;
      pintar();
    },

    /* ---------------- ¿Qué imprime? ---------------- */
    salida(c, act, ctx) {
      c.appendChild(PB.bloqueCodigo(act.codigo, { numeros: act.codigo.split('\n').length > 1 }));
      if (act.entradas && act.entradas.length) c.appendChild(el('p', { class: 'nota' }, '⌨ Cuando el programa pide datos, se escribe: ', ...act.entradas.map(e => el('code', { class: 'chip chip-codigo' }, e))));
      const consola = el('div');
      let mostrado = false;
      const mostrarReal = () => {
        if (mostrado) return;
        mostrado = true;
        c.appendChild(el('div', { class: 'ord-titulo' }, 'Lo que imprime en realidad:'));
        c.appendChild(PB.bloqueCodigo(act.respuesta, { clase: 'salida' }));
      };
      if (act.opciones) {
        const formas = PB.kahoot.FORMAS;
        const grid = el('div', { class: 'sal-opciones' });
        act.opciones.forEach((op, i) => {
          const b = el('button', { class: 'sal-opcion', style: { background: formas[i % 4].color }, onclick: () => {
            if (ctx.terminado) return;
            if (i === act.correcta) { b.classList.add('ok'); mostrarReal(); ctx.exito({ puntaje: ctx.intentos ? 0.6 : 1 }); }
            else { b.classList.add('no'); b.disabled = true; ctx.fallo('No es esa. Recorre el programa línea por línea.'); }
          } }, PB.kahoot.svgForma(formas[i % 4].forma, 22));
          const pre = el('pre'); pre.textContent = op;
          b.appendChild(pre);
          grid.appendChild(b);
        });
        c.appendChild(grid);
      } else {
        const ta = el('textarea', { class: 'campo campo-codigo sal-texto', rows: String(Math.max(2, act.respuesta.split('\n').length + 1)), placeholder: 'Escribe aquí lo que crees que aparecerá en la pantalla…', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
        c.append(ta, el('div', { class: 'act-botones' },
          el('button', { class: 'btn btn-primario', onclick: () => {
            if (ctx.terminado) return;
            if (!ta.value.trim()) { ctx.decir('Escribe tu predicción primero.'); return; }
            if (normalizar(ta.value) === normalizar(act.respuesta)) { mostrarReal(); ctx.exito({ puntaje: ctx.intentos ? 0.7 : 1 }); }
            else if (ctx.intentos >= 1) { mostrarReal(); ctx.fallo('Compara tu predicción con la salida real. ¿Dónde estuvo la diferencia? Corrige y vuelve a comprobar.'); }
            else ctx.fallo('Todavía no coincide. Revisa con calma cada print (y los espacios entre las piezas).');
          } }, '✔ Comprobar'),
          el('button', { class: 'btn btn-suave', onclick: () => mc.ejecutar(act.codigo, act.entradas || []) }, '▶ Ejecutar')), consola);
      }
      const mc = miniConsola(consola);
    },

    /* ---------------- Traza de variables ---------------- */
    traza(c, act, ctx) {
      const lineas = act.codigo.split('\n');
      const codigo = el('div', { class: 'tra-codigo' });
      lineas.forEach((t, k) => {
        const code = el('code'); code.innerHTML = lineaHtml(t);
        codigo.appendChild(el('div', { class: 'tra-linea', 'data-n': String(k + 1) }, el('span', { class: 'err-num' }, String(k + 1)), code));
      });
      const tabla = el('table', { class: 'tra-tabla' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Después de la línea'), ...act.variables.map(v => el('th', {}, el('code', {}, v))))));
      const tb = el('tbody');
      const celdas = [];
      for (const f of act.filas) {
        const tr = el('tr', {}, el('td', { class: 'tra-n' }, String(f.linea)));
        for (const v of act.variables) {
          const esperado = f.valores[v];
          if (esperado === '' || esperado === undefined || esperado === null) { tr.appendChild(el('td', { class: 'tra-nada' }, '—')); continue; }
          const inp = el('input', { class: 'tra-input', type: 'text', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off', 'aria-label': `${v} después de la línea ${f.linea}` });
          inp.addEventListener('focus', () => marcar(f.linea));
          inp.addEventListener('input', () => inp.classList.remove('ok', 'no'));
          celdas.push({ inp, esperado: String(esperado) });
          tr.appendChild(el('td', {}, inp));
        }
        tb.appendChild(tr);
      }
      tabla.appendChild(tb);
      c.append(el('div', { class: 'tra-layout' }, codigo, el('div', { class: 'tabla-scroll' }, tabla)),
        el('p', { class: 'nota' }, '«—» significa que la variable todavía no existe. Para textos puedes escribir con o sin comillas.'),
        el('div', { class: 'act-botones' }, el('button', { class: 'btn btn-primario', onclick: comprobar }, '✔ Comprobar')));
      function marcar(n) { for (const d of codigo.children) d.classList.toggle('actual', d.dataset.n === String(n)); }
      const limpio = (s) => sinEspacios(s).replace(/"/g, '').toLowerCase();
      function comprobar() {
        if (ctx.terminado) return;
        let bien = 0;
        for (const cel of celdas) {
          const ok = limpio(cel.inp.value) === limpio(cel.esperado);
          cel.inp.classList.toggle('ok', ok);
          cel.inp.classList.toggle('no', !ok);
          if (ok) bien++;
        }
        if (bien === celdas.length) ctx.exito({ puntaje: ctx.intentos ? 0.8 : 1 });
        else ctx.fallo(`${bien} de ${celdas.length} valores correctos. Recuerda: cada línea usa los valores que quedaron en la línea anterior.`);
      }
    },

    /* ---------------- Verdadero o falso contra reloj ---------------- */
    vf(c, act, ctx) {
      const tiempo = act.tiempo || 12;
      const items = act.afirmaciones;
      let i = 0, aciertos = 0, timer = null;
      const fallados = [];
      PB.app.alSalir(() => clearInterval(timer));
      const zona = el('div', { class: 'vf-zona' });
      c.appendChild(zona);
      inicio();
      function inicio() {
        vaciar(zona);
        zona.appendChild(el('div', { class: 'vf-inicio' },
          el('p', {}, `${items.length} afirmaciones · ${tiempo} segundos cada una`),
          el('button', { class: 'btn btn-primario btn-grande', onclick: () => { i = 0; aciertos = 0; fallados.length = 0; mostrar(); } }, '⚡ ¡Empezar!')));
      }
      function mostrar() {
        vaciar(zona);
        const it = items[i];
        const barra = el('div', { class: 'kh-barra-tiempo-relleno' });
        const tarjeta = el('div', { class: 'vf-tarjeta' }, el('div', { class: 'vf-contador' }, `${i + 1} / ${items.length} · ✔ ${aciertos}`), el('div', { class: 'vf-texto', html: it.texto }), it.codigo ? PB.bloqueCodigo(it.codigo) : null);
        const responder = (v) => {
          clearInterval(timer);
          const ok = v === it.correcta;
          if (ok) { aciertos++; PB.juego.sonido('correcto'); } else { PB.juego.sonido('incorrecto'); fallados.push(it); }
          tarjeta.classList.add(ok ? 'ok' : 'no');
          tarjeta.appendChild(el('div', { class: 'vf-veredicto' }, v === null ? '⏰ ¡Tiempo!' : ok ? '✔ ¡Bien!' : '✘ No'));
          bv.disabled = bf.disabled = true;
          setTimeout(() => { i++; if (i < items.length) mostrar(); else fin(); }, ok ? 700 : 1300);
        };
        const bv = el('button', { class: 'vf-btn vf-v', onclick: () => responder(true) }, '✔ Verdadero');
        const bf = el('button', { class: 'vf-btn vf-f', onclick: () => responder(false) }, '✘ Falso');
        zona.append(el('div', { class: 'kh-barra-tiempo vf-barra' }, barra), tarjeta, el('div', { class: 'vf-botones' }, bv, bf));
        const t0 = Date.now();
        timer = setInterval(() => {
          const resto = tiempo - (Date.now() - t0) / 1000;
          barra.style.width = Math.max(0, resto / tiempo * 100) + '%';
          if (resto <= 0) responder(null);
        }, 100);
      }
      function fin() {
        vaciar(zona);
        const pct = aciertos / items.length;
        const resumen = el('div', { class: 'vf-fin' }, el('div', { class: 'kh-puntaje' }, `${aciertos}/${items.length}`));
        if (fallados.length) {
          resumen.appendChild(el('div', { class: 'ord-titulo' }, 'Repasa las que fallaste:'));
          for (const f of fallados) resumen.appendChild(el('div', { class: 'vf-repaso' }, el('strong', {}, f.correcta ? 'Verdadero: ' : 'Falso: '), el('span', { html: f.texto }), f.codigo ? PB.bloqueCodigo(f.codigo) : null, f.explicacion ? el('div', { class: 'nota', html: f.explicacion }) : null));
        }
        zona.appendChild(resumen);
        if (pct >= 0.7) ctx.exito({ puntaje: pct });
        else {
          ctx.fallo(`Necesitas al menos ${Math.ceil(items.length * 0.7)} aciertos. ¡Tú puedes!`);
          zona.appendChild(el('div', { class: 'act-botones' }, el('button', { class: 'btn btn-primario', onclick: () => { i = 0; aciertos = 0; fallados.length = 0; mostrar(); } }, '↺ Intentar otra vez')));
        }
      }
    },

    /* ---------------- Memorama ---------------- */
    memorama(c, act, ctx) {
      const cartas = mezclar(act.pares.flatMap((p, i) => [{ par: i, texto: p[0], lado: 0 }, { par: i, texto: p[1], lado: 1 }]));
      let abiertas = [], encontradas = new Set(), movimientos = 0, bloqueo = false;
      const info = el('div', { class: 'mem-info' });
      const grid = el('div', { class: 'mem-grid' });
      c.append(info, grid);
      const nodos = cartas.map((ca, k) => {
        const n = el('button', { class: 'mem-carta', onclick: () => voltear(k), 'aria-label': 'Carta ' + (k + 1) },
          el('div', { class: 'mem-interior' },
            el('div', { class: 'mem-atras' }, '🐍'),
            el('div', { class: 'mem-frente' }, (act.codigo || []).includes(ca.lado) ? el('code', {}, ca.texto) : el('span', { html: ca.texto }))));
        grid.appendChild(n);
        return n;
      });
      const pintarInfo = () => { info.textContent = `Movimientos: ${movimientos} · Parejas: ${encontradas.size} / ${act.pares.length}`; };
      pintarInfo();
      function voltear(k) {
        if (bloqueo || ctx.terminado || abiertas.includes(k) || encontradas.has(cartas[k].par)) return;
        nodos[k].classList.add('abierta');
        PB.juego.sonido('clic');
        abiertas.push(k);
        if (abiertas.length < 2) return;
        movimientos++;
        const [a, b] = abiertas;
        if (cartas[a].par === cartas[b].par) {
          encontradas.add(cartas[a].par);
          nodos[a].classList.add('hecha'); nodos[b].classList.add('hecha');
          abiertas = [];
          PB.juego.sonido('correcto');
          pintarInfo();
          if (encontradas.size === act.pares.length) ctx.exito({ puntaje: movimientos <= act.pares.length * 2 ? 1 : 0.8 });
        } else {
          bloqueo = true;
          setTimeout(() => { nodos[a].classList.remove('abierta'); nodos[b].classList.remove('abierta'); abiertas = []; bloqueo = false; }, 950);
          pintarInfo();
        }
      }
    },

    /* ---------------- Mecanografía Python ---------------- */
    teclear(c, act, ctx) {
      let i = 0, inicio = null, errores = 0;
      const objetivo = el('div', { class: 'tec-objetivo' });
      const inp = el('input', { class: 'campo campo-codigo tec-input', type: 'text', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off', placeholder: 'Escribe aquí la línea de arriba…' });
      const info = el('div', { class: 'tec-info' });
      c.append(info, objetivo, inp, el('p', { class: 'nota' }, 'Escribe la línea exactamente igual, con sus símbolos. Puedes usar la barra de símbolos.'));
      PB.barraSimbolos(c, () => inp);
      const pintar = () => {
        const meta = act.lineas[i];
        const escrito = inp.value;
        vaciar(objetivo);
        for (let k = 0; k < meta.length; k++) {
          const ch = meta[k];
          const cls = k < escrito.length ? (escrito[k] === ch ? 'ok' : 'no') : (k === escrito.length ? 'cursor' : '');
          objetivo.appendChild(el('span', { class: 'tec-ch ' + cls }, ch === ' ' ? ' ' : ch));
        }
        info.textContent = `Línea ${i + 1} de ${act.lineas.length}` + (inicio ? ` · ⏱ ${Math.round((Date.now() - inicio) / 1000)} s` : '');
      };
      inp.addEventListener('input', () => {
        if (ctx.terminado) return;
        if (!inicio) inicio = Date.now();
        const limpio = PB.util.quitarComillasTipograficas(inp.value);
        if (limpio !== inp.value) inp.value = limpio;
        const meta = act.lineas[i];
        if (!meta.startsWith(inp.value)) errores++;
        if (inp.value === meta) {
          PB.juego.sonido('correcto');
          i++;
          inp.value = '';
          if (i >= act.lineas.length) {
            const seg = Math.max(1, Math.round((Date.now() - inicio) / 1000));
            const chars = act.lineas.join('').length;
            info.textContent = `¡Listo! ${seg} s · ${Math.round(chars / seg * 60)} caracteres por minuto`;
            vaciar(objetivo);
            inp.disabled = true;
            ctx.exito({ puntaje: 1 });
            return;
          }
        }
        pintar();
      });
      pintar();
      setTimeout(() => inp.focus({ preventScroll: true }), 100);
    }
  };

  return { abrir, TIPOS };
})();
