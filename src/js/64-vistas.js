/* =========================================================================
 * 64-vistas.js — Pantallas de «Misión Python»: mapa de misiones, misión
 * (Calienta, Aprende, Observa, Juega, Programa, Kahoot, Cierre), desafío del
 * día, gran Kahoot, logros, perfil, glosario, progreso, docente y certificado.
 * ========================================================================= */
'use strict';

(() => {
  const { el, vaciar } = PB.util;
  const V = PB.vistas;
  const ir = (ruta) => PB.app.ir(ruta);
  const NOMBRE_NIVEL = { explorador: 'Explorador', programador: 'Programador', maestro: 'Maestro' };

  function pasosDe(s) {
    const p = [];
    if (s.numero >= 2) p.push({ id: 'calienta', nombre: 'Calienta', icono: '🔥' });
    if (s.teoria && s.teoria.length) p.push({ id: 'aprende', nombre: 'Aprende', icono: '📖' });
    if (s.ejemplo) p.push({ id: 'observa', nombre: s.ejemplo.nombrePaso || 'Observa', icono: '🔍' });
    if (s.actividades && s.actividades.length) p.push({ id: 'juega', nombre: 'Juega', icono: '🎮' });
    if ((s.retos && s.retos.length) || s.mision || s.extra || s.proyecto) p.push({ id: 'programa', nombre: s.proyecto ? 'Proyecto' : 'Programa', icono: s.proyecto ? '🚀' : '💻' });
    if (s.coevaluacion) p.push({ id: 'coevaluacion', nombre: 'Coevaluación', icono: '🤝' });
    if (s.kahoot) p.push({ id: 'kahoot', nombre: 'Kahoot', icono: '⚡' });
    if (s.prueba) p.push({ id: 'prueba', nombre: s.prueba === 'diagnostica' ? 'Prueba diagnóstica' : 'Prueba final', icono: '📝' });
    p.push({ id: 'cierre', nombre: 'Cierre', icono: '🏁' });
    return p;
  }

  const mundoDe = (s) => PB.curso.unidades.find(u => u.numero === s.unidad) || { nombre: '', color: '#888', icono: '•' };
  function progresoMision(s) {
    const p = pasosDe(s);
    const v = p.filter(x => PB.progreso.pasoVisto(s.numero, x.id)).length;
    return { vistos: v, total: p.length, pct: p.length ? v / p.length : 0 };
  }
  function clavesMision(s) {
    const ids = new Set();
    for (const a of s.actividades || []) ids.add('act:' + a.id);
    for (const r of s.retos || []) ids.add('reto:' + r.id);
    if (s.extra) ids.add('extra:' + s.extra.id);
    if (s.proyecto) ids.add('proyecto:' + s.proyecto.id);
    ids.add('teoria:' + s.numero); ids.add('pred:' + s.numero); ids.add('kahoot:m' + s.numero); ids.add('kahoot:calienta:' + s.numero);
    return ids;
  }
  function xpDeMision(s) {
    const j = PB.juego.estado();
    const ids = clavesMision(s);
    let t = 0;
    for (const [k, v] of Object.entries(j.otorgado)) {
      if (ids.has(k) || (s.mision && k.startsWith('mision:' + s.mision.id + ':'))) t += v;
    }
    return t;
  }
  function estrellas(n, total = 3) {
    return el('span', { class: 'estrellas', 'aria-label': `${n} de ${total} estrellas` }, ...Array.from({ length: total }, (_, i) => el('span', { class: i < n ? 'llena' : '' }, '★')));
  }
  function anillo(pct, color, contenido, tam = 76) {
    return el('div', { class: 'anillo', style: { '--p': Math.round(pct * 100), '--c': color, width: tam + 'px', height: tam + 'px' } }, el('div', { class: 'anillo-interior' }, contenido));
  }
  function misionActual() {
    return PB.curso.sesiones.find(s => progresoMision(s).pct < 1) || PB.curso.sesiones[PB.curso.sesiones.length - 1];
  }

  /* ================================================================ *
   * MAPA DE MISIONES (inicio)
   * ================================================================ */
  V.mapa = function (main) {
    const a = PB.progreso.alumno();
    const j = PB.juego.estado();
    const nv = PB.juego.nivelInfo(j.xp);
    const actual = misionActual();
    const hoy = PB.juego.diaLocal();
    const totalLogros = PB.juego.LOGROS.length;

    main.appendChild(el('section', { class: 'mapa-perfil' },
      el('a', { class: 'mapa-avatar', href: '#/perfil', title: 'Cambiar avatar' }, j.avatar),
      el('div', { class: 'mapa-datos' },
        el('h1', {}, a.nombre ? `¡Hola, ${a.nombre}!` : '¡Hola, cadete!'),
        el('div', { class: 'mapa-nivel' }, `${nv.icono} Nivel ${nv.nivel} · ${nv.titulo}`),
        el('div', { class: 'xp-barra' }, el('div', { class: 'xp-barra-relleno', style: { width: (nv.progreso * 100) + '%' } })),
        el('div', { class: 'nota' }, nv.xpSiguiente ? `${j.xp} XP · faltan ${nv.faltan} XP para el nivel ${nv.nivel + 1}` : `${j.xp} XP · ¡nivel máximo!`),
        el('div', { class: 'mapa-chips' },
          el('span', { class: 'chip chip-racha' }, `🔥 ${PB.juego.rachaActiva()} día${PB.juego.rachaActiva() === 1 ? '' : 's'}`),
          el('a', { class: 'chip chip-logros', href: '#/logros' }, `🏅 ${Object.keys(j.logros).length}/${totalLogros} logros`),
          el('span', { class: 'chip' }, `⭐ ${PB.curso.sesiones.reduce((t, s) => t + PB.progreso.estrellasSesion(s), 0)} estrellas`))),
      el('div', { class: 'mapa-acciones' },
        el('a', { class: 'btn btn-primario btn-grande', href: '#/m/' + actual.numero }, `▶ Continuar: Misión ${actual.numero}`),
        el('a', { class: 'btn btn-desafio' + (j.desafios[hoy] !== undefined ? ' hecho' : ''), href: '#/desafio' }, j.desafios[hoy] !== undefined ? '✔ Desafío del día hecho' : '⚡ Desafío del día', j.desafios[hoy] === undefined ? el('span', { class: 'punto-aviso' }) : null))));

    if (!PB.almacen.disponible) main.appendChild(el('div', { class: 'aviso-almacen' }, '⚠ Este navegador no permite guardar tu progreso aquí. Antes de cerrar, ve a «Progreso» y exporta tu avance.'));

    const camino = el('section', { class: 'mapa-camino' });
    const desplazamientos = [0, 70, 110, 70, 0, -70, -110, -70];
    let k = 0;
    for (const u of PB.curso.unidades) {
      const sesiones = PB.curso.sesiones.filter(s => s.unidad === u.numero);
      if (!sesiones.length) continue;
      camino.appendChild(el('div', { class: 'mundo-banner', style: { '--c': u.color } },
        el('span', { class: 'mundo-icono' }, u.icono),
        el('div', {}, el('div', { class: 'mundo-num' }, u.numero ? `Mundo ${u.numero}` : 'Inicio'), el('div', { class: 'mundo-nombre' }, u.nombre)),
        u.insignia ? el('span', { class: 'mundo-insignia' + (PB.progreso.tieneInsignia(u.numero) ? ' ganada' : ''), title: u.insignia }, PB.progreso.tieneInsignia(u.numero) ? '🏅' : '🔒', ' ', u.insignia) : null));
      for (const s of sesiones) {
        const pr = progresoMision(s);
        const completa = pr.pct >= 1;
        const esActual = s === actual;
        const nodo = el('a', { class: 'nodo' + (completa ? ' completo' : '') + (esActual ? ' actual' : '') + (pr.vistos ? ' empezado' : ''), href: '#/m/' + s.numero, style: { '--c': u.color, transform: `translateX(${desplazamientos[k % desplazamientos.length]}px)` } },
          anillo(pr.pct, u.color, el('span', { class: 'nodo-icono' }, s.icono || '⭐'), 84),
          completa ? el('span', { class: 'nodo-corona' }, '👑') : null,
          esActual ? el('span', { class: 'nodo-aqui' }, el('span', { class: 'nodo-aqui-avatar' }, j.avatar), '¡Aquí vas!') : null,
          el('div', { class: 'nodo-etq' }, el('small', {}, `Misión ${s.numero}`), el('strong', {}, s.titulo), (s.mision || s.proyecto) ? estrellas(PB.progreso.estrellasSesion(s)) : null));
        camino.appendChild(nodo);
        k++;
      }
    }
    main.appendChild(camino);
    main.appendChild(el('div', { class: 'mapa-pie' },
      el('a', { class: 'btn btn-suave', href: '#/gran-kahoot' }, '🏆 Gran Kahoot (repaso de todo)'),
      el('a', { class: 'btn btn-suave', href: '#/logros' }, '🏅 Mis logros'),
      el('a', { class: 'btn btn-suave', href: '#/glosario' }, '🔤 Glosario')));
    setTimeout(() => { const n = camino.querySelector('.nodo.actual'); if (n && n.getBoundingClientRect().top > window.innerHeight) n.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
  };

  /* ================================================================ *
   * MISIÓN
   * ================================================================ */
  V.mision = function (main, num, paso, sub, sub2) {
    const s = PB.curso.sesiones.find(x => x.numero === num);
    if (!s) { main.appendChild(el('p', {}, 'No existe esa misión.')); return; }
    const pasos = pasosDe(s);
    if (sub !== undefined && ['programa', 'observa'].includes(paso)) {
      PB.almacen.escribir('pb:ultima:' + PB.config.idCurso, { sesion: num, paso });
      abrirTaller(main, s, paso, sub, sub2);
      return;
    }
    if (paso === 'kahoot' && sub === 'equipos') {
      main.classList.add('con-kahoot');
      PB.kahoot.equipos(main, { titulo: `Misión ${s.numero}: ${s.titulo}`, preguntas: preguntasKahoot(s), alSalir: () => ir(`#/m/${num}/kahoot`) });
      return;
    }
    if (!paso || !pasos.find(p => p.id === paso)) paso = pasos[0].id;
    PB.almacen.escribir('pb:ultima:' + PB.config.idCurso, { sesion: num, paso });
    PB.progreso.marcarPaso(num, paso);
    PB.juego.revisarLogros();
    const u = mundoDe(s);
    const pr = progresoMision(s);
    main.appendChild(el('section', { class: 'mision-cabeza', style: { '--c': u.color } },
      el('a', { class: 'btn-icono volver', href: '#/', title: 'Volver al mapa', 'aria-label': 'Volver al mapa' }, '←'),
      el('div', { class: 'mision-icono' }, s.icono || '⭐'),
      el('div', { class: 'mision-titulos' },
        el('div', { class: 'mision-mundo' }, (u.numero ? `Mundo ${u.numero} · ` : '') + u.nombre),
        el('h1', {}, `Misión ${s.numero}: ${s.titulo}`),
        el('div', { class: 'sesion-chips' }, ...(s.python || []).map(c => el('code', { class: 'chip chip-codigo' }, c)))),
      el('div', { class: 'mision-progreso' }, anillo(pr.pct, u.color, el('span', {}, Math.round(pr.pct * 100) + '%'), 58), el('div', { class: 'nota' }, `⭐ ${xpDeMision(s)} XP`))));

    const nav = el('nav', { class: 'pasos', 'aria-label': 'Pasos de la misión' });
    pasos.forEach((p) => {
      nav.appendChild(el('a', {
        class: 'paso' + (p.id === paso ? ' activo' : '') + (PB.progreso.pasoVisto(num, p.id) ? ' visto' : ''),
        href: `#/m/${num}/${p.id}`, 'aria-current': p.id === paso ? 'step' : null
      }, el('span', { class: 'paso-icono' }, p.icono), el('span', { class: 'paso-nombre' }, p.nombre)));
    });
    main.appendChild(nav);
    const cont = el('section', { class: 'sesion-contenido paso-' + paso });
    main.appendChild(cont);
    const indice = pasos.findIndex(p => p.id === paso);
    const siguiente = pasos[indice + 1];
    const irSiguiente = () => { if (siguiente) ir(`#/m/${num}/${siguiente.id}`); };
    const botonSiguiente = () => siguiente
      ? el('div', { class: 'siguiente-paso' }, el('a', { class: 'btn btn-primario', href: `#/m/${num}/${siguiente.id}` }, `Siguiente: ${siguiente.icono} ${siguiente.nombre} →`))
      : null;
    const ctx = { siguiente, irSiguiente, botonSiguiente };
    const R = { calienta: pasoCalienta, aprende: pasoAprende, observa: pasoObserva, juega: pasoJuega, programa: pasoPrograma, coevaluacion: pasoCoevaluacion, kahoot: pasoKahoot, prueba: pasoPrueba, cierre: pasoCierre };
    R[paso](cont, s, ctx, sub);
    if (PB.estado.docente && s.plan && paso === pasos[0].id) pintarPlan(cont, s);
  };

  function preguntasKahoot(s) {
    if (s.kahoot.preguntas) return s.kahoot.preguntas;
    return PB.kahoot.preguntasAleatorias(s.kahoot.aleatorio || 10, { hasta: s.numero - 1 });
  }

  function abrirTaller(main, s, paso, sub, sub2) {
    main.classList.add('con-taller');
    const volver = () => ir(`#/m/${s.numero}/${paso}`);
    let o = null;
    if (paso === 'programa' && sub === 'reto') {
      const i = parseInt(sub2, 10) - 1;
      const r = (s.retos || [])[i];
      if (!r) { volver(); return; }
      const sig = s.retos[i + 1];
      o = { sesion: s, reto: r, tipo: 'reto', etiqueta: `Reto rápido ${i + 1} de ${s.retos.length}`, alVolver: volver,
        alSiguiente: () => ir(sig ? `#/m/${s.numero}/programa/reto/${i + 2}` : `#/m/${s.numero}/programa`) };
    } else if (paso === 'programa' && sub === 'mision') {
      const nivel = ['explorador', 'programador', 'maestro'].includes(sub2) ? sub2 : 'programador';
      o = { sesion: s, reto: s.mision, nivel, tipo: 'mision', alVolver: volver, alSiguiente: () => ir(`#/m/${s.numero}/${pasosDe(s).find(p => p.id === 'kahoot') ? 'kahoot' : 'cierre'}`) };
    } else if (paso === 'programa' && sub === 'extra') {
      o = { sesion: s, reto: s.extra, tipo: 'extra', alVolver: volver, alSiguiente: volver };
    } else if (paso === 'programa' && sub === 'proyecto') {
      const op = (s.proyecto.opciones || []).find(x => x.id === sub2) || s.proyecto.opciones[0];
      o = { sesion: s, reto: s.proyecto, tipo: 'proyecto', claveExtra: op.id, alVolver: volver, titulo: op.titulo, enunciado: op.descripcion, codigoInicial: op.inicio || '' };
    } else if (paso === 'observa') {
      o = { sesion: s, reto: { id: 'ejemplo-' + s.numero, titulo: 'Modifica el ejemplo: ' + s.ejemplo.titulo, enunciado: s.ejemplo.modificar || 'Cambia el programa y ejecútalo para ver qué pasa.' },
        tipo: 'libre', codigoInicial: s.ejemplo.codigo, alVolver: volver, etiqueta: 'Experimenta' };
    }
    if (!o) { volver(); return; }
    o.modoMinimo = 1;
    const taller = new PB.Taller(main, o);
    PB.app.alSalir(() => taller.destruir());
  }

  /* ---------- Calienta: repaso relámpago ---------- */
  function pasoCalienta(c, s, ctx) {
    const preguntas = PB.kahoot.preguntasAleatorias(3, { hasta: s.numero - 1, desde: 1 });
    c.appendChild(el('p', { class: 'intro-paso' }, '🔥 Tres preguntas de misiones anteriores para calentar motores. ¡El cerebro recuerda mejor lo que practica!'));
    if (!preguntas.length) { c.appendChild(ctx.botonSiguiente()); return; }
    PB.kahoot.jugar(c, { titulo: 'Repaso relámpago', subtitulo: 'Calienta motores antes de la misión', preguntas, clave: 'calienta:' + s.numero, xpMax: 30, alTerminar: ctx.irSiguiente });
    c.appendChild(el('div', { class: 'siguiente-paso' }, el('a', { class: 'btn btn-suave', href: `#/m/${s.numero}/${ctx.siguiente.id}` }, 'Saltar el calentamiento →')));
  }

  /* ---------- Aprende: teoría en tarjetas ---------- */
  function pasoAprende(c, s, ctx) {
    if (s.historia) c.appendChild(el('div', { class: 'historia-grande' }, el('span', { class: 'historia-icono' }, s.historiaIcono || '🛸'), el('p', { html: s.historia })));
    if (s.objetivos && s.objetivos.length) c.appendChild(el('div', { class: 'objetivos-chips' }, el('strong', {}, 'Hoy vas a: '), ...s.objetivos.map(o => el('span', { class: 'objetivo-chip', html: o }))));
    PB.teoria.carrusel(c, s.teoria, {
      alTerminar: () => { PB.juego.ganarXP(50, 'Teoría: ' + s.titulo, 'teoria:' + s.numero); },
      alSiguiente: ctx.irSiguiente, etiquetaSiguiente: ctx.siguiente ? `Siguiente: ${ctx.siguiente.icono} ${ctx.siguiente.nombre} →` : 'Listo'
    });
    if (s.glosario && s.glosario.length) {
      c.appendChild(el('details', { class: 'glosario-mini' }, el('summary', {}, `🔤 Palabras nuevas de esta misión (${s.glosario.length})`), tablaGlosario(s.glosario)));
    }
  }

  /* ---------- Observa: ejemplo resuelto ---------- */
  function pasoObserva(c, s, ctx) {
    const e = s.ejemplo;
    c.appendChild(el('h2', {}, '🔍 ' + e.titulo));
    if (e.descripcion) c.appendChild(el('p', { html: e.descripcion }));
    const pasosPrimm = el('ol', { class: 'primm' },
      el('li', { class: 'activo' }, el('b', {}, '1. Predice'), ' qué hará'),
      el('li', {}, el('b', {}, '2. Ejecuta'), ' y compara'),
      el('li', {}, el('b', {}, '3. Investiga'), ' cómo funciona'),
      el('li', {}, el('b', {}, '4. Modifica'), ' el programa'));
    c.appendChild(pasosPrimm);
    const visor = new PB.comp.Visor(c, { codigo: e.codigo, modo: 3, sesion: s });
    if (e.entradasSugeridas) c.insertBefore(el('p', { class: 'nota' }, '⌨ Cuando el programa te pida datos, prueba con: ' + e.entradasSugeridas), visor.raiz);
    const clave = 'prediccion:' + s.numero;
    if (e.prediccion) {
      const ya = PB.progreso.respuesta(clave);
      if (!ya && !PB.estado.docente) visor.bloquear(true, 'Primero predice qué va a pasar');
      const caja = el('div', { class: 'caja-prediccion' }, el('h3', {}, '🤔 Antes de ejecutar: ¿qué crees que pasará? (+30 XP si aciertas)'));
      c.insertBefore(caja, visor.raiz);
      PB.comp.pregunta(caja, e.prediccion, clave, {
        alResponder: (ok) => {
          visor.bloquear(false);
          pasosPrimm.children[1].classList.add('activo');
          if (ok) PB.juego.ganarXP(30, 'Predicción correcta', 'pred:' + s.numero);
        }
      });
      if (ya) pasosPrimm.children[1].classList.add('activo');
    }
    if (e.investigar && e.investigar.length) c.appendChild(el('div', { class: 'investigar' }, el('h3', {}, '🔎 Investiga'), el('ul', {}, ...e.investigar.map(q => el('li', { html: q })))));
    c.appendChild(el('div', { class: 'modificar' },
      el('div', {}, el('h3', {}, '✏️ Modifica'), el('p', { html: e.modificar || 'Abre el ejemplo en el editor, cámbialo y observa qué pasa.' })),
      el('a', { class: 'btn btn-suave', href: `#/m/${s.numero}/observa/taller` }, 'Abrir en el editor')));
    c.appendChild(ctx.botonSiguiente());
  }

  /* ---------- Juega: actividades interactivas ---------- */
  function pasoJuega(c, s, ctx, sub) {
    const acts = s.actividades;
    if (sub) {
      const i = acts.findIndex(a => a.id === sub);
      if (i >= 0) {
        const sig = acts[i + 1];
        PB.actividades.abrir(c, acts[i], {
          alVolver: () => ir(`#/m/${s.numero}/juega`),
          alSiguiente: () => ir(sig ? `#/m/${s.numero}/juega/${sig.id}` : `#/m/${s.numero}/${ctx.siguiente ? ctx.siguiente.id : 'cierre'}`),
          etiquetaSiguiente: sig ? 'Siguiente actividad ▶' : (ctx.siguiente ? `Ir a ${ctx.siguiente.nombre} ▶` : 'Terminar')
        });
        return;
      }
    }
    const hechas = acts.filter(a => PB.juego.actividadHecha(a.id)).length;
    c.appendChild(el('div', { class: 'juega-cabeza' },
      el('h2', {}, '🎮 ¡A jugar!'),
      el('div', { class: 'juega-progreso' }, `${hechas} de ${acts.length} completadas`, el('div', { class: 'xp-barra' }, el('div', { class: 'xp-barra-relleno', style: { width: (hechas / acts.length * 100) + '%' } })))));
    const rejilla = el('div', { class: 'rejilla-actividades' });
    acts.forEach((a, k) => {
      const meta = PB.actividades.TIPOS[a.tipo] || { icono: '🎮', nombre: 'Actividad' };
      const ok = PB.juego.actividadHecha(a.id);
      rejilla.appendChild(el('a', { class: 'tarjeta-actividad act-tipo-' + a.tipo + (ok ? ' hecha' : ''), href: `#/m/${s.numero}/juega/${a.id}`, style: { animationDelay: (k * 0.06) + 's' } },
        el('div', { class: 'ta-icono' }, meta.icono),
        el('div', { class: 'ta-tipo' }, meta.nombre),
        el('div', { class: 'ta-titulo' }, a.titulo),
        el('div', { class: 'ta-pie' }, ok ? el('span', { class: 'ta-ok' }, '✔ Completada') : el('span', { class: 'ta-xp' }, `+${(a.xp || 60) + 20} XP`))));
    });
    c.appendChild(rejilla);
    c.appendChild(ctx.botonSiguiente());
  }

  /* ---------- Programa: retos rápidos, misión y extra (o proyecto) ---------- */
  function pasoPrograma(c, s, ctx) {
    if (s.proyecto) { pasoProyecto(c, s, ctx); return; }
    if (s.retos && s.retos.length) {
      c.appendChild(el('h2', {}, '⚡ Retos rápidos'));
      c.appendChild(el('p', { class: 'intro-paso' }, 'Programas cortos de una sola idea. Escribe en el editor; si quieres, usa los bloques como apoyo.'));
      const lista = el('div', { class: 'lista-micro' });
      s.retos.forEach((r, i) => {
        const ok = PB.progreso.superado(r.id);
        lista.appendChild(el('a', { class: 'tarjeta-micro' + (ok ? ' hecho' : ''), href: `#/m/${s.numero}/programa/reto/${i + 1}` },
          el('span', { class: 'tm-num' }, ok ? '✓' : String(i + 1)),
          el('span', { class: 'tm-cuerpo' }, el('strong', {}, r.titulo), el('span', { class: 'nota', html: r.resumen || '' })),
          el('span', { class: 'tm-ir' }, ok ? 'Repasar' : `+${r.xp || 80} XP →`)));
      });
      c.appendChild(lista);
    }
    if (s.mision) {
      const r = s.mision;
      const est = PB.progreso.estadoReto(r.id);
      c.appendChild(el('h2', { class: 'titulo-mision' }, '🏆 Misión: ' + r.titulo));
      if (r.historia) c.appendChild(el('p', { class: 'historia' }, r.historia));
      if (r.enunciado) c.appendChild(el('div', { class: 'tarea', html: r.enunciado }));
      const niveles = [
        { id: 'explorador', nombre: 'Explorador', n: 1, xp: 100, desc: r.niveles?.explorador?.descripcion || 'Parte del programa ya está escrita: completa lo que falta.' },
        { id: 'programador', nombre: 'Programador', n: 2, xp: 150, desc: r.niveles?.programador?.descripcion || 'Escribe el programa completo.' },
        { id: 'maestro', nombre: 'Maestro', n: 3, xp: 200, desc: r.niveles?.maestro?.enunciado ? 'Todo lo del Programador y además: ' + r.niveles.maestro.enunciado : 'Un requisito adicional.' }
      ].filter(n => r.niveles && r.niveles[n.id]);
      const fila = el('div', { class: 'niveles' });
      for (const n of niveles) {
        const ok = est.niveles && est.niveles[n.id];
        fila.appendChild(el('a', { class: 'tarjeta-nivel nivel-' + n.id + (ok ? ' hecho' : ''), href: `#/m/${s.numero}/programa/mision/${n.id}` },
          el('div', { class: 'tn-cabeza' }, estrellas(n.n), el('strong', {}, n.nombre), ok ? el('span', { class: 'tn-ok' }, '✓') : el('span', { class: 'tn-xp' }, `+${n.xp} XP`)),
          el('p', { html: n.desc }),
          el('span', { class: 'btn btn-chico ' + (n.id === 'programador' ? 'btn-primario' : 'btn-suave') }, ok ? 'Repetir' : 'Aceptar')));
      }
      c.appendChild(fila);
    }
    if (s.extra) {
      const x = s.extra;
      const ok = PB.progreso.superado(x.id);
      c.appendChild(el('a', { class: 'tarjeta-extra' + (ok ? ' hecho' : ''), href: `#/m/${s.numero}/programa/extra` },
        el('div', { class: 'te-icono' }, '⭐'),
        el('div', {}, el('strong', {}, 'Reto extra: ' + x.titulo), el('div', { class: 'nota', html: x.enunciado || '' }), el('span', { class: 'chip' }, ok ? '✔ Superado' : `+${x.xp || 150} XP · opcional`))));
    }
    c.appendChild(ctx.botonSiguiente());
  }

  function pasoProyecto(c, s, ctx) {
    const r = s.proyecto;
    c.appendChild(el('h2', {}, '🚀 ' + r.titulo));
    if (r.historia) c.appendChild(el('p', { class: 'historia' }, r.historia));
    if (r.enunciado) c.appendChild(el('div', { class: 'tarea', html: r.enunciado }));
    const req = PB.verificador.revisarRestricciones('', r.requiere || []).map(x => x.texto);
    if (req.length) c.appendChild(el('div', { class: 'requisitos-caja' }, el('strong', {}, 'Requisitos mínimos:'), el('ul', { class: 'requisitos' }, ...req.map(t => el('li', {}, t)))));
    const ops = el('div', { class: 'opciones-proyecto' });
    for (const op of r.opciones || []) {
      ops.appendChild(el('a', { class: 'tarjeta-proyecto', href: `#/m/${s.numero}/programa/proyecto/${op.id}` },
        el('div', { class: 'tp-icono' }, op.icono || '🚀'), el('strong', {}, op.titulo), el('p', { html: op.resumen || '' }), el('span', { class: 'btn btn-chico btn-primario' }, 'Elegir')));
    }
    c.appendChild(ops);
    const est = PB.progreso.estadoReto(r.id);
    if (est.requisitosCumplidos) c.appendChild(el('p', { class: 'nota' }, `Tu avance: ${est.requisitosCumplidos} de ${est.requisitosTotal} puntos de la lista de cotejo${est.superado ? ' · ¡entregado! (+300 XP)' : ''}.`));
    if (PB.estado.docente && r.rubrica) c.appendChild(pintarRubrica(r.rubrica));
    c.appendChild(ctx.botonSiguiente());
  }

  /* ---------- Kahoot de la misión ---------- */
  function pasoKahoot(c, s, ctx) {
    const preguntas = preguntasKahoot(s);
    PB.kahoot.jugar(c, {
      titulo: s.kahoot.titulo || `Kahoot: ${s.titulo}`,
      subtitulo: s.kahoot.aleatorio ? `${preguntas.length} preguntas al azar de todas las misiones` : 'Demuestra lo que aprendiste en esta misión',
      preguntas, clave: 'm' + s.numero, xpMax: 150, aleatorio: !!s.kahoot.aleatorio,
      alEquipos: () => ir(`#/m/${s.numero}/kahoot/equipos`),
      alTerminar: ctx.irSiguiente
    });
  }

  /* ---------- Coevaluación ---------- */
  function pasoCoevaluacion(c, s, ctx) {
    const co = s.coevaluacion;
    c.appendChild(el('h2', {}, co.titulo || 'Coevaluación'));
    c.appendChild(el('p', { html: co.instrucciones || '' }));
    const rub = co.rubrica || (PB.curso.sesiones.find(x => x.proyecto && x.proyecto.rubrica) || {}).proyecto?.rubrica;
    const form = el('div', { class: 'coeval' });
    const nombre = el('input', { class: 'campo', type: 'text', placeholder: 'Nombre de tu compañera o compañero' });
    const proyecto = el('input', { class: 'campo', type: 'text', placeholder: '¿Qué proyecto presentó?' });
    form.append(el('label', { class: 'campo-etiqueta' }, 'Evalúo a:'), nombre, el('label', { class: 'campo-etiqueta' }, 'Proyecto:'), proyecto);
    const elecciones = {};
    if (rub) {
      for (const cr of rub.criterios) {
        const fila = el('div', { class: 'coeval-criterio' }, el('strong', {}, cr.nombre));
        const ops = el('div', { class: 'coeval-opciones' });
        cr.descriptores.forEach((d, i) => {
          const b = el('button', { type: 'button', class: 'coeval-op', onclick: () => {
            elecciones[cr.nombre] = i + 1;
            for (const x of ops.children) x.classList.remove('elegida');
            b.classList.add('elegida');
          } }, el('b', {}, rub.niveles[i]), el('span', {}, d));
          ops.appendChild(b);
        });
        fila.appendChild(ops);
        form.appendChild(fila);
      }
    }
    const gusto = el('textarea', { class: 'campo', rows: '2', placeholder: 'Lo que más me gustó…' });
    const sugerencia = el('textarea', { class: 'campo', rows: '2', placeholder: 'Una sugerencia para mejorar…' });
    form.append(el('label', { class: 'campo-etiqueta' }, 'Lo que más me gustó'), gusto, el('label', { class: 'campo-etiqueta' }, 'Una sugerencia'), sugerencia);
    form.appendChild(el('button', { class: 'btn btn-primario', onclick: () => {
      if (!nombre.value.trim()) { PB.ui.aviso('Escribe el nombre de quien evalúas.', 'error'); return; }
      if (rub && Object.keys(elecciones).length < rub.criterios.length) { PB.ui.aviso('Elige un nivel en cada criterio.', 'error'); return; }
      PB.progreso.agregarCoevaluacion({ companero: nombre.value.trim(), proyecto: proyecto.value.trim(), criterios: Object.assign({}, elecciones), gusto: gusto.value.trim(), sugerencia: sugerencia.value.trim() });
      PB.juego.ganarXP(40, 'Coevaluación', 'coeval:' + PB.progreso.datos.coevaluaciones.length);
      PB.ui.aviso('Coevaluación guardada. ¡Gracias!', 'exito');
      PB.app.render();
    } }, 'Guardar coevaluación (+40 XP)'));
    c.appendChild(form);
    const hechas = PB.progreso.datos.coevaluaciones;
    if (hechas.length) {
      c.appendChild(el('h3', {}, 'Coevaluaciones que has hecho'));
      c.appendChild(el('ul', {}, ...hechas.map(h => el('li', {}, `${h.companero}${h.proyecto ? ' («' + h.proyecto + '»)' : ''}: ${Object.entries(h.criterios).map(([k, v]) => k + ' ' + v).join(' · ')}`))));
    }
    c.appendChild(ctx.botonSiguiente());
  }

  /* ---------- Prueba diagnóstica / final ---------- */
  function pasoPrueba(c, s, ctx) {
    const tipo = s.prueba;
    const items = PB.curso.prueba.items;
    const hecha = PB.progreso.prueba(tipo);
    c.appendChild(el('h2', {}, tipo === 'diagnostica' ? '📝 Prueba diagnóstica' : '📝 Prueba final'));
    c.appendChild(el('p', { html: tipo === 'diagnostica'
      ? 'Son 10 preguntas de <b>leer código y predecir qué hace</b>. Todavía no sabes Python: es normal no saber muchas respuestas. ¡Responde lo que creas! Al final del curso harás las mismas preguntas para ver cuánto avanzaste.'
      : 'Son las mismas 10 preguntas de la prueba diagnóstica. Lee cada programa con calma y predice qué hace.' }));
    if (hecha && !PB.estado.docente) { mostrarResultadoPrueba(c, tipo, hecha, items); c.appendChild(ctx.botonSiguiente()); return; }
    let i = 0;
    const respuestas = [];
    const zona = el('div', { class: 'prueba-zona' });
    c.appendChild(zona);
    const formas = PB.kahoot.FORMAS;
    const pintar = () => {
      vaciar(zona);
      const it = items[i];
      zona.appendChild(el('div', { class: 'prueba-progreso' }, `Pregunta ${i + 1} de ${items.length}`,
        el('div', { class: 'barra-progreso' }, el('div', { class: 'barra-relleno', style: { width: ((i) / items.length * 100) + '%' } }))));
      const caja = el('div', { class: 'pregunta' });
      caja.appendChild(el('div', { class: 'pregunta-texto', html: it.pregunta }));
      if (it.codigo) caja.appendChild(PB.bloqueCodigo(it.codigo, { numeros: true }));
      const ops = el('div', { class: 'sal-opciones' });
      it.opciones.forEach((op, j) => {
        const b = el('button', { class: 'sal-opcion', style: { background: formas[j % 4].color }, onclick: () => { respuestas[i] = j; i++; if (i < items.length) pintar(); else terminar(); } }, PB.kahoot.svgForma(formas[j % 4].forma, 22));
        const pre = el('pre'); pre.textContent = op;
        b.appendChild(pre);
        ops.appendChild(b);
      });
      caja.appendChild(ops);
      caja.appendChild(el('button', { class: 'btn btn-chico btn-suave', onclick: () => { respuestas[i] = -1; i++; if (i < items.length) pintar(); else terminar(); } }, 'No sé'));
      zona.appendChild(caja);
    };
    const terminar = () => {
      const puntaje = respuestas.filter((r, j) => r === items[j].correcta).length;
      const datos = { respuestas, puntaje, total: items.length };
      if (!PB.progreso.prueba(tipo) || PB.estado.docente) PB.progreso.guardarPrueba(tipo, datos);
      PB.juego.ganarXP(50, 'Prueba ' + tipo, 'prueba:' + tipo);
      vaciar(zona);
      mostrarResultadoPrueba(zona, tipo, datos, items);
    };
    pintar();
    c.appendChild(ctx.botonSiguiente());
  }

  function mostrarResultadoPrueba(c, tipo, datos, items) {
    c.appendChild(el('div', { class: 'resultado-prueba' },
      el('div', { class: 'puntaje-grande' }, `${datos.puntaje}`, el('small', {}, `/${datos.total}`)),
      el('p', {}, tipo === 'diagnostica' ? '¡Gracias! Este es tu punto de partida.' : 'Este es tu resultado final.')));
    if (tipo === 'final') {
      const d = PB.progreso.prueba('diagnostica');
      if (d) {
        const dif = datos.puntaje - d.puntaje;
        c.appendChild(el('div', { class: 'comparacion-pruebas' },
          el('div', {}, el('small', {}, 'Diagnóstica'), el('strong', {}, `${d.puntaje}/${d.total}`)),
          el('div', { class: 'flecha' }, '→'),
          el('div', {}, el('small', {}, 'Final'), el('strong', {}, `${datos.puntaje}/${datos.total}`)),
          el('div', { class: dif > 0 ? 'avance' : '' }, dif > 0 ? `+${dif} 🎉` : dif === 0 ? 'igual' : String(dif))));
      }
    }
    const det = el('details', { class: 'repaso-prueba' }, el('summary', {}, 'Repasar las respuestas'));
    items.forEach((it, j) => {
      const r = datos.respuestas[j];
      det.appendChild(el('div', { class: 'repaso-item ' + (r === it.correcta ? 'ok' : 'no') },
        el('strong', {}, `${j + 1}. `, el('span', { html: it.pregunta })),
        it.codigo ? PB.bloqueCodigo(it.codigo) : null,
        el('p', {}, `Tu respuesta: ${r >= 0 && r !== undefined ? String.fromCharCode(65 + r) : 'No sé'} · Correcta: ${String.fromCharCode(65 + it.correcta)}`),
        it.explicacion ? el('p', { class: 'nota', html: it.explicacion }) : null));
    });
    c.appendChild(det);
  }

  /* ---------- Cierre de la misión ---------- */
  function pasoCierre(c, s) {
    const j = PB.juego.estado();
    const pr = progresoMision(s);
    const u = mundoDe(s);
    c.appendChild(el('div', { class: 'cierre-banner', style: { '--c': u.color } },
      el('div', { class: 'cierre-emoji' }, pr.pct >= 1 ? '🏁' : '🚩'),
      el('div', {}, el('h2', {}, pr.pct >= 1 ? `¡Misión ${s.numero} cumplida!` : `Misión ${s.numero}: casi lista`),
        el('div', { class: 'cierre-stats' },
          el('span', {}, `⭐ ${xpDeMision(s)} XP ganados`),
          el('span', {}, `✅ ${pr.vistos}/${pr.total} pasos`),
          (s.mision || s.proyecto) ? el('span', {}, estrellas(PB.progreso.estrellasSesion(s))) : null,
          s.actividades ? el('span', {}, `🎮 ${s.actividades.filter(a => PB.juego.actividadHecha(a.id)).length}/${s.actividades.length} actividades`) : null))));
    if (pr.pct >= 1) setTimeout(() => PB.juego.confeti(1500, 100), 300);
    if (s.resumen && s.resumen.length) {
      c.appendChild(el('h3', {}, '🧠 Lo que aprendiste'));
      c.appendChild(el('div', { class: 'resumen-tarjetas' }, ...s.resumen.map(r => el('div', { class: 'resumen-tarjeta' },
        el('div', { class: 'resumen-icono' }, r.icono || '✔'), el('div', {}, el('div', { html: r.texto }), r.codigo ? PB.bloqueCodigo(r.codigo) : null)))));
    }
    // Autoevaluación con emojis
    c.appendChild(el('h3', {}, '💬 ¿Cómo te sentiste en esta misión?'));
    const animos = [['😃', 'Lo entendí todo'], ['🙂', 'Casi todo'], ['😐', 'Más o menos'], ['😟', 'Necesito ayuda']];
    const fila = el('div', { class: 'animo-fila' });
    const pintarAnimo = () => {
      vaciar(fila);
      for (const [e, t] of animos) {
        fila.appendChild(el('button', { class: 'animo-btn' + (j.animo[s.numero] === e ? ' elegido' : ''), onclick: () => {
          j.animo[s.numero] = e; PB.progreso.guardar(true); PB.juego.sonido('clic');
          PB.juego.ganarXP(10, 'Autoevaluación', 'animo:' + s.numero);
          pintarAnimo();
        } }, el('span', { class: 'animo-emoji' }, e), el('span', {}, t)));
      }
    };
    pintarAnimo();
    c.appendChild(fila);
    if (s.autoevaluacion && s.autoevaluacion.length) {
      c.appendChild(el('h3', {}, '🪞 Pregúntate'));
      for (const a of s.autoevaluacion) c.appendChild(el('details', { class: 'autoeval' }, el('summary', { html: a.pregunta }), el('div', { class: 'autoeval-resp', html: a.respuesta })));
    }
    // Logros recientes
    const recientes = Object.entries(j.logros).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 4).map(([id]) => PB.juego.LOGROS.find(l => l.id === id)).filter(Boolean);
    if (recientes.length) {
      c.appendChild(el('h3', {}, '🏅 Tus logros más recientes'));
      c.appendChild(el('div', { class: 'logros-mini' }, ...recientes.map(l => el('div', { class: 'logro-mini' }, el('span', {}, l.icono), el('span', {}, l.nombre)))));
    }
    const sigS = PB.curso.sesiones.find(x => x.numero === s.numero + 1);
    c.appendChild(el('div', { class: 'acciones cierre-acciones' },
      el('a', { class: 'btn btn-suave', href: '#/' }, '🗺️ Volver al mapa'),
      s.certificado ? el('a', { class: 'btn btn-primario', href: '#/certificado' }, '🎓 Ver mi certificado') : null,
      sigS ? el('a', { class: 'btn btn-primario', href: '#/m/' + sigS.numero }, `Misión ${sigS.numero}: ${sigS.titulo} →`) : null));
  }

  function pintarPlan(c, s) {
    const p = s.plan;
    const det = el('details', { class: 'plan-clase' }, el('summary', {}, '🔑 Plan de clase (docente)'));
    const momentos = [['activacion', 'Activación', 5], ['ejemplo', 'Ejemplo en vivo', 10], ['practica', 'Práctica (juegos)', 15], ['reto', 'Programación', 20], ['cierre', 'Kahoot y cierre', 10]];
    const ol = el('ol', { class: 'momentos' });
    for (const [k, t, min] of momentos) {
      if (!p[k]) continue;
      ol.appendChild(el('li', {}, el('strong', {}, `${t} (${(p.minutos && p.minutos[k]) || min} min): `), el('span', { html: p[k] })));
    }
    det.appendChild(ol);
    if (p.notas) det.appendChild(el('p', { class: 'nota', html: p.notas }));
    c.appendChild(det);
  }

  function pintarRubrica(rubrica) {
    const t = el('table', { class: 'tabla-rubrica' }, el('thead', {}, el('tr', {}, el('th', {}, 'Criterio'), ...rubrica.niveles.map(n => el('th', {}, n)))));
    const tb = el('tbody');
    for (const cr of rubrica.criterios) tb.appendChild(el('tr', {}, el('td', {}, el('strong', {}, cr.nombre)), ...cr.descriptores.map(d => el('td', {}, d))));
    t.appendChild(tb);
    return el('details', { class: 'rubrica', open: true }, el('summary', {}, '🔑 Rúbrica (docente)'), el('div', { class: 'tabla-scroll' }, t));
  }

  function tablaGlosario(items, conSesion) {
    const t = el('table', { class: 'tabla-glosario' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Python / inglés'), el('th', {}, 'Español'), el('th', {}, '¿Qué es?'), conSesion ? el('th', {}, 'Misión') : null)));
    const tb = el('tbody');
    for (const g of items) tb.appendChild(el('tr', {}, el('td', {}, el('code', {}, g.en)), el('td', {}, g.es), el('td', { html: g.def || '' }), conSesion ? el('td', {}, el('a', { href: '#/m/' + g.sesion }, String(g.sesion))) : null));
    t.appendChild(tb);
    return el('div', { class: 'tabla-scroll' }, t);
  }

  /* ================================================================ *
   * DESAFÍO DEL DÍA y GRAN KAHOOT
   * ================================================================ */
  V.desafio = function (main) {
    const hoy = PB.juego.diaLocal();
    const j = PB.juego.estado();
    let preguntas = PB.kahoot.preguntasAleatorias(5, { soloVistas: true, desde: 1 });
    if (preguntas.length < 5) preguntas = PB.kahoot.preguntasAleatorias(5, { hasta: 3, desde: 1 });
    main.appendChild(el('a', { class: 'btn btn-suave btn-chico', href: '#/' }, '← Mapa'));
    PB.kahoot.jugar(main, {
      titulo: '⚡ Desafío del día',
      subtitulo: j.desafios[hoy] !== undefined ? 'Ya completaste el desafío de hoy: puedes practicar, pero los XP extra se ganan una vez al día.' : '5 preguntas de lo que ya estudiaste. ¡Gana XP extra y cuida tu racha!',
      preguntas, clave: 'desafio:' + hoy, xpMax: 60, alTerminar: () => ir('#/')
    });
  };

  V.granKahoot = function (main, modo) {
    const preguntas = PB.kahoot.preguntasAleatorias(20, { desde: 1 });
    if (modo === 'equipos') {
      main.classList.add('con-kahoot');
      PB.kahoot.equipos(main, { titulo: '🏆 Gran Kahoot', preguntas, alSalir: () => ir('#/gran-kahoot') });
      return;
    }
    main.appendChild(el('a', { class: 'btn btn-suave btn-chico', href: '#/' }, '← Mapa'));
    PB.kahoot.jugar(main, { titulo: '🏆 Gran Kahoot', subtitulo: '20 preguntas al azar de todas las misiones', preguntas, clave: 'gran', xpMax: 200, aleatorio: true, alEquipos: () => ir('#/gran-kahoot/equipos'), alTerminar: () => ir('#/') });
  };

  /* ================================================================ *
   * LOGROS
   * ================================================================ */
  const METAS = {
    'diez-retos': ['retos', 10], 'treinta-retos': ['retos', 30], 'maestro-5': ['maestro', 5], 'milla-extra': ['extras', 3], 'kahoot-10': ['kahoots', 10],
    'racha-5': ['mejorRacha', 5], cazabugs: ['act_error', 5], ordenado: ['act_ordenar', 5], detective: ['act_traza', 3], adivino: ['act_salida', 5],
    'dedos-rapidos': ['act_teclear', 3], jugador: ['actividades', 25], cientifico: ['exploradores', 10], aprendo: ['errores', 10], desafio: ['desafios', 3],
    viajero: ['misionesCompletas', 5]
  };
  V.logros = function (main) {
    const j = PB.juego.estado();
    const nv = PB.juego.nivelInfo(j.xp);
    main.appendChild(el('h1', {}, '🏅 Logros y niveles'));
    main.appendChild(el('div', { class: 'tarjeta nivel-tarjeta' },
      el('div', { class: 'nivel-icono' }, nv.icono),
      el('div', { class: 'nivel-info' },
        el('h2', {}, `Nivel ${nv.nivel}: ${nv.titulo}`),
        el('div', { class: 'xp-barra grande' }, el('div', { class: 'xp-barra-relleno', style: { width: (nv.progreso * 100) + '%' } })),
        el('p', { class: 'nota' }, nv.xpSiguiente ? `${j.xp} XP · faltan ${nv.faltan} XP para «${PB.juego.NIVELES[nv.nivel].titulo}»` : `${j.xp} XP · ¡Eres una leyenda!`))));
    const escalera = el('div', { class: 'escalera-niveles' });
    PB.juego.NIVELES.forEach((n, i) => escalera.appendChild(el('div', { class: 'escalon' + (i + 1 <= nv.nivel ? ' alcanzado' : '') + (i + 1 === nv.nivel ? ' actual' : '') },
      el('span', { class: 'escalon-icono' }, n.icono), el('span', { class: 'escalon-n' }, `Nv ${i + 1}`), el('span', { class: 'escalon-t' }, n.titulo), el('small', {}, `${n.xp} XP`))));
    main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '🪜 Niveles'), el('div', { class: 'tabla-scroll' }, escalera)));
    const hechos = Object.keys(j.logros).length;
    const rejilla = el('div', { class: 'rejilla-logros' });
    for (const l of PB.juego.LOGROS) {
      const ok = !!j.logros[l.id];
      const meta = METAS[l.id];
      const actual = meta ? Math.min(meta[1], j.c[meta[0]] || 0) : null;
      rejilla.appendChild(el('div', { class: 'logro' + (ok ? ' ganado' : '') },
        el('div', { class: 'logro-icono' }, ok ? l.icono : '🔒'),
        el('div', { class: 'logro-nombre' }, l.nombre),
        el('div', { class: 'logro-desc' }, l.desc),
        ok ? el('div', { class: 'logro-fecha' }, '✔ ' + PB.util.fechaCorta(j.logros[l.id])) : meta ? el('div', { class: 'logro-meta' }, el('div', { class: 'xp-barra' }, el('div', { class: 'xp-barra-relleno', style: { width: (actual / meta[1] * 100) + '%' } })), el('small', {}, `${actual}/${meta[1]}`)) : null,
        l.xp ? el('div', { class: 'logro-xp' }, `+${l.xp} XP`) : null));
    }
    main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, `🏆 Logros: ${hechos} de ${PB.juego.LOGROS.length}`), rejilla));
    if (j.historial.length) {
      main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '📜 Últimos XP ganados'),
        el('ul', { class: 'historial-xp' }, ...j.historial.slice(0, 15).map(h => el('li', {}, el('strong', {}, `+${h.xp}`), ' ', h.m, el('small', {}, ' · ' + PB.util.fechaCorta(h.f)))))));
    }
  };

  /* ================================================================ *
   * PERFIL (avatar, nombre, sonido)
   * ================================================================ */
  V.perfil = function (main) {
    const a = PB.progreso.alumno();
    const j = PB.juego.estado();
    const nv = PB.juego.nivelInfo(j.xp);
    main.appendChild(el('h1', {}, '👤 Mi perfil'));
    const nombre = el('input', { class: 'campo', type: 'text', value: a.nombre, placeholder: 'Tu nombre' });
    const grupo = el('input', { class: 'campo', type: 'text', value: a.grupo, placeholder: 'Grupo (por ejemplo 1° A)' });
    main.appendChild(el('div', { class: 'tarjeta perfil-cabeza' },
      el('div', { class: 'perfil-avatar' }, j.avatar),
      el('div', { class: 'fila-campos' },
        el('div', {}, el('label', { class: 'campo-etiqueta' }, 'Nombre'), nombre),
        el('div', {}, el('label', { class: 'campo-etiqueta' }, 'Grupo'), grupo),
        el('button', { class: 'btn btn-primario', onclick: () => { PB.progreso.fijarAlumno(nombre.value, grupo.value); PB.ui.aviso('Datos guardados', 'exito'); PB.app.pintarCabecera(); } }, 'Guardar'))));
    const rejilla = el('div', { class: 'rejilla-avatares' });
    for (const av of PB.juego.avatares()) {
      rejilla.appendChild(el('button', {
        class: 'avatar-op' + (av.libre ? '' : ' bloqueado') + (av.e === j.avatar ? ' elegido' : ''), disabled: !av.libre,
        title: av.libre ? 'Elegir' : `Se desbloquea en el nivel ${av.n}`,
        onclick: () => { PB.juego.fijarAvatar(av.e); PB.juego.sonido('clic'); PB.app.pintarCabecera(); PB.app.render(); }
      }, el('span', { class: 'avatar-emoji' }, av.e), av.libre ? null : el('span', { class: 'avatar-candado' }, `🔒 Nv ${av.n}`)));
    }
    main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '🎭 Elige tu avatar'), el('p', { class: 'nota' }, 'Sube de nivel para desbloquear más avatares.'), rejilla));
    const cal = PB.progreso.calificacion();
    main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '📊 Mis estadísticas'),
      el('div', { class: 'stats-rejilla' },
        stat('⭐', j.xp, 'XP'), stat(nv.icono, nv.nivel, 'nivel'), stat('🏅', Object.keys(j.logros).length, 'logros'),
        stat('💻', cal.misionesHechas + cal.retosHechos, 'retos superados'), stat('🎮', cal.actsHechas, 'actividades'),
        stat('⚡', j.c.kahoots || 0, 'Kahoots jugados'), stat('🔥', (j.racha && j.racha.mejor) || 0, 'mejor racha'), stat('🔬', j.c.exploradores || 0, 'exploradores'))));
    main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '🔊 Sonido'),
      el('button', { class: 'btn btn-suave', onclick: () => { PB.juego.alternarSonido(); PB.app.pintarCabecera(); PB.app.render(); } }, j.sonido ? '🔊 Sonido activado (tocar para silenciar)' : '🔇 Sonido silenciado (tocar para activar)')));
  };
  const stat = (icono, valor, etq) => el('div', { class: 'stat' }, el('div', { class: 'stat-icono' }, icono), el('div', { class: 'stat-valor' }, String(valor)), el('div', { class: 'stat-etq' }, etq));

  /* ================================================================ *
   * GLOSARIO
   * ================================================================ */
  V.glosario = function (main) {
    main.appendChild(el('h1', {}, '🔤 Glosario bilingüe'));
    const buscador = el('input', { class: 'campo', type: 'search', placeholder: 'Buscar (por ejemplo: lista, while, variable)…', autocapitalize: 'off' });
    main.appendChild(buscador);
    const todos = [];
    const vistos = new Set();
    for (const s of PB.curso.sesiones) for (const g of s.glosario || []) {
      const k = g.en.toLowerCase();
      if (vistos.has(k)) continue;
      vistos.add(k);
      todos.push(Object.assign({ sesion: s.numero }, g));
    }
    const zona = el('div');
    main.appendChild(zona);
    const pintar = () => {
      const q = PB.util.normalizar(buscador.value);
      vaciar(zona).appendChild(tablaGlosario(todos.filter(g => !q || PB.util.normalizar(g.en + ' ' + g.es + ' ' + (g.def || '')).includes(q)), true));
    };
    buscador.addEventListener('input', pintar);
    pintar();
  };

  /* ================================================================ *
   * PROGRESO (guardar, entregar, calificación)
   * ================================================================ */
  V.progreso = function (main) {
    const a = PB.progreso.alumno();
    main.appendChild(el('h1', {}, '📈 Mi progreso'));
    main.appendChild(el('div', { class: 'tarjeta' },
      el('h2', {}, '💾 Guarda o lleva tu progreso a otro dispositivo'),
      el('p', { class: 'nota' }, PB.almacen.disponible
        ? 'Tu progreso (incluidos XP, logros y avatar) se guarda en este dispositivo. Si cambias de iPad o el navegador borra los datos, recupéralo con un archivo o un código.'
        : '⚠ Este navegador no permite guardar datos aquí: exporta tu progreso antes de cerrar la página.'),
      el('div', { class: 'acciones' },
        el('button', { class: 'btn btn-suave', onclick: () => PB.archivos.descargar(`progreso-${PB.util.slug(a.nombre)}-${new Date().toISOString().slice(0, 10)}.json`, PB.progreso.exportar(true), 'application/json') }, '⬇ Descargar archivo de progreso'),
        el('button', { class: 'btn btn-suave', onclick: () => PB.archivos.copiar(PB.progreso.codigoProgreso(), 'Código de progreso') }, '📋 Copiar código de progreso'),
        el('button', { class: 'btn btn-suave', onclick: importarArchivo }, '⬆ Cargar archivo'),
        el('button', { class: 'btn btn-suave', onclick: importarCodigo }, '⌨ Pegar código'))));
    main.appendChild(el('div', { class: 'tarjeta' },
      el('h2', {}, '📤 Entregar a tu docente'),
      el('p', { class: 'nota' }, 'Copia tu resumen y pégalo donde te indique tu docente (por ejemplo, en Google Classroom), o entrega el archivo de progreso.'),
      el('div', { class: 'acciones' },
        el('button', { class: 'btn btn-primario', onclick: () => PB.archivos.copiar(PB.progreso.resumenTexto(), 'Resumen') }, '📋 Copiar resumen'),
        el('button', { class: 'btn btn-suave', onclick: () => PB.archivos.descargar(`resumen-${PB.util.slug(a.nombre)}.txt`, PB.progreso.resumenTexto()) }, '⬇ Descargar resumen'),
        el('button', { class: 'btn btn-suave', onclick: () => PB.archivos.mostrarParaCopiar(PB.progreso.resumenTexto(), 'Tu resumen') }, '👁 Ver resumen'))));
    const j = PB.juego.estado();
    const t = el('table', { class: 'tabla-progreso' }, el('thead', {}, el('tr', {}, el('th', {}, 'Misión'), el('th', {}, 'Avance'), el('th', {}, 'Misión principal'), el('th', {}, 'Retos'), el('th', {}, 'Juegos'), el('th', {}, 'Kahoot'))));
    const tb = el('tbody');
    for (const s of PB.curso.sesiones) {
      const pr = progresoMision(s);
      const k = j.kahoots['m' + s.numero];
      tb.appendChild(el('tr', {},
        el('td', {}, el('a', { href: '#/m/' + s.numero }, `${s.icono || ''} ${s.numero}. ${s.titulo}`)),
        el('td', {}, Math.round(pr.pct * 100) + '%'),
        el('td', {}, s.mision || s.proyecto ? estrellas(PB.progreso.estrellasSesion(s)) : '—'),
        el('td', {}, s.retos ? `${s.retos.filter(r => PB.progreso.superado(r.id)).length}/${s.retos.length}` : '—'),
        el('td', {}, s.actividades ? `${s.actividades.filter(x => PB.juego.actividadHecha(x.id)).length}/${s.actividades.length}` : '—'),
        el('td', {}, s.kahoot ? (k ? Math.round(k.mejorPct * 100) + ' %' : '·') : '—')));
    }
    t.appendChild(tb);
    main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '🗺️ Avance por misión'), el('div', { class: 'tabla-scroll' }, t)));
    const cal = PB.progreso.calificacion();
    main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '🧮 Calificación estimada'),
      el('p', { class: 'nota' }, 'Es solo una estimación con lo que registra la plataforma. Tu docente asigna la calificación final (el proyecto se evalúa con rúbrica).'),
      el('table', { class: 'tabla-cal' }, el('tbody', {},
        el('tr', {}, el('td', {}, `Retos de programación (${cal.pesos.retos} %)`), el('td', {}, `${cal.retos}`)),
        el('tr', {}, el('td', {}, `Actividades interactivas (${cal.pesos.actividades} %)`), el('td', {}, `${cal.actividades} (${cal.actsHechas}/${cal.actsTotal})`)),
        el('tr', {}, el('td', {}, `Kahoots (${cal.pesos.kahoots} %)`), el('td', {}, `${cal.kahoots} (${cal.kahootsJugados}/${cal.kahootsTotal} jugados)`)),
        el('tr', {}, el('td', {}, `Proyecto final (${cal.pesos.proyectoFinal} %)`), el('td', {}, `${cal.final.cumplidos}/${cal.final.total} requisitos`)),
        el('tr', { class: 'total' }, el('td', {}, 'Estimado'), el('td', {}, `${cal.total}/100`))))));
    main.appendChild(el('div', { class: 'tarjeta peligro' }, el('h2', {}, 'Empezar de cero'),
      el('button', { class: 'btn btn-peligro', onclick: async () => {
        if (await PB.ui.confirmar('Se borrará todo tu progreso de este dispositivo (XP, logros y retos). Te recomendamos descargar antes tu archivo de progreso. ¿Borrar todo?', 'Borrar progreso', 'Sí, borrar', 'Cancelar', true)) {
          PB.progreso.reiniciar(); PB.app.pintarCabecera(); PB.app.ir('#/');
        }
      } }, 'Borrar mi progreso de este dispositivo')));
  };

  async function importarArchivo() {
    const f = await PB.archivos.leerArchivo('.json,application/json,text/plain');
    if (!f) return;
    try { PB.progreso.importar(f.texto); PB.ui.aviso('Progreso cargado y combinado', 'exito'); PB.app.pintarCabecera(); PB.app.render(); }
    catch (e) { PB.ui.alerta('Ese archivo no es un archivo de progreso válido.'); }
  }
  async function importarCodigo() {
    const t = await PB.ui.pedirTexto('Pega aquí tu código de progreso (empieza con PB1:)', '', { titulo: 'Cargar progreso' });
    if (!t) return;
    try { PB.progreso.importar(t); PB.ui.aviso('Progreso cargado y combinado', 'exito'); PB.app.pintarCabecera(); PB.app.render(); }
    catch (e) { PB.ui.alerta('El código no es válido. Cópialo completo, desde PB1: hasta el final.'); }
  }

  /* ================================================================ *
   * CERTIFICADO
   * ================================================================ */
  V.certificado = function (main) {
    const a = PB.progreso.alumno();
    const j = PB.juego.estado();
    const nv = PB.juego.nivelInfo(j.xp);
    const cal = PB.progreso.calificacion();
    main.appendChild(el('div', { class: 'no-imprimir acciones' },
      el('a', { class: 'btn btn-suave', href: '#/' }, '← Mapa'),
      el('button', { class: 'btn btn-primario', onclick: () => window.print() }, '🖨 Imprimir o guardar como PDF')));
    if (!a.nombre) main.appendChild(el('p', { class: 'aviso-almacen no-imprimir' }, 'Escribe tu nombre en «Mi perfil» para que aparezca en el certificado.'));
    main.appendChild(el('div', { class: 'certificado' },
      el('div', { class: 'cert-borde' },
        el('div', { class: 'cert-logo' }, '🐍🚀'),
        el('div', { class: 'cert-titulo' }, 'Certificado'),
        el('div', { class: 'cert-sub' }, 'otorgado a'),
        el('div', { class: 'cert-nombre' }, a.nombre || '________________'),
        el('div', { class: 'cert-texto' }, `por completar el curso «${PB.config.nombreCurso}» y demostrar sus conocimientos de Python: variables, tipos de datos, decisiones, bucles, listas y funciones.`),
        el('div', { class: 'cert-datos' },
          el('div', {}, el('strong', {}, `${nv.icono} Nivel ${nv.nivel}`), el('span', {}, nv.titulo)),
          el('div', {}, el('strong', {}, `${j.xp} XP`), el('span', {}, 'experiencia')),
          el('div', {}, el('strong', {}, `${Object.keys(j.logros).length}`), el('span', {}, 'logros')),
          el('div', {}, el('strong', {}, `${cal.misionesHechas + cal.retosHechos}`), el('span', {}, 'retos superados'))),
        el('div', { class: 'cert-insignias' }, ...PB.curso.unidades.filter(u => u.insignia && PB.progreso.tieneInsignia(u.numero)).map(u => el('span', { title: u.insignia }, u.icono))),
        el('div', { class: 'cert-firmas' },
          el('div', {}, el('div', { class: 'cert-linea' }), 'Docente'),
          el('div', {}, el('div', { class: 'cert-linea cert-fecha' }, PB.util.fechaCorta(PB.util.hoyISO())), 'Fecha')))));
    PB.juego.confeti(2000, 120);
  };

  /* ================================================================ *
   * PANEL DOCENTE
   * ================================================================ */
  V.docente = function (main, sub, sub2) {
    if (PB.estado.docente && sub === 'kahoot') {
      main.classList.add('con-kahoot');
      const s = PB.curso.sesiones.find(x => String(x.numero) === sub2);
      const preguntas = s ? preguntasKahoot(s) : PB.kahoot.preguntasAleatorias(20, { desde: 1 });
      PB.kahoot.equipos(main, { titulo: s ? `Misión ${s.numero}: ${s.titulo}` : '🏆 Gran Kahoot', preguntas, alSalir: () => ir('#/docente') });
      return;
    }
    main.appendChild(el('h1', {}, '🔑 Panel docente'));
    if (!PB.estado.docente) {
      const pin = el('input', { class: 'campo', type: 'password', inputmode: 'numeric', placeholder: 'PIN docente', autocomplete: 'off' });
      const entrar = () => {
        if (pin.value === String(PB.config.pinDocente)) {
          PB.estado.docente = true;
          PB.almacen.escribirSesion('pb:docente', '1');
          PB.app.pintarCabecera();
          PB.app.render();
        } else PB.ui.aviso('PIN incorrecto', 'error');
      };
      pin.addEventListener('keydown', ev => { if (ev.key === 'Enter') entrar(); });
      main.appendChild(el('div', { class: 'tarjeta' }, el('p', {}, 'Escribe el PIN para ver soluciones, planes de clase, jugar Kahoot en equipos y ver el ranking del grupo.'), pin, el('button', { class: 'btn btn-primario', onclick: entrar }, 'Entrar')));
      main.appendChild(el('p', { class: 'nota' }, 'El PIN se cambia en configuracion.json. Es una protección ligera para que los alumnos no vean las soluciones por accidente.'));
      return;
    }
    main.appendChild(el('div', { class: 'tarjeta' },
      el('p', {}, '✅ Modo docente activo en esta pestaña: en cada reto aparece «⋯ → Ver solución», las preguntas muestran la respuesta correcta y el plan de clase aparece al inicio de cada misión.'),
      el('button', { class: 'btn btn-suave', onclick: () => { PB.estado.docente = false; PB.almacen.escribirSesion('pb:docente', ''); PB.app.pintarCabecera(); PB.app.render(); } }, 'Salir del modo docente')));

    // Kahoot en equipos
    const sel = el('select', { class: 'campo' }, el('option', { value: 'gran' }, '🏆 Gran Kahoot (20 preguntas al azar)'),
      ...PB.curso.sesiones.filter(s => s.kahoot).map(s => el('option', { value: String(s.numero) }, `Misión ${s.numero}: ${s.titulo}`)));
    main.appendChild(el('div', { class: 'tarjeta' },
      el('h2', {}, '⚡ Kahoot en equipos (para proyectar)'),
      el('p', { class: 'nota' }, 'Proyecta la pantalla. Los equipos responden con tarjetas de color o con los dedos (1 a 4) y tú marcas quién acertó. Atajo: barra espaciadora para avanzar.'),
      el('div', { class: 'fila-campos' }, el('div', {}, sel), el('button', { class: 'btn btn-primario', onclick: () => ir('#/docente/kahoot/' + sel.value) }, '▶ Jugar en equipos'))));

    // Consolidar y ranking
    const zona = el('div');
    main.appendChild(el('div', { class: 'tarjeta' },
      el('h2', {}, '👥 Progreso y ranking del grupo'),
      el('p', { class: 'nota' }, 'Pide a cada alumno su archivo de progreso (Progreso → Descargar archivo) o su código. Selecciona todos los archivos a la vez: verás el ranking por XP (para proyectar) y la tabla del grupo, descargable como CSV.'),
      el('div', { class: 'acciones' },
        el('button', { class: 'btn btn-primario', onclick: async () => {
          const archivos = await PB.archivos.leerArchivo('.json,application/json,text/plain', true);
          if (archivos && archivos.length) consolidar(zona, archivos.map(a => a.texto));
        } }, '⬆ Seleccionar archivos de progreso'),
        el('button', { class: 'btn btn-suave', onclick: async () => {
          const t = await PB.ui.pedirTexto('Pega uno o varios códigos PB1: (uno por renglón o separados por espacios)', '', { titulo: 'Códigos de progreso' });
          if (t) consolidar(zona, t.split(/\s+/).filter(x => x.startsWith('PB1:')));
        } }, '⌨ Pegar códigos')),
      zona));

    const planes = el('div', { class: 'tarjeta' }, el('h2', {}, '🗓 Planes de clase'));
    for (const s of PB.curso.sesiones) {
      if (!s.plan) continue;
      const cont = el('div');
      pintarPlan(cont, s);
      const d = cont.firstChild;
      d.querySelector('summary').textContent = `Misión ${s.numero}: ${s.titulo}`;
      planes.appendChild(d);
    }
    main.appendChild(planes);
    const proyecto = PB.curso.sesiones.find(s => s.proyecto && s.proyecto.rubrica);
    if (proyecto) main.appendChild(el('div', { class: 'tarjeta' }, el('h2', {}, '📋 Rúbrica del proyecto final'), pintarRubrica(proyecto.proyecto.rubrica)));
  };

  function consolidar(zona, textos) {
    const filas = [];
    let errores = 0;
    for (const t of textos) { try { filas.push(PB.progreso.leerExterno(t)); } catch (e) { errores++; } }
    vaciar(zona);
    if (errores) zona.appendChild(el('p', { class: 'campo-error' }, `${errores} archivo(s) no se pudieron leer.`));
    if (!filas.length) return;
    const cfg = PB.config.evaluacion;
    const ses = PB.curso.sesiones;
    const datos = filas.map(d => {
      const jj = d.juego || {};
      const sup = (id) => !!(d.retos[id] && d.retos[id].superado);
      const nivel = (id) => { const e = d.retos[id]; return e && e.niveles ? (e.niveles.maestro ? 'M' : e.niveles.programador ? 'P' : e.niveles.explorador ? 'E' : '') : ''; };
      let cred = 0, pos = 0;
      for (const s of ses) {
        if (s.mision) { pos++; const n = nivel(s.mision.id); cred += n === 'M' || n === 'P' ? 1 : n === 'E' ? cfg.creditoExplorador : 0; }
        for (const r of s.retos || []) { pos++; if (sup(r.id)) cred++; }
      }
      const retos = pos ? Math.round(cred / pos * 100) : 0;
      const acts = ses.flatMap(s => s.actividades || []);
      const actividades = acts.length ? Math.round(acts.filter(a => jj.actividades && jj.actividades[a.id]).length / acts.length * 100) : 0;
      const conK = ses.filter(s => s.kahoot && s.kahoot.preguntas);
      const kahoots = conK.length ? Math.round(conK.reduce((t, s) => t + (jj.kahoots && jj.kahoots['m' + s.numero] ? jj.kahoots['m' + s.numero].mejorPct : 0), 0) / conK.length * 100) : 0;
      const sp = ses.find(x => x.numero === cfg.sesionProyectoFinal);
      const ep = sp && sp.proyecto ? d.retos[sp.proyecto.id] : null;
      const proy = ep && ep.requisitosTotal ? { txt: `${ep.requisitosCumplidos}/${ep.requisitosTotal}`, pct: ep.requisitosCumplidos / ep.requisitosTotal * 100 } : { txt: '', pct: 0 };
      const p = cfg.pesos;
      const total = Math.round((retos * p.retos + actividades * p.actividades + kahoots * p.kahoots + proy.pct * p.proyectoFinal) / 100);
      const nv = PB.juego.nivelInfo(jj.xp || 0);
      const pr = (k) => d.pruebas && d.pruebas[k] ? `${d.pruebas[k].puntaje}/${d.pruebas[k].total}` : '';
      return { nombre: d.alumno?.nombre || '(sin nombre)', grupo: d.alumno?.grupo || '', avatar: jj.avatar || '🐍', xp: jj.xp || 0, nivel: nv.nivel, logros: Object.keys(jj.logros || {}).length, retos, actividades, kahoots, proy: proy.txt, diag: pr('diagnostica'), fin: pr('final'), total };
    }).sort((a, b) => b.xp - a.xp);
    // Podio por XP
    const podio = el('div', { class: 'ranking-podio' });
    [datos[1], datos[0], datos[2]].forEach((d, k) => {
      if (!d) return;
      podio.appendChild(el('div', { class: 'rk-col rk-' + [2, 1, 3][k] }, el('div', { class: 'rk-avatar' }, d.avatar), el('div', { class: 'rk-nombre' }, d.nombre), el('div', { class: 'rk-xp' }, `${d.xp} XP`), el('div', { class: 'rk-barra' }, ['🥈', '🥇', '🥉'][k])));
    });
    const enc = ['#', 'Alumno', 'Grupo', 'Nivel', 'XP', 'Logros', 'Retos %', 'Juegos %', 'Kahoots %', 'Proyecto', 'Diagnóstica', 'Final', 'Estimado'];
    const tabla = el('table', { class: 'tabla-grupo' }, el('thead', {}, el('tr', {}, ...enc.map(h => el('th', {}, h)))));
    const tb = el('tbody');
    datos.forEach((d, i) => tb.appendChild(el('tr', {}, ...[i + 1, d.avatar + ' ' + d.nombre, d.grupo, d.nivel, d.xp, d.logros, d.retos, d.actividades, d.kahoots, d.proy, d.diag, d.fin, d.total].map(c => el('td', {}, String(c))))));
    tabla.appendChild(tb);
    const prom = (k) => { const v = filas.filter(d => d.pruebas && d.pruebas[k]).map(d => d.pruebas[k].puntaje); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) + ` (n=${v.length})` : '—'; };
    zona.append(el('h3', {}, '🏆 Ranking por XP'), podio,
      el('p', {}, `Alumnos: ${datos.length} · Promedio diagnóstica: ${prom('diagnostica')} · Promedio final: ${prom('final')}`),
      el('div', { class: 'tabla-scroll' }, tabla),
      el('button', { class: 'btn btn-primario', onclick: () => {
        const csv = [enc, ...datos.map((d, i) => [i + 1, d.nombre, d.grupo, d.nivel, d.xp, d.logros, d.retos, d.actividades, d.kahoots, d.proy, d.diag, d.fin, d.total])].map(f => f.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
        PB.archivos.descargar('progreso-grupo.csv', '﻿' + csv, 'text/csv');
      } }, '⬇ Descargar CSV'));
  }

  V.pasosDe = pasosDe;
  V.progresoMision = progresoMision;
})();
