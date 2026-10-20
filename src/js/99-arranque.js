/* =========================================================================
 * 99-arranque.js — Configuración, cabecera (XP, nivel, racha, sonido),
 * rutas (#/…) y arranque de «Misión Python».
 * ========================================================================= */
'use strict';

(() => {
  const { el, vaciar } = PB.util;

  const DATOS = window.PB_DATOS || { config: {}, unidades: [], sesiones: [], prueba: { items: [] } };

  PB.config = Object.assign({
    idCurso: 'mision-python',
    nombreCurso: 'Misión Python',
    lema: 'Aprende Python jugando: misiones, retos y Kahoots.',
    pinDocente: '2468',
    rutaMediaBlockly: 'https://cdn.jsdelivr.net/npm/blockly@11.2.2/media/',
    urlPublica: '',
    evaluacion: {
      pesos: { retos: 35, actividades: 15, kahoots: 20, proyectoFinal: 30 },
      creditoExplorador: 0.5, sesionProyectoFinal: 15
    }
  }, DATOS.config || {});
  if (window.PB_SPRITES_BLOCKLY) PB.config.spritesBlockly = window.PB_SPRITES_BLOCKLY;

  PB.curso = {
    unidades: DATOS.unidades || [],
    sesiones: (DATOS.sesiones || []).slice().sort((a, b) => a.numero - b.numero),
    prueba: DATOS.prueba || { items: [] }
  };

  PB.estado = {
    docente: PB.almacen.leerSesion('pb:docente') === '1',
    escalaBloques: 0.85,
    textoGrande: !!PB.almacen.leer('pb:textoGrande', false)
  };

  let salidas = [];
  let cabecera, vista;

  PB.app = {
    alSalir(fn) { salidas.push(fn); },
    ir(ruta) {
      if (location.hash === ruta) PB.app.render();
      else location.hash = ruta;
    },
    render,
    pintarCabecera
  };

  function limpiarVista() {
    for (const fn of salidas) { try { fn(); } catch (e) { console.warn(e); } }
    salidas = [];
    document.querySelectorAll('.menu-emergente').forEach(m => m.remove());
    vaciar(vista);
    vista.className = 'vista';
  }

  function render() {
    limpiarVista();
    const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const [a, b, c, d, e] = partes;
    marcarNav(a || 'mapa');
    try {
      if (!a) PB.vistas.mapa(vista);
      else if (a === 'm') PB.vistas.mision(vista, parseInt(b, 10), c, d, e);
      else if (a === 'logros') PB.vistas.logros(vista);
      else if (a === 'perfil') PB.vistas.perfil(vista);
      else if (a === 'desafio') PB.vistas.desafio(vista);
      else if (a === 'gran-kahoot') PB.vistas.granKahoot(vista, b);
      else if (a === 'glosario') PB.vistas.glosario(vista);
      else if (a === 'progreso') PB.vistas.progreso(vista);
      else if (a === 'certificado') PB.vistas.certificado(vista);
      else if (a === 'docente') PB.vistas.docente(vista, b, c);
      else PB.vistas.mapa(vista);
    } catch (err) {
      console.error(err);
      vista.appendChild(el('div', { class: 'tarjeta peligro' }, el('h2', {}, 'Algo salió mal'), el('p', {}, String(err && err.message || err)), el('a', { class: 'btn btn-primario', href: '#/' }, 'Volver al mapa')));
    }
    if (!vista.classList.contains('con-taller') && !vista.classList.contains('con-kahoot')) window.scrollTo(0, 0);
  }

  function marcarNav(seccion) {
    const equivalente = { m: 'mapa', desafio: 'mapa', 'gran-kahoot': 'mapa', certificado: 'mapa', perfil: 'logros' }[seccion] || seccion;
    for (const x of cabecera.querySelectorAll('.app-nav a')) x.classList.toggle('activo', x.dataset.seccion === equivalente);
  }

  function pintarCabecera() {
    vaciar(cabecera);
    const a = PB.progreso.alumno();
    const j = PB.juego.estado();
    const nv = PB.juego.nivelInfo(j.xp);
    const enIframe = window.self !== window.top;
    cabecera.append(
      el('a', { class: 'marca', href: '#/', title: PB.config.nombreCurso },
        el('span', { class: 'logo-mision', 'aria-hidden': 'true' }, '🐍'),
        el('span', { class: 'marca-texto' }, PB.config.nombreCurso)),
      el('nav', { class: 'app-nav', 'aria-label': 'Secciones' },
        el('a', { href: '#/', 'data-seccion': 'mapa' }, el('span', { class: 'nav-icono' }, '🗺️'), el('span', { class: 'nav-texto' }, 'Mapa')),
        el('a', { href: '#/logros', 'data-seccion': 'logros' }, el('span', { class: 'nav-icono' }, '🏅'), el('span', { class: 'nav-texto' }, 'Logros')),
        el('a', { href: '#/glosario', 'data-seccion': 'glosario' }, el('span', { class: 'nav-icono' }, '🔤'), el('span', { class: 'nav-texto' }, 'Glosario')),
        el('a', { href: '#/progreso', 'data-seccion': 'progreso' }, el('span', { class: 'nav-icono' }, '📈'), el('span', { class: 'nav-texto' }, 'Progreso')),
        el('a', { href: '#/docente', 'data-seccion': 'docente', class: PB.estado.docente ? 'nav-docente-activo' : '' }, el('span', { class: 'nav-icono' }, '🔑'), el('span', { class: 'nav-texto' }, PB.estado.docente ? 'Docente ✓' : 'Docente'))),
      el('div', { class: 'app-herramientas' },
        el('a', { class: 'pildora-xp', href: '#/logros', title: `Nivel ${nv.nivel}: ${nv.titulo} · ${j.xp} XP` },
          el('span', { class: 'pildora-nivel' }, nv.icono + ' ' + nv.nivel),
          el('span', { class: 'pildora-barra' }, el('span', { class: 'pildora-relleno', style: { width: (nv.progreso * 100) + '%' } })),
          el('span', { class: 'pildora-xp-n' }, j.xp + ' XP')),
        el('span', { class: 'pildora-racha' + (PB.juego.rachaActiva() ? ' activa' : ''), title: 'Días seguidos practicando' }, '🔥 ' + PB.juego.rachaActiva()),
        el('button', { class: 'btn-icono', title: j.sonido ? 'Silenciar' : 'Activar sonido', 'aria-label': 'Sonido', onclick: () => { PB.juego.alternarSonido(); pintarCabecera(); } }, j.sonido ? '🔊' : '🔇'),
        el('button', { class: 'btn-icono ocultar-chico', title: PB.estado.textoGrande ? 'Letra normal' : 'Letra más grande', 'aria-label': 'Cambiar tamaño de letra', onclick: alternarTexto }, PB.estado.textoGrande ? 'A−' : 'A+'),
        enIframe && PB.config.urlPublica ? el('a', { class: 'btn-icono ocultar-chico', href: PB.config.urlPublica, target: '_blank', rel: 'noopener', title: 'Abrir en una pestaña nueva' }, '↗') : null,
        el('a', { class: 'alumno-chip', href: '#/perfil', title: 'Mi perfil' }, el('span', { class: 'alumno-avatar' }, j.avatar), el('span', { class: 'alumno-nombre' }, a.nombre || 'Mi perfil'))));
    marcarNav((location.hash.replace(/^#\/?/, '').split('/')[0]) || 'mapa');
  }

  function alternarTexto() {
    PB.estado.textoGrande = !PB.estado.textoGrande;
    PB.almacen.escribir('pb:textoGrande', PB.estado.textoGrande);
    aplicarTexto();
    pintarCabecera();
    render();
  }
  function aplicarTexto() {
    document.documentElement.classList.toggle('texto-grande', PB.estado.textoGrande);
    PB.estado.escalaBloques = PB.estado.textoGrande ? 1.05 : 0.85;
  }

  async function bienvenida() {
    let nombre, grupo, avatar = PB.juego.estado().avatar;
    const r = await PB.ui.modal({
      titulo: '', clase: 'modal-bienvenida',
      contenido: (c) => {
        c.appendChild(el('div', { class: 'bienvenida-cabeza' }, el('div', { class: 'bienvenida-logo rebote' }, '🐍🚀'), el('h2', {}, '¡Bienvenida, bienvenido a Misión Python!'),
          el('p', {}, 'Vas a aprender a programar en Python completando misiones, juegos y Kahoots. Gana XP, sube de nivel y desbloquea logros.')));
        c.appendChild(el('label', { class: 'campo-etiqueta' }, '¿Cómo te llamas?'));
        nombre = el('input', { class: 'campo', type: 'text', placeholder: 'Tu nombre', autocomplete: 'off' });
        c.appendChild(nombre);
        c.appendChild(el('label', { class: 'campo-etiqueta' }, 'Grupo (opcional)'));
        grupo = el('input', { class: 'campo', type: 'text', placeholder: 'Por ejemplo: 1° A', autocomplete: 'off' });
        c.appendChild(grupo);
        c.appendChild(el('label', { class: 'campo-etiqueta' }, 'Elige tu avatar'));
        const fila = el('div', { class: 'rejilla-avatares chica' });
        for (const av of PB.juego.avatares().filter(x => x.libre)) {
          const b = el('button', { class: 'avatar-op' + (av.e === avatar ? ' elegido' : ''), type: 'button', onclick: () => { avatar = av.e; for (const x of fila.children) x.classList.remove('elegido'); b.classList.add('elegido'); PB.juego.sonido('clic'); } }, el('span', { class: 'avatar-emoji' }, av.e));
          fila.appendChild(b);
        }
        c.appendChild(fila);
        if (!PB.almacen.disponible) c.appendChild(el('p', { class: 'aviso-almacen' }, '⚠ Este navegador no permite guardar tu progreso. Usa «Progreso → Descargar archivo» antes de salir.'));
      },
      botones: [{ texto: 'Después', valor: null }, { texto: '🚀 ¡Despegar!', tipo: 'primario', valor: 'ok' }]
    });
    if (r === 'ok') {
      if (nombre.value.trim()) PB.progreso.fijarAlumno(nombre.value, grupo.value);
      PB.juego.fijarAvatar(avatar);
      PB.juego.ganarXP(20, '¡Bienvenida!', 'bienvenida');
      pintarCabecera();
      render();
    }
  }

  function errorDeCarga(mensaje) {
    document.body.appendChild(el('div', { class: 'error-carga' },
      el('div', { class: 'tarjeta' }, el('h1', {}, '😕 No se pudo cargar la plataforma'), el('p', {}, mensaje),
        el('button', { class: 'btn btn-primario', onclick: () => location.reload() }, 'Volver a intentar'))));
  }

  function arrancar() {
    if (window.PB_MODO_PRUEBA) return;
    document.title = PB.config.nombreCurso;
    if (typeof window.Blockly === 'undefined') {
      errorDeCarga('No se pudo descargar el editor de bloques (Blockly). Revisa la conexión a internet y vuelve a intentar.');
      return;
    }
    aplicarTexto();
    PB.progreso.cargar();
    PB.juego.estado();
    cabecera = el('header', { class: 'app-cabeza' });
    vista = el('main', { class: 'vista', id: 'vista' });
    const raiz = document.getElementById('app') || document.body;
    vaciar(raiz);
    raiz.append(cabecera, vista);
    pintarCabecera();
    PB.juego.alCambiar(PB.util.debounce(pintarCabecera, 150));
    window.addEventListener('hashchange', render);
    // Blockly mide el texto al dibujar: esperamos a que carguen las fuentes (máximo 2 s)
    const fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fuentes, new Promise(r => setTimeout(r, 2000))]).then(() => {
      PB.juego.registrarDia();   // antes de pintar, para que el mapa muestre la racha de hoy
      render();
    });
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', PB.util.debounce(() => {
        for (const ws of Blockly.Workspace.getAll ? Blockly.Workspace.getAll() : []) {
          try { if (ws.rendered) ws.render(); } catch (e) { /* nada */ }
        }
      }, 200));
    }
    if (!PB.ejecutor.disponible()) {
      PB.ui.aviso('No se pudo cargar el intérprete de Python (Skulpt). Revisa la conexión.', 'error', 8000);
    }
    if (!PB.progreso.alumno().nombre) setTimeout(bienvenida, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
