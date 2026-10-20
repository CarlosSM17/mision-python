/* =========================================================================
 * 51-juego.js — Gamificación: XP, niveles, logros, racha de días, avatares,
 * sonidos (sintetizados, sin archivos) y confeti.
 * El estado vive en PB.progreso.datos.juego, así que se exporta e importa
 * junto con el resto del progreso.
 * ========================================================================= */
'use strict';

PB.juego = (() => {
  const { el } = PB.util;

  const NIVELES = [
    { xp: 0, titulo: 'Novato', icono: '🥚' },
    { xp: 150, titulo: 'Aprendiz', icono: '🐣' },
    { xp: 450, titulo: 'Curioso', icono: '🔎' },
    { xp: 900, titulo: 'Explorador', icono: '🧭' },
    { xp: 1500, titulo: 'Programador junior', icono: '💻' },
    { xp: 2250, titulo: 'Cazador de bugs', icono: '🐞' },
    { xp: 3150, titulo: 'Constructor', icono: '🧱' },
    { xp: 4200, titulo: 'Pythonista', icono: '🐍' },
    { xp: 5400, titulo: 'Hacker ético', icono: '🕶️' },
    { xp: 6750, titulo: 'Ninja del código', icono: '🥷' },
    { xp: 8250, titulo: 'Arquitecto', icono: '🏗️' },
    { xp: 9900, titulo: 'Mago de Python', icono: '🧙' },
    { xp: 11700, titulo: 'Maestro', icono: '🎓' },
    { xp: 13650, titulo: 'Gran Maestro', icono: '🏅' },
    { xp: 15750, titulo: 'Leyenda', icono: '👑' }
  ];

  const AVATARES = [
    { e: '🐍', n: 1 }, { e: '🐱', n: 1 }, { e: '🐶', n: 1 }, { e: '🦊', n: 1 }, { e: '🐼', n: 1 }, { e: '🐸', n: 1 },
    { e: '🐵', n: 1 }, { e: '🐧', n: 1 }, { e: '🦉', n: 2 }, { e: '🐢', n: 2 }, { e: '🦄', n: 3 }, { e: '🐙', n: 4 },
    { e: '🤖', n: 5 }, { e: '👽', n: 6 }, { e: '👾', n: 7 }, { e: '🦖', n: 8 }, { e: '🐲', n: 9 }, { e: '🧑‍🚀', n: 10 },
    { e: '🦸', n: 11 }, { e: '🧙', n: 12 }, { e: '🐉', n: 13 }, { e: '🦁', n: 14 }, { e: '👑', n: 15 }
  ];

  const c = (j, k) => (j.c[k] || 0);
  const LOGROS = [
    { id: 'hola-mundo', icono: '👋', nombre: '¡Hola, mundo!', desc: 'Ejecuta tu primer programa.', xp: 20, cond: j => c(j, 'ejecuciones') >= 1 },
    { id: 'primer-reto', icono: '🎯', nombre: 'Primer reto', desc: 'Supera tu primer reto de programación.', xp: 30, cond: j => c(j, 'retos') >= 1 },
    { id: 'a-la-primera', icono: '⚡', nombre: 'A la primera', desc: 'Supera un reto sin fallar ninguna comprobación.', xp: 40, cond: j => c(j, 'retosPrimera') >= 1 },
    { id: 'diez-retos', icono: '🏹', nombre: 'Diez de diez', desc: 'Supera 10 retos de programación.', xp: 80, cond: j => c(j, 'retos') >= 10 },
    { id: 'treinta-retos', icono: '🚀', nombre: 'Imparable', desc: 'Supera 30 retos de programación.', xp: 150, cond: j => c(j, 'retos') >= 30 },
    { id: 'maestro', icono: '🥋', nombre: 'Nivel Maestro', desc: 'Supera una misión en nivel Maestro.', xp: 60, cond: j => c(j, 'maestro') >= 1 },
    { id: 'maestro-5', icono: '🐉', nombre: 'Maestro de maestros', desc: 'Supera 5 misiones en nivel Maestro.', xp: 150, cond: j => c(j, 'maestro') >= 5 },
    { id: 'milla-extra', icono: '⭐', nombre: 'Milla extra', desc: 'Supera 3 retos extra.', xp: 80, cond: j => c(j, 'extras') >= 3 },
    { id: 'kahoot-1', icono: '🎮', nombre: '¡A jugar!', desc: 'Termina tu primer Kahoot.', xp: 20, cond: j => c(j, 'kahoots') >= 1 },
    { id: 'kahoot-10', icono: '🕹️', nombre: 'Fan de los quizzes', desc: 'Termina 10 Kahoots.', xp: 80, cond: j => c(j, 'kahoots') >= 10 },
    { id: 'perfecto', icono: '💯', nombre: 'Perfecto', desc: 'Responde bien todas las preguntas de un Kahoot.', xp: 80, cond: j => c(j, 'kahootPerfecto') >= 1 },
    { id: 'racha-5', icono: '🔥', nombre: 'En racha', desc: 'Encadena 5 respuestas correctas en un Kahoot.', xp: 50, cond: j => c(j, 'mejorRacha') >= 5 },
    { id: 'rayo', icono: '⚡', nombre: 'Rayo', desc: 'Responde bien en menos de 3 segundos.', xp: 30, cond: j => c(j, 'rapidas') >= 1 },
    { id: 'cazabugs', icono: '🐞', nombre: 'Cazador de bugs', desc: 'Completa 5 actividades de encontrar el error.', xp: 60, cond: j => c(j, 'act_error') >= 5 },
    { id: 'ordenado', icono: '🧩', nombre: 'Todo en su lugar', desc: 'Completa 5 actividades de ordenar código.', xp: 60, cond: j => c(j, 'act_ordenar') >= 5 },
    { id: 'detective', icono: '🕵️', nombre: 'Detective de variables', desc: 'Completa 3 trazas de variables.', xp: 50, cond: j => c(j, 'act_traza') >= 3 },
    { id: 'adivino', icono: '🔮', nombre: 'Adivino', desc: 'Acierta 5 actividades de «¿Qué imprime?».', xp: 60, cond: j => c(j, 'act_salida') >= 5 },
    { id: 'memoria', icono: '🧠', nombre: 'Memoria de elefante', desc: 'Completa un memorama.', xp: 30, cond: j => c(j, 'act_memorama') >= 1 },
    { id: 'dedos-rapidos', icono: '⌨️', nombre: 'Dedos rápidos', desc: 'Completa 3 actividades de mecanografía Python.', xp: 50, cond: j => c(j, 'act_teclear') >= 3 },
    { id: 'jugador', icono: '🎲', nombre: 'Jugador incansable', desc: 'Completa 25 actividades interactivas.', xp: 120, cond: j => c(j, 'actividades') >= 25 },
    { id: 'cientifico', icono: '🔬', nombre: 'Científico', desc: 'Experimenta con 10 exploradores interactivos.', xp: 50, cond: j => c(j, 'exploradores') >= 10 },
    { id: 'camara-lenta', icono: '🐢', nombre: 'Cámara lenta', desc: 'Ejecuta un programa paso a paso.', xp: 20, cond: j => c(j, 'pasoAPaso') >= 1 },
    { id: 'aprendo', icono: '🩹', nombre: 'Aprendo de mis errores', desc: 'Lee 10 errores explicados.', xp: 40, cond: j => c(j, 'errores') >= 10 },
    { id: 'constante', icono: '📅', nombre: 'Constante', desc: 'Practica 3 días seguidos.', xp: 50, cond: j => (j.racha.mejor || 0) >= 3 },
    { id: 'semana', icono: '🗓️', nombre: 'Semana perfecta', desc: 'Practica 7 días seguidos.', xp: 120, cond: j => (j.racha.mejor || 0) >= 7 },
    { id: 'desafio', icono: '🌟', nombre: 'Desafío diario', desc: 'Completa 3 desafíos del día.', xp: 50, cond: j => c(j, 'desafios') >= 3 },
    { id: 'mision-cumplida', icono: '🏁', nombre: 'Misión cumplida', desc: 'Completa todos los pasos de una misión.', xp: 50, cond: j => c(j, 'misionesCompletas') >= 1 },
    { id: 'viajero', icono: '🪐', nombre: 'Viajero espacial', desc: 'Completa 5 misiones.', xp: 120, cond: j => c(j, 'misionesCompletas') >= 5 },
    { id: 'galactico', icono: '🌌', nombre: 'Explorador galáctico', desc: 'Completa todas las misiones.', xp: 300, cond: j => c(j, 'misionesCompletas') >= (PB.curso ? PB.curso.sesiones.length : 99) },
    { id: 'nivel-5', icono: '💻', nombre: 'Programador junior', desc: 'Llega al nivel 5.', xp: 0, cond: j => nivelInfo(j.xp).nivel >= 5 },
    { id: 'nivel-10', icono: '🥷', nombre: 'Ninja del código', desc: 'Llega al nivel 10.', xp: 0, cond: j => nivelInfo(j.xp).nivel >= 10 },
    { id: 'creador', icono: '🛠️', nombre: 'Creador', desc: 'Entrega tu proyecto final.', xp: 150, cond: j => c(j, 'proyecto') >= 1 }
  ];

  let escuchas = [];
  let revisando = false;

  /* ---------------- Estado ---------------- */
  function estado() {
    const d = PB.progreso.datos;
    const j = d.juego = d.juego || {};
    j.xp = j.xp || 0;
    j.c = j.c || {};
    j.logros = j.logros || {};
    j.otorgado = j.otorgado || {};
    j.racha = j.racha || { dias: 0, mejor: 0, ultimo: null };
    j.kahoots = j.kahoots || {};
    j.actividades = j.actividades || {};
    j.exploradores = j.exploradores || {};
    j.historial = j.historial || [];
    j.desafios = j.desafios || {};
    j.animo = j.animo || {};
    if (j.sonido === undefined) j.sonido = true;
    if (!j.avatar) j.avatar = '🐍';
    return j;
  }

  function nivelInfo(xp) {
    let i = 0;
    while (i + 1 < NIVELES.length && xp >= NIVELES[i + 1].xp) i++;
    const actual = NIVELES[i], sig = NIVELES[i + 1];
    const progreso = sig ? (xp - actual.xp) / (sig.xp - actual.xp) : 1;
    return { nivel: i + 1, titulo: actual.titulo, icono: actual.icono, xp, xpNivel: actual.xp, xpSiguiente: sig ? sig.xp : null, progreso, faltan: sig ? sig.xp - xp : 0 };
  }

  function avisar() { for (const fn of escuchas) { try { fn(); } catch (e) { /* nada */ } } }

  /* ---------------- XP ---------------- */
  /**
   * Suma XP. Con «clave», solo cuenta una vez (o la mejora: si antes se
   * otorgaron 40 con esa clave y ahora 70, suma 30).
   */
  function ganarXP(cantidad, motivo, clave, { silencioso = false } = {}) {
    const j = estado();
    cantidad = Math.round(cantidad);
    if (cantidad <= 0) return 0;
    let delta = cantidad;
    if (clave) {
      const previo = j.otorgado[clave] || 0;
      if (cantidad <= previo) return 0;
      delta = cantidad - previo;
      j.otorgado[clave] = cantidad;
    }
    const antes = nivelInfo(j.xp);
    j.xp += delta;
    j.historial.unshift({ f: PB.util.hoyISO(), m: motivo, xp: delta });
    if (j.historial.length > 80) j.historial.length = 80;
    registrarDia();
    PB.progreso.guardar();
    if (!silencioso) xpFlotante(delta);
    const despues = nivelInfo(j.xp);
    if (despues.nivel > antes.nivel) setTimeout(() => subirNivel(despues), 700);
    revisarLogros();
    avisar();
    return delta;
  }

  function contar(clave, n = 1) {
    const j = estado();
    j.c[clave] = (j.c[clave] || 0) + n;
    PB.progreso.guardar();
    revisarLogros();
  }
  function fijarMax(clave, valor) {
    const j = estado();
    if (valor > (j.c[clave] || 0)) { j.c[clave] = valor; PB.progreso.guardar(); revisarLogros(); }
  }

  /* ---------------- Racha de días ---------------- */
  function diaLocal(d = new Date()) {
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  function registrarDia() {
    const j = estado();
    const hoy = diaLocal();
    if (j.racha.ultimo === hoy) return;
    const ayer = diaLocal(new Date(Date.now() - 86400000));
    j.racha.dias = j.racha.ultimo === ayer ? (j.racha.dias || 0) + 1 : 1;
    j.racha.ultimo = hoy;
    j.racha.mejor = Math.max(j.racha.mejor || 0, j.racha.dias);
    PB.progreso.guardar();
    if (j.racha.dias > 1) {
      setTimeout(() => {
        PB.ui.aviso(`🔥 ¡Racha de ${j.racha.dias} días! +${Math.min(j.racha.dias, 7) * 10} XP`, 'exito', 3500);
        ganarXP(Math.min(j.racha.dias, 7) * 10, 'Racha de días', 'racha:' + hoy, { silencioso: true });
      }, 1200);
    }
    avisar();
  }
  const rachaActiva = () => {
    const j = estado();
    const ayer = diaLocal(new Date(Date.now() - 86400000));
    return (j.racha.ultimo === diaLocal() || j.racha.ultimo === ayer) ? j.racha.dias : 0;
  };

  /* ---------------- Logros ---------------- */
  function revisarLogros() {
    if (revisando) return;
    revisando = true;
    try {
      const j = estado();
      // Misiones completas: todas sus etapas vistas
      if (PB.curso && PB.vistas && PB.vistas.pasosDe) {
        const completas = PB.curso.sesiones.filter(s => PB.vistas.pasosDe(s).every(p => PB.progreso.pasoVisto(s.numero, p.id))).length;
        j.c.misionesCompletas = completas;
      }
      for (const l of LOGROS) {
        if (j.logros[l.id]) continue;
        let ok = false;
        try { ok = l.cond(j); } catch (e) { ok = false; }
        if (ok) {
          j.logros[l.id] = PB.util.hoyISO();
          PB.progreso.guardar(true);
          setTimeout(() => toastLogro(l), 400);
          if (l.xp) ganarXP(l.xp, 'Logro: ' + l.nombre, 'logro:' + l.id, { silencioso: true });
        }
      }
    } finally {
      revisando = false;
    }
  }

  /* ---------------- Exploradores, actividades, Kahoots ---------------- */
  function usarExplorador(nombre) {
    const j = estado();
    if (j.exploradores[nombre]) return;
    j.exploradores[nombre] = true;
    j.c.exploradores = Object.keys(j.exploradores).length;
    ganarXP(10, 'Explorador: ' + nombre, 'exp:' + nombre);
    revisarLogros();
  }

  function completarActividad(act, { intentos = 1, puntaje = 1 } = {}) {
    const j = estado();
    const previo = j.actividades[act.id];
    const primera = !previo || !previo.completada;
    j.actividades[act.id] = { completada: (previo && previo.completada) || PB.util.hoyISO(), intentos: (previo ? previo.intentos : 0) + intentos, mejor: Math.max(puntaje, previo ? previo.mejor || 0 : 0) };
    if (primera) {
      contar('act_' + act.tipo);
      contar('actividades');
    }
    const base = act.xp || 60;
    const bono = intentos <= 1 ? 20 : 0;
    const xp = ganarXP(Math.round((base + bono) * puntaje), 'Actividad: ' + act.titulo, 'act:' + act.id);
    PB.progreso.guardar(true);
    return { primera, xp };
  }
  const actividadHecha = (id) => !!(estado().actividades[id] && estado().actividades[id].completada);

  function registrarKahoot(clave, { puntos, correctas, total, mejorRacha, rapidas }, xpMax = 150) {
    const j = estado();
    const pct = total ? correctas / total : 0;
    const previo = j.kahoots[clave] || { mejor: 0, mejorPct: 0, jugadas: 0 };
    j.kahoots[clave] = {
      mejor: Math.max(previo.mejor, puntos), mejorPct: Math.max(previo.mejorPct, pct),
      jugadas: previo.jugadas + 1, ultima: PB.util.hoyISO()
    };
    contar('kahoots');
    if (clave.startsWith('desafio:') && !previo.jugadas) {
      j.desafios[clave.slice(8)] = pct;
      contar('desafios');
    }
    if (pct === 1) contar('kahootPerfecto');
    fijarMax('mejorRacha', mejorRacha);
    if (rapidas) contar('rapidas', rapidas);
    const xp = ganarXP(Math.round(pct * xpMax), 'Kahoot', 'kahoot:' + clave);
    return { xp, record: puntos > previo.mejor, previo };
  }

  /* ---------------- Avatares ---------------- */
  function avatares() {
    const n = nivelInfo(estado().xp).nivel;
    return AVATARES.map(a => Object.assign({ libre: n >= a.n }, a));
  }
  function fijarAvatar(e) {
    estado().avatar = e;
    PB.progreso.guardar(true);
    avisar();
  }

  /* ---------------- Sonidos ---------------- */
  let audio = null;
  function ctx() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audio = new AC(); } catch (e) { return null; }
    }
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }
  function tono(frec, inicio, dur, tipo = 'sine', vol = 0.12) {
    const a = ctx();
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = tipo;
    o.frequency.value = frec;
    const t = a.currentTime + inicio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const SONIDOS = {
    correcto: () => { tono(660, 0, 0.12); tono(880, 0.1, 0.2); },
    incorrecto: () => { tono(220, 0, 0.18, 'square', 0.06); tono(165, 0.15, 0.3, 'square', 0.06); },
    tic: () => tono(1200, 0, 0.05, 'triangle', 0.05),
    clic: () => tono(900, 0, 0.04, 'triangle', 0.04),
    cuenta: () => tono(520, 0, 0.12, 'triangle', 0.1),
    ya: () => tono(1040, 0, 0.25, 'triangle', 0.12),
    nivel: () => { [523, 659, 784, 1047].forEach((f, i) => tono(f, i * 0.1, 0.25, 'triangle', 0.12)); },
    logro: () => { [784, 988, 1175].forEach((f, i) => tono(f, i * 0.08, 0.22, 'sine', 0.1)); },
    fin: () => { [523, 523, 523, 659, 784].forEach((f, i) => tono(f, [0, 0.15, 0.3, 0.45, 0.65][i], 0.3, 'triangle', 0.11)); },
    xp: () => tono(1320, 0, 0.08, 'sine', 0.06)
  };
  function sonido(tipo) {
    if (!estado().sonido) return;
    try { (SONIDOS[tipo] || (() => {}))(); } catch (e) { /* sin audio */ }
  }
  function alternarSonido() {
    const j = estado();
    j.sonido = !j.sonido;
    PB.progreso.guardar(true);
    if (j.sonido) sonido('clic');
    avisar();
    return j.sonido;
  }

  /* ---------------- Efectos visuales ---------------- */
  function confeti(ms = 2200, cantidad = 140) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lienzo = el('canvas', { class: 'confeti', 'aria-hidden': 'true' });
    document.body.appendChild(lienzo);
    const dpr = window.devicePixelRatio || 1;
    const W = lienzo.width = window.innerWidth * dpr, H = lienzo.height = window.innerHeight * dpr;
    const g = lienzo.getContext('2d');
    const colores = ['#E21B3C', '#1368CE', '#D89E00', '#26890C', '#9966FF', '#FF8C1A', '#0FBD8C'];
    const ps = Array.from({ length: cantidad }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 18 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
      r: (4 + Math.random() * 6) * dpr, c: colores[Math.floor(Math.random() * colores.length)], giro: Math.random() * 6, vg: (Math.random() - 0.5) * 0.3
    }));
    const t0 = performance.now();
    const paso = (t) => {
      g.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.vy += 0.45 * dpr; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.giro += p.vg;
        g.save(); g.translate(p.x, p.y); g.rotate(p.giro); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
      }
      if (t - t0 < ms) requestAnimationFrame(paso); else lienzo.remove();
    };
    requestAnimationFrame(paso);
  }

  function xpFlotante(cantidad) {
    sonido('xp');
    const f = el('div', { class: 'xp-flotante' }, `+${cantidad} XP`);
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }

  function toastLogro(l) {
    sonido('logro');
    let cont = document.querySelector('.logros-toasts');
    if (!cont) { cont = el('div', { class: 'logros-toasts', 'aria-live': 'polite' }); document.body.appendChild(cont); }
    const t = el('div', { class: 'toast-logro' },
      el('div', { class: 'toast-logro-icono' }, l.icono),
      el('div', {}, el('div', { class: 'toast-logro-titulo' }, '¡Logro desbloqueado!'), el('div', { class: 'toast-logro-nombre' }, l.nombre), el('div', { class: 'toast-logro-desc' }, l.desc + (l.xp ? ` · +${l.xp} XP` : ''))));
    cont.appendChild(t);
    setTimeout(() => t.classList.add('saliendo'), 4200);
    setTimeout(() => t.remove(), 4700);
  }

  function subirNivel(info) {
    sonido('nivel');
    confeti(2600, 180);
    const nuevos = AVATARES.filter(a => a.n === info.nivel);
    PB.ui.modal({
      titulo: '', clase: 'modal-nivel',
      contenido: (c) => {
        c.append(
          el('div', { class: 'nivel-grande' }, info.icono),
          el('div', { class: 'nivel-texto' }, `¡Subiste al nivel ${info.nivel}!`),
          el('div', { class: 'nivel-titulo' }, info.titulo),
          nuevos.length ? el('p', { class: 'nota' }, 'Nuevo avatar desbloqueado: ', ...nuevos.map(a => el('span', { class: 'avatar-nuevo' }, a.e))) : null);
      },
      botones: [{ texto: '¡Genial!', tipo: 'primario' }]
    });
  }

  return {
    NIVELES, LOGROS, AVATARES, estado, nivelInfo, ganarXP, contar, fijarMax, registrarDia, rachaActiva, revisarLogros,
    usarExplorador, completarActividad, actividadHecha, registrarKahoot, avatares, fijarAvatar,
    sonido, alternarSonido, confeti, xpFlotante, diaLocal,
    alCambiar: (fn) => escuchas.push(fn)
  };
})();

