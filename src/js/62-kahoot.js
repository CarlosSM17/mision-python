/* =========================================================================
 * 62-kahoot.js — Quizzes tipo Kahoot.
 *   · individual: tiempo por pregunta, puntos por rapidez, racha, podio
 *   · equipos (proyector): el docente proyecta, los equipos responden con
 *     tarjetas de color o con los dedos, y el docente marca quién acertó.
 * Pregunta: { pregunta, codigo?, opciones:[2..4], correcta, tiempo?, explicacion?,
 *             tipo?: 'vf', codigoOpciones? }
 * ========================================================================= */
'use strict';

PB.kahoot = (() => {
  const { el, vaciar } = PB.util;
  const FORMAS = [
    { color: '#E21B3C', forma: 'triangulo', nombre: 'Rojo' },
    { color: '#1368CE', forma: 'rombo', nombre: 'Azul' },
    { color: '#D89E00', forma: 'circulo', nombre: 'Amarillo' },
    { color: '#26890C', forma: 'cuadrado', nombre: 'Verde' }
  ];
  const FORMAS_VF = [{ color: '#1368CE', forma: 'rombo', nombre: 'Azul' }, { color: '#E21B3C', forma: 'triangulo', nombre: 'Rojo' }];
  const NOMBRES_EQUIPO = ['Los Pythones', 'Bits Veloces', 'Cazabugs', 'Loop Infinito', 'Las Variables', 'Team Print', 'Los Índices', 'Booleanos'];
  const COLORES_EQUIPO = ['#E21B3C', '#1368CE', '#D89E00', '#26890C', '#9966FF', '#FF8C1A', '#0FBD8C', '#FF6680'];

  function svgForma(forma, tam = 28) {
    const f = {
      triangulo: '<polygon points="16,3 30,28 2,28"/>',
      rombo: '<polygon points="16,2 30,16 16,30 2,16"/>',
      circulo: '<circle cx="16" cy="16" r="13"/>',
      cuadrado: '<rect x="4" y="4" width="24" height="24" rx="2"/>'
    }[forma];
    const s = el('span', { class: 'kh-forma', 'aria-hidden': 'true' });
    s.innerHTML = `<svg width="${tam}" height="${tam}" viewBox="0 0 32 32" fill="#fff">${f}</svg>`;
    return s;
  }

  const formasDe = (q) => (q.tipo === 'vf' || q.opciones.length === 2 ? FORMAS_VF : FORMAS);
  const opcionesDe = (q) => (q.tipo === 'vf' && !q.opciones ? ['Verdadero', 'Falso'] : q.opciones);

  function contenidoOpcion(q, texto) {
    if (q.codigoOpciones) {
      const pre = el('pre', { class: 'kh-codigo-opcion' });
      pre.textContent = texto;
      return pre;
    }
    return el('span', { class: 'kh-texto-opcion', html: texto });
  }

  function tarjetaPregunta(q, numero, total, grande) {
    const caja = el('div', { class: 'kh-pregunta' + (grande ? ' grande' : '') });
    caja.appendChild(el('div', { class: 'kh-pregunta-texto', html: q.pregunta }));
    if (q.codigo) caja.appendChild(PB.bloqueCodigo(q.codigo, { numeros: q.codigo.split('\n').length > 2, clase: 'kh-codigo' }));
    return caja;
  }

  function mezclar(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }

  /* ================================================================ *
   * Juego individual
   * ================================================================ */
  function jugar(contenedor, { titulo, subtitulo, preguntas, clave, xpMax = 150, alTerminar, alEquipos, aleatorio = false }) {
    const raiz = el('div', { class: 'kahoot' });
    contenedor.appendChild(raiz);
    let lista = preguntas.slice();
    let estado, temporizador = null, destruido = false;

    const limpiarTimer = () => { if (temporizador) { clearInterval(temporizador); temporizador = null; } };
    PB.app.alSalir(() => { destruido = true; limpiarTimer(); document.removeEventListener('keydown', teclas); });

    function teclas(ev) {
      if (destruido || !estado) return;
      if (estado.fase === 'pregunta' && /^[1-4]$/.test(ev.key)) {
        const i = +ev.key - 1;
        if (i < opcionesDe(lista[estado.i]).length) responder(i);
      } else if ((ev.key === 'Enter' || ev.key === ' ') && estado.fase === 'retro') {
        ev.preventDefault();
        siguiente();
      }
    }
    document.addEventListener('keydown', teclas);

    function intro() {
      vaciar(raiz);
      const mejor = clave ? (PB.juego.estado().kahoots[clave] || null) : null;
      raiz.appendChild(el('div', { class: 'kh-intro' },
        el('div', { class: 'kh-logo' }, 'PyQuiz', el('span', {}, '!')),
        el('h2', {}, titulo),
        subtitulo ? el('p', { class: 'kh-sub' }, subtitulo) : null,
        el('div', { class: 'kh-datos' },
          el('span', {}, `❓ ${lista.length} preguntas`),
          el('span', {}, '⏱ con tiempo'),
          el('span', {}, '🔥 bonos por racha')),
        mejor ? el('p', { class: 'kh-record' }, `🏆 Tu récord: ${mejor.mejor.toLocaleString('es-MX')} puntos (${Math.round(mejor.mejorPct * 100)} %)`) : null,
        el('div', { class: 'kh-intro-botones' },
          el('button', { class: 'kh-btn kh-btn-jugar', onclick: empezar }, '▶ ¡Jugar!'),
          alEquipos ? el('button', { class: 'kh-btn kh-btn-sec', onclick: alEquipos }, '👥 Jugar en equipos (proyector)') : null),
        el('p', { class: 'kh-ayuda' }, 'Responde rápido: entre más rápido aciertes, más puntos. También puedes usar las teclas 1, 2, 3 y 4.')));
    }

    function empezar() {
      if (aleatorio) lista = mezclar(preguntas);
      estado = { i: 0, puntos: 0, correctas: 0, racha: 0, mejorRacha: 0, rapidas: 0, respuestas: [], fase: 'cuenta' };
      cuentaRegresiva(() => pregunta());
    }

    function cuentaRegresiva(fin) {
      vaciar(raiz);
      const n = el('div', { class: 'kh-cuenta' }, '3');
      raiz.appendChild(el('div', { class: 'kh-cuenta-caja' }, n));
      let k = 3;
      PB.juego.sonido('cuenta');
      const t = setInterval(() => {
        if (destruido) { clearInterval(t); return; }
        k--;
        if (k > 0) { n.textContent = String(k); n.classList.remove('pulso'); void n.offsetWidth; n.classList.add('pulso'); PB.juego.sonido('cuenta'); }
        else if (k === 0) { n.textContent = '¡Ya!'; PB.juego.sonido('ya'); }
        else { clearInterval(t); fin(); }
      }, 800);
    }

    function pregunta() {
      if (destruido) return;
      const q = lista[estado.i];
      estado.fase = 'pregunta';
      vaciar(raiz);
      const tiempo = q.tiempo || 20;
      const barra = el('div', { class: 'kh-barra-tiempo-relleno' });
      const segs = el('div', { class: 'kh-segundos' }, String(tiempo));
      raiz.appendChild(el('div', { class: 'kh-barra-sup' },
        el('span', {}, `Pregunta ${estado.i + 1} de ${lista.length}`),
        el('span', { class: 'kh-puntos' }, `${estado.puntos.toLocaleString('es-MX')} pts`),
        estado.racha > 1 ? el('span', { class: 'kh-racha' }, `🔥 ${estado.racha}`) : el('span')));
      raiz.appendChild(tarjetaPregunta(q, estado.i + 1, lista.length));
      raiz.appendChild(el('div', { class: 'kh-tiempo' }, segs, el('div', { class: 'kh-barra-tiempo' }, barra)));
      const ops = el('div', { class: 'kh-opciones n' + opcionesDe(q).length });
      const formas = formasDe(q);
      estado.botones = opcionesDe(q).map((op, i) => {
        const b = el('button', { class: 'kh-opcion', style: { background: formas[i].color }, onclick: () => responder(i), 'aria-label': `Opción ${i + 1}` },
          svgForma(formas[i].forma), contenidoOpcion(q, op));
        ops.appendChild(b);
        return b;
      });
      raiz.appendChild(ops);
      const t0 = performance.now();
      estado.t0 = t0;
      let ultimoSeg = tiempo;
      limpiarTimer();
      temporizador = setInterval(() => {
        const t = (performance.now() - t0) / 1000;
        const resto = Math.max(0, tiempo - t);
        barra.style.width = (resto / tiempo * 100) + '%';
        const s = Math.ceil(resto);
        if (s !== ultimoSeg) {
          ultimoSeg = s;
          segs.textContent = String(s);
          if (s <= 5 && s > 0) { PB.juego.sonido('tic'); segs.classList.add('urgente'); }
        }
        if (resto <= 0) responder(-1);
      }, 100);
    }

    function responder(i) {
      if (estado.fase !== 'pregunta') return;
      limpiarTimer();
      estado.fase = 'retro';
      const q = lista[estado.i];
      const tiempo = q.tiempo || 20;
      const t = Math.min(tiempo, (performance.now() - estado.t0) / 1000);
      const ok = i === q.correcta;
      let ganados = 0;
      if (ok) {
        estado.correctas++;
        estado.racha++;
        estado.mejorRacha = Math.max(estado.mejorRacha, estado.racha);
        ganados = Math.round(1000 * (1 - (t / tiempo) / 2)) + Math.min(Math.max(estado.racha - 1, 0), 5) * 100;
        if (t < 3) estado.rapidas++;
        PB.juego.sonido('correcto');
      } else {
        estado.racha = 0;
        PB.juego.sonido('incorrecto');
      }
      estado.puntos += ganados;
      estado.respuestas.push({ q, i, ok, t, ganados });
      estado.botones.forEach((b, j) => {
        b.disabled = true;
        b.classList.toggle('kh-correcta', j === q.correcta);
        b.classList.toggle('kh-apagada', j !== q.correcta && j !== i);
        b.classList.toggle('kh-elegida-mal', j === i && !ok);
      });
      const ultima = estado.i === lista.length - 1;
      const retro = el('div', { class: 'kh-retro ' + (ok ? 'ok' : 'no') },
        el('div', { class: 'kh-retro-titulo' }, i < 0 ? '⏰ ¡Se acabó el tiempo!' : ok ? '✔ ¡Correcto!' : '✘ Incorrecto'),
        ok ? el('div', { class: 'kh-retro-puntos' }, `+${ganados}`) : null,
        ok && estado.racha > 1 ? el('div', { class: 'kh-retro-racha' }, `🔥 Racha de ${estado.racha}`) : null,
        q.explicacion ? el('div', { class: 'kh-retro-expl', html: q.explicacion }) : null,
        el('button', { class: 'kh-btn kh-btn-sig', onclick: siguiente }, ultima ? '🏆 Ver resultados' : 'Siguiente ▶'));
      raiz.appendChild(retro);
      setTimeout(() => { const b = retro.querySelector('.kh-btn-sig'); if (b) b.focus({ preventScroll: true }); retro.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 50);
    }

    function siguiente() {
      if (estado.fase !== 'retro') return;
      estado.i++;
      if (estado.i < lista.length) pregunta();
      else final();
    }

    function final() {
      estado.fase = 'final';
      vaciar(raiz);
      const total = lista.length;
      const pct = estado.correctas / total;
      const medalla = pct >= 0.9 ? '🥇' : pct >= 0.7 ? '🥈' : pct >= 0.5 ? '🥉' : '🎖️';
      const frase = pct === 1 ? '¡Perfecto! Eres una leyenda.' : pct >= 0.7 ? '¡Excelente trabajo!' : pct >= 0.5 ? '¡Bien! Sigue practicando.' : 'Repasa la teoría y vuelve a intentarlo.';
      let info = { xp: 0, record: false };
      if (clave) info = PB.juego.registrarKahoot(clave, { puntos: estado.puntos, correctas: estado.correctas, total, mejorRacha: estado.mejorRacha, rapidas: estado.rapidas }, xpMax);
      PB.juego.sonido('fin');
      if (pct >= 0.7) PB.juego.confeti();
      const revision = el('div', { class: 'kh-revision', hidden: true });
      estado.respuestas.forEach((r, k) => {
        revision.appendChild(el('div', { class: 'kh-rev-item ' + (r.ok ? 'ok' : 'no') },
          el('div', {}, el('strong', {}, `${k + 1}. `), el('span', { html: r.q.pregunta })),
          r.q.codigo ? PB.bloqueCodigo(r.q.codigo) : null,
          el('div', { class: 'nota' }, r.ok ? `✔ Correcto (+${r.ganados})` : `✘ ${r.i < 0 ? 'Sin respuesta' : 'Respondiste: ' + textoPlano(opcionesDe(r.q)[r.i])} · Correcta: ${textoPlano(opcionesDe(r.q)[r.q.correcta])}`),
          r.q.explicacion ? el('div', { class: 'nota', html: r.q.explicacion }) : null));
      });
      raiz.appendChild(el('div', { class: 'kh-final' },
        el('div', { class: 'kh-medalla' }, medalla),
        el('h2', {}, frase),
        el('div', { class: 'kh-puntaje' }, estado.puntos.toLocaleString('es-MX'), el('small', {}, ' puntos')),
        el('div', { class: 'kh-stats' },
          el('div', {}, el('strong', {}, `${estado.correctas}/${total}`), el('span', {}, 'correctas')),
          el('div', {}, el('strong', {}, `🔥 ${estado.mejorRacha}`), el('span', {}, 'mejor racha')),
          el('div', {}, el('strong', {}, `+${info.xp}`), el('span', {}, 'XP'))),
        info.record && info.previo && info.previo.jugadas ? el('div', { class: 'kh-nuevo-record' }, '🏆 ¡Nuevo récord personal!') : null,
        el('div', { class: 'kh-intro-botones' },
          el('button', { class: 'kh-btn kh-btn-jugar', onclick: empezar }, '↺ Jugar otra vez'),
          el('button', { class: 'kh-btn kh-btn-sec', onclick: () => { revision.hidden = !revision.hidden; } }, '📋 Revisar respuestas'),
          alTerminar ? el('button', { class: 'kh-btn kh-btn-sec', onclick: () => alTerminar({ puntos: estado.puntos, pct }) }, 'Continuar ▶') : null),
        revision));
    }

    intro();
    return raiz;
  }

  function textoPlano(html) {
    const d = document.createElement('div');
    d.innerHTML = String(html);
    return d.textContent.replace(/\n/g, ' ⏎ ');
  }

  /* ================================================================ *
   * Modo equipos (para proyectar en clase)
   * ================================================================ */
  function equipos(contenedor, { titulo, preguntas, alSalir }) {
    const raiz = el('div', { class: 'kahoot kahoot-equipos' });
    contenedor.appendChild(raiz);
    let equiposLista = [];
    let i = 0, temporizador = null, destruido = false, fase = 'config', pausado = false;
    let aciertos = new Set(), primero = null, ultimosPuntos = {};
    const limpiarTimer = () => { if (temporizador) { clearInterval(temporizador); temporizador = null; } };
    PB.app.alSalir(() => { destruido = true; limpiarTimer(); document.removeEventListener('keydown', teclas); });

    let accionPrincipal = null;
    function teclas(ev) {
      if (destruido) return;
      if ((ev.key === ' ' || ev.key === 'Enter') && accionPrincipal && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        ev.preventDefault();
        accionPrincipal();
      }
    }
    document.addEventListener('keydown', teclas);

    const barraSup = () => el('div', { class: 'kh-barra-sup' },
      el('span', {}, titulo),
      fase !== 'config' && fase !== 'podio' ? el('span', {}, `Pregunta ${i + 1} de ${preguntas.length}`) : el('span'),
      el('button', { class: 'kh-btn-mini', title: 'Pantalla completa', onclick: pantallaCompleta }, '⛶'));

    function pantallaCompleta() {
      const d = document;
      try {
        if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
        else (raiz.requestFullscreen || raiz.webkitRequestFullscreen).call(raiz);
      } catch (e) { PB.ui.aviso('Tu navegador no permite pantalla completa aquí.', 'info'); }
    }

    function config() {
      fase = 'config';
      vaciar(raiz);
      let n = 4;
      const lista = el('div', { class: 'kh-config-equipos' });
      const nombres = NOMBRES_EQUIPO.slice();
      const pintar = () => {
        vaciar(lista);
        for (let k = 0; k < n; k++) {
          const inp = el('input', { class: 'campo', value: nombres[k], 'aria-label': 'Nombre del equipo ' + (k + 1) });
          inp.addEventListener('input', () => { nombres[k] = inp.value; });
          lista.appendChild(el('div', { class: 'kh-config-equipo', style: { borderColor: COLORES_EQUIPO[k] } }, el('span', { class: 'kh-punto', style: { background: COLORES_EQUIPO[k] } }), inp));
        }
      };
      pintar();
      const contador = el('span', { class: 'kh-n' }, String(n));
      raiz.append(barraSup(), el('div', { class: 'kh-intro' },
        el('div', { class: 'kh-logo' }, 'PyQuiz', el('span', {}, '!'), el('small', {}, ' en equipos')),
        el('h2', {}, titulo),
        el('p', { class: 'kh-sub' }, `${preguntas.length} preguntas. Proyecta esta pantalla. Cada equipo responde levantando una tarjeta del color o forma de su respuesta (o con los dedos: 1 a 4). Tú marcas qué equipos acertaron.`),
        el('div', { class: 'kh-n-equipos' },
          el('button', { class: 'kh-btn-mini', onclick: () => { if (n > 2) { n--; contador.textContent = n; pintar(); } } }, '−'),
          el('span', {}, 'Equipos: '), contador,
          el('button', { class: 'kh-btn-mini', onclick: () => { if (n < 8) { n++; contador.textContent = n; pintar(); } } }, '+')),
        lista,
        el('div', { class: 'kh-intro-botones' },
          el('button', { class: 'kh-btn kh-btn-jugar', onclick: () => {
            equiposLista = nombres.slice(0, n).map((nombre, k) => ({ nombre: nombre.trim() || `Equipo ${k + 1}`, color: COLORES_EQUIPO[k], puntos: 0 }));
            i = 0;
            pregunta();
          } }, '▶ Comenzar'),
          alSalir ? el('button', { class: 'kh-btn kh-btn-sec', onclick: alSalir }, '← Volver') : null)));
      accionPrincipal = null;
    }

    function pregunta() {
      fase = 'pregunta';
      pausado = false;
      aciertos = new Set();
      primero = null;
      vaciar(raiz);
      const q = preguntas[i];
      const tiempo = q.tiempo ? q.tiempo + 10 : 30;
      const barra = el('div', { class: 'kh-barra-tiempo-relleno' });
      const segs = el('div', { class: 'kh-segundos' }, String(tiempo));
      const ops = el('div', { class: 'kh-opciones grande n' + opcionesDe(q).length });
      const formas = formasDe(q);
      const botones = opcionesDe(q).map((op, k) => {
        const b = el('div', { class: 'kh-opcion', style: { background: formas[k].color } }, svgForma(formas[k].forma, 40), contenidoOpcion(q, op));
        ops.appendChild(b);
        return b;
      });
      const btnPausa = el('button', { class: 'kh-btn kh-btn-sec', onclick: () => { pausado = !pausado; btnPausa.textContent = pausado ? '▶ Seguir' : '⏸ Pausa'; } }, '⏸ Pausa');
      const btnRevelar = el('button', { class: 'kh-btn kh-btn-jugar', onclick: () => revelar(q, botones) }, 'Revelar respuesta');
      raiz.append(barraSup(), tarjetaPregunta(q, i + 1, preguntas.length, true), el('div', { class: 'kh-tiempo' }, segs, el('div', { class: 'kh-barra-tiempo' }, barra)), ops,
        el('div', { class: 'kh-controles' }, btnPausa, btnRevelar));
      accionPrincipal = () => revelar(q, botones);
      let resto = tiempo, ultimo = Date.now(), ultimoSeg = tiempo;
      limpiarTimer();
      temporizador = setInterval(() => {
        const ahora = Date.now();
        if (!pausado) resto -= (ahora - ultimo) / 1000;
        ultimo = ahora;
        barra.style.width = Math.max(0, resto / tiempo * 100) + '%';
        const s = Math.max(0, Math.ceil(resto));
        if (s !== ultimoSeg) { ultimoSeg = s; segs.textContent = String(s); if (s <= 5 && s > 0) { PB.juego.sonido('tic'); segs.classList.add('urgente'); } }
        if (resto <= 0) revelar(q, botones);
      }, 100);
    }

    function revelar(q, botones) {
      if (fase !== 'pregunta') return;
      limpiarTimer();
      fase = 'revelar';
      PB.juego.sonido('ya');
      botones.forEach((b, k) => { b.classList.toggle('kh-correcta', k === q.correcta); b.classList.toggle('kh-apagada', k !== q.correcta); });
      raiz.querySelector('.kh-controles').remove();
      const panel = el('div', { class: 'kh-marcar' },
        q.explicacion ? el('div', { class: 'kh-retro-expl', html: q.explicacion }) : null,
        el('div', { class: 'kh-marcar-titulo' }, `¿Qué equipos eligieron ${formasDe(q)[q.correcta].nombre.toLowerCase()}? Tócalos. Con ⭐ marca al primero en acertar (+300).`));
      const fila = el('div', { class: 'kh-marcar-equipos' });
      const pintar = () => {
        vaciar(fila);
        equiposLista.forEach((e, k) => {
          const on = aciertos.has(k);
          fila.appendChild(el('div', { class: 'kh-equipo-chip' + (on ? ' on' : ''), style: { '--c': e.color } },
            el('button', { class: 'kh-chip-main', onclick: () => { on ? aciertos.delete(k) : aciertos.add(k); if (!aciertos.has(primero)) primero = null; PB.juego.sonido('clic'); pintar(); } }, on ? '✔ ' : '', e.nombre),
            el('button', { class: 'kh-chip-estrella' + (primero === k ? ' on' : ''), title: 'Primero en acertar', onclick: () => { aciertos.add(k); primero = primero === k ? null : k; pintar(); } }, '⭐')));
        });
      };
      pintar();
      panel.append(fila, el('div', { class: 'kh-controles' }, el('button', { class: 'kh-btn kh-btn-jugar', onclick: marcador }, 'Ver marcador ▶')));
      raiz.appendChild(panel);
      accionPrincipal = marcador;
    }

    function marcador() {
      fase = 'marcador';
      const antes = equiposLista.map(e => e.puntos);
      ultimosPuntos = {};
      equiposLista.forEach((e, k) => {
        let d = 0;
        if (aciertos.has(k)) d += 1000;
        if (primero === k) d += 300;
        e.puntos += d;
        ultimosPuntos[k] = d;
      });
      vaciar(raiz);
      const orden = equiposLista.map((e, k) => ({ e, k })).sort((a, b) => b.e.puntos - a.e.puntos);
      const max = Math.max(1, ...equiposLista.map(e => e.puntos));
      const lista = el('div', { class: 'kh-marcador' });
      orden.forEach(({ e, k }, pos) => {
        const relleno = el('div', { class: 'kh-marcador-relleno', style: { background: e.color, width: (antes[k] / max * 100) + '%' } });
        lista.appendChild(el('div', { class: 'kh-marcador-fila' },
          el('span', { class: 'kh-pos' }, String(pos + 1)),
          el('span', { class: 'kh-marcador-nombre' }, e.nombre),
          el('div', { class: 'kh-marcador-barra' }, relleno),
          el('span', { class: 'kh-marcador-pts' }, e.puntos.toLocaleString('es-MX'), ultimosPuntos[k] ? el('small', {}, ` +${ultimosPuntos[k]}`) : null)));
        setTimeout(() => { relleno.style.width = (e.puntos / max * 100) + '%'; }, 60);
      });
      const ultima = i === preguntas.length - 1;
      raiz.append(barraSup(), el('h2', { class: 'kh-titulo-marcador' }, '📊 Marcador'), lista,
        el('div', { class: 'kh-controles' }, el('button', { class: 'kh-btn kh-btn-jugar', onclick: () => { if (ultima) podio(); else { i++; pregunta(); } } }, ultima ? '🏆 Ver podio' : 'Siguiente pregunta ▶')));
      accionPrincipal = () => { if (ultima) podio(); else { i++; pregunta(); } };
    }

    function podio() {
      fase = 'podio';
      accionPrincipal = null;
      vaciar(raiz);
      PB.juego.sonido('fin');
      PB.juego.confeti(3000, 200);
      const orden = equiposLista.slice().sort((a, b) => b.puntos - a.puntos);
      const lugares = [orden[1], orden[0], orden[2]];
      const alturas = ['62%', '85%', '45%'];
      const medallas = ['🥈', '🥇', '🥉'];
      const caja = el('div', { class: 'kh-podio' });
      lugares.forEach((e, k) => {
        if (!e) return;
        caja.appendChild(el('div', { class: 'kh-podio-col' },
          el('div', { class: 'kh-podio-nombre' }, medallas[k], ' ', e.nombre),
          el('div', { class: 'kh-podio-pts' }, e.puntos.toLocaleString('es-MX')),
          el('div', { class: 'kh-podio-barra', style: { height: alturas[k], background: e.color } }, el('span', {}, String([2, 1, 3][k])))));
      });
      raiz.append(barraSup(), el('h2', { class: 'kh-titulo-marcador' }, '🏆 ¡Podio!'), caja,
        orden.length > 3 ? el('ol', { class: 'kh-resto', start: '4' }, ...orden.slice(3).map(e => el('li', {}, `${e.nombre}: ${e.puntos.toLocaleString('es-MX')}`))) : null,
        el('div', { class: 'kh-controles' },
          el('button', { class: 'kh-btn kh-btn-jugar', onclick: config }, '↺ Jugar otra vez'),
          alSalir ? el('button', { class: 'kh-btn kh-btn-sec', onclick: alSalir }, '← Volver') : null));
    }

    config();
    return raiz;
  }

  /** Preguntas al azar de los Kahoots de las sesiones (para repasos y la gran final). */
  function preguntasAleatorias(n, { hasta = 99, desde = 0, soloVistas = false } = {}) {
    const todas = [];
    for (const s of PB.curso.sesiones) {
      if (s.numero < desde || s.numero > hasta || !s.kahoot || !s.kahoot.preguntas) continue;
      if (soloVistas && !PB.progreso.pasoVisto(s.numero, 'aprende')) continue;
      for (const q of s.kahoot.preguntas) todas.push(Object.assign({ sesion: s.numero }, q));
    }
    return mezclar(todas).slice(0, n);
  }

  return { jugar, equipos, preguntasAleatorias, svgForma, FORMAS, mezclar };
})();