/* Ganchos que usa el taller (61-taller.js) para dar XP y contar logros. */
PB.ganchos = {
  alEjecutar(ok, error) {
    PB.juego.contar('ejecuciones');
    if (error && error.tipo !== 'Detenido') PB.juego.contar('errores');
  },
  alPaso() { PB.juego.contar('pasoAPaso'); },
  /** Devuelve los XP ganados para mostrarlos en la felicitación. */
  alSuperar({ reto, tipo, nivel, nuevo, fallos }) {
    const j = PB.juego;
    let xp = 0;
    if (tipo === 'reto') xp = j.ganarXP(reto.xp || 80, 'Reto: ' + reto.titulo, 'reto:' + reto.id);
    else if (tipo === 'mision') {
      const valores = { explorador: 100, programador: 150, maestro: 200 };
      xp = j.ganarXP(valores[nivel] || 150, `Misión (${nivel}): ${reto.titulo}`, `mision:${reto.id}:${nivel}`);
      if (nuevo && nivel === 'maestro') j.contar('maestro');
    } else if (tipo === 'extra') {
      xp = j.ganarXP(reto.xp || 150, 'Reto extra: ' + reto.titulo, 'extra:' + reto.id);
      if (nuevo) j.contar('extras');
    } else if (tipo === 'proyecto') {
      xp = j.ganarXP(300, 'Proyecto: ' + reto.titulo, 'proyecto:' + reto.id);
      if (nuevo) j.contar('proyecto');
    }
    if (nuevo && tipo !== 'proyecto') {
      j.contar('retos');
      if (!fallos) j.contar('retosPrimera');
    }
    return xp;
  }
};
