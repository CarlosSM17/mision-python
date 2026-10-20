/* =========================================================================
 * 50-progreso.js — Progreso del alumno guardado en el dispositivo.
 * Incluye exportar/importar (archivo o código para copiar), resumen para
 * entregar y el cálculo de la calificación propuesta.
 * ========================================================================= */
'use strict';

PB.progreso = (() => {
  const VERSION = 1;
  const NIVELES = ['explorador', 'programador', 'maestro'];
  const ESTRELLAS = { explorador: 1, programador: 2, maestro: 3 };
  let clave = 'pb:progreso';
  let datos = null;
  let alCambiar = [];

  function vacio() {
    return {
      version: VERSION, curso: PB.config.idCurso, alumno: { nombre: '', grupo: '' },
      creado: PB.util.hoyISO(), actualizado: PB.util.hoyISO(),
      retos: {}, borradores: {}, respuestas: {}, pruebas: {}, coevaluaciones: [], insignias: {}, pasos: {}, ejecuciones: {}, juego: {}
    };
  }

  function cargar() {
    clave = 'pb:progreso:' + PB.config.idCurso;
    datos = PB.almacen.leer(clave, null);
    if (!datos || datos.version !== VERSION) datos = Object.assign(vacio(), datos || {});
    for (const k of ['retos', 'borradores', 'respuestas', 'pruebas', 'insignias', 'pasos', 'ejecuciones', 'juego']) datos[k] = datos[k] || {};
    datos.coevaluaciones = datos.coevaluaciones || [];
    return datos;
  }

  const guardarYa = () => {
    datos.actualizado = PB.util.hoyISO();
    PB.almacen.escribir(clave, datos);
  };
  const guardarPronto = PB.util.debounce(guardarYa, 400);

  function guardar(inmediato) {
    if (inmediato) guardarYa(); else guardarPronto();
    for (const fn of alCambiar) { try { fn(); } catch (e) { /* nada */ } }
  }

  /* ---------- Alumno ---------- */
  const alumno = () => datos.alumno;
  function fijarAlumno(nombre, grupo) {
    datos.alumno = { nombre: nombre.trim(), grupo: (grupo || '').trim() };
    guardar(true);
  }

  /* ---------- Retos ---------- */
  function estadoReto(id) {
    return datos.retos[id] || { niveles: {}, intentos: 0 };
  }
  function sumarIntento(id) {
    const e = datos.retos[id] = estadoReto(id);
    e.intentos = (e.intentos || 0) + 1;
    guardar();
  }
  /** Marca un reto como superado. Devuelve {nuevo: bool, mejora: bool}. */
  function marcarReto(id, nivel = 'programador', modo = null) {
    const e = datos.retos[id] = estadoReto(id);
    e.niveles = e.niveles || {};
    const antes = mejorNivel(id);
    const nuevo = !e.niveles[nivel];
    if (nuevo) e.niveles[nivel] = PB.util.hoyISO();
    if (modo) e.modo = Math.max(e.modo || 0, modo);
    e.superado = true;
    guardar(true);
    const despues = mejorNivel(id);
    return { nuevo, mejora: (ESTRELLAS[despues] || 0) > (ESTRELLAS[antes] || 0) };
  }
  function mejorNivel(id) {
    const e = datos.retos[id];
    if (!e || !e.niveles) return null;
    let mejor = null;
    for (const n of NIVELES) if (e.niveles[n]) mejor = n;
    return mejor;
  }
  const superado = (id) => !!(datos.retos[id] && datos.retos[id].superado);

  /* ---------- Borradores de código ---------- */
  const borrador = (k) => datos.borradores[k];
  function guardarBorrador(k, valor) {
    if (valor === null) delete datos.borradores[k]; else datos.borradores[k] = valor;
    guardar();
  }

  /* ---------- Respuestas (predicción, puente, ticket, autoevaluación) ---------- */
  const respuesta = (k) => datos.respuestas[k];
  function responder(k, valor) {
    datos.respuestas[k] = Object.assign({ fecha: PB.util.hoyISO() }, valor);
    guardar(true);
  }

  /* ---------- Pruebas diagnóstica y final ---------- */
  const prueba = (tipo) => datos.pruebas[tipo];
  function guardarPrueba(tipo, valor) {
    datos.pruebas[tipo] = Object.assign({ fecha: PB.util.hoyISO() }, valor);
    guardar(true);
  }

  /* ---------- Coevaluaciones ---------- */
  function agregarCoevaluacion(c) {
    datos.coevaluaciones.push(Object.assign({ fecha: PB.util.hoyISO() }, c));
    guardar(true);
  }

  /* ---------- Pasos vistos de cada sesión ---------- */
  function marcarPaso(sesion, paso) {
    const p = datos.pasos[sesion] = datos.pasos[sesion] || {};
    if (!p[paso]) { p[paso] = PB.util.hoyISO(); guardar(); }
  }
  const pasoVisto = (sesion, paso) => !!(datos.pasos[sesion] && datos.pasos[sesion][paso]);

  /** Recuerda que un código se ejecutó completo sin errores (para proyectos). */
  function registrarEjecucion(id, codigo, ok) {
    datos.ejecuciones[id] = { huella: huella(codigo), ok, fecha: PB.util.hoyISO() };
    guardar();
  }
  function ejecucionOk(id, codigo) {
    const e = datos.ejecuciones[id];
    return !!(e && e.ok && e.huella === huella(codigo));
  }
  function huella(s) {
    let h = 0;
    const t = String(s).replace(/\s+/g, ' ').trim();
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return h;
  }

  /* ---------- Estrellas e insignias ---------- */
  function estrellasSesion(sesion) {
    if (sesion.proyecto) return superado(sesion.proyecto.id) ? 3 : 0;
    if (!sesion.mision) return 0;
    return ESTRELLAS[mejorNivel(sesion.mision.id)] || 0;
  }
  const principalDe = (s) => s.mision || s.proyecto || null;

  /** Revisa las insignias de mundo; devuelve las recién ganadas. */
  function revisarInsignias() {
    const nuevas = [];
    for (const u of PB.curso.unidades) {
      if (!u.insignia) continue;
      const sesiones = PB.curso.sesiones.filter(s => s.unidad === u.numero && principalDe(s));
      if (!sesiones.length) continue;
      const completa = sesiones.every(s => superado(principalDe(s).id));
      if (completa && !datos.insignias[u.numero]) {
        datos.insignias[u.numero] = PB.util.hoyISO();
        nuevas.push(u);
      }
    }
    if (nuevas.length) guardar(true);
    return nuevas;
  }
  const tieneInsignia = (unidad) => !!datos.insignias[unidad];

  /* ---------- Calificación propuesta ---------- */
  function calificacion() {
    const cfg = PB.config.evaluacion;
    const sesiones = PB.curso.sesiones;
    const j = datos.juego || {};
    // Retos de programación: misiones (por nivel) + retos rápidos
    let creditos = 0, posibles = 0, misionesHechas = 0, retosHechos = 0, retosTotal = 0, misionesTotal = 0;
    for (const s of sesiones) {
      if (s.mision) {
        misionesTotal++; posibles++;
        const n = mejorNivel(s.mision.id);
        if (n === 'programador' || n === 'maestro') { creditos += 1; misionesHechas++; }
        else if (n === 'explorador') { creditos += cfg.creditoExplorador; misionesHechas++; }
      }
      // Mini-proyectos (no el final, que tiene su propio peso) cuentan como una misión
      if (s.proyecto && s.numero !== cfg.sesionProyectoFinal) {
        misionesTotal++; posibles++;
        if (superado(s.proyecto.id)) { creditos += 1; misionesHechas++; }
      }
      for (const r of s.retos || []) { retosTotal++; posibles++; if (superado(r.id)) { creditos += 1; retosHechos++; } }
    }
    const retos = posibles ? creditos / posibles * 100 : 0;
    // Actividades interactivas
    const acts = sesiones.flatMap(s => s.actividades || []);
    const actsHechas = acts.filter(a => j.actividades && j.actividades[a.id] && j.actividades[a.id].completada).length;
    const actividades = acts.length ? actsHechas / acts.length * 100 : 0;
    // Kahoots de cada misión: mejor porcentaje
    const conKahoot = sesiones.filter(s => s.kahoot && s.kahoot.preguntas && s.kahoot.preguntas.length);
    const sumaK = conKahoot.reduce((t, s) => t + ((j.kahoots && j.kahoots['m' + s.numero]) ? j.kahoots['m' + s.numero].mejorPct : 0), 0);
    const kahootsJugados = conKahoot.filter(s => j.kahoots && j.kahoots['m' + s.numero]).length;
    const kahoots = conKahoot.length ? sumaK / conKahoot.length * 100 : 0;
    const final = requisitosProyecto(cfg.sesionProyectoFinal);
    const p = cfg.pesos;
    const total = (retos * p.retos + actividades * p.actividades + kahoots * p.kahoots + final.porcentaje * p.proyectoFinal) / 100;
    return {
      retos: Math.round(retos), misionesHechas, misionesTotal, retosHechos, retosTotal,
      actividades: Math.round(actividades), actsHechas, actsTotal: acts.length,
      kahoots: Math.round(kahoots), kahootsJugados, kahootsTotal: conKahoot.length,
      final, total: Math.round(total), pesos: p
    };
  }

  function requisitosProyecto(numSesion) {
    const s = PB.curso.sesiones.find(x => x.numero === numSesion);
    if (!s || !s.proyecto) return { cumplidos: 0, total: 0, porcentaje: 0, entregado: false };
    const e = estadoReto(s.proyecto.id);
    const cumplidos = e.requisitosCumplidos || 0;
    const total = e.requisitosTotal || ((s.proyecto.requiere || []).length + 1);
    return { cumplidos, total, porcentaje: total ? Math.round((cumplidos / total) * 100) : 0, entregado: !!e.superado };
  }
  function guardarRequisitos(id, cumplidos, total) {
    const e = datos.retos[id] = estadoReto(id);
    e.requisitosCumplidos = Math.max(e.requisitosCumplidos || 0, cumplidos);
    e.requisitosTotal = total;
    guardar();
  }

  /* ---------- Exportar / importar ---------- */
  function exportar(conBorradores = true) {
    const copia = PB.util.clonar(datos);
    if (!conBorradores) delete copia.borradores;
    return JSON.stringify(copia, null, 1);
  }

  function codigoProgreso() {
    const json = exportar(false);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return 'PB1:' + b64;
  }

  function leerExterno(texto) {
    let t = String(texto).trim();
    if (t.startsWith('PB1:')) t = decodeURIComponent(escape(atob(t.slice(4))));
    const d = JSON.parse(t);
    if (!d || typeof d !== 'object' || !d.retos) throw new Error('No es un archivo de progreso.');
    return d;
  }

  /** Combina un progreso externo con el actual (se queda con lo mejor). */
  function importar(texto) {
    const ext = leerExterno(texto);
    if (!datos.alumno.nombre && ext.alumno) datos.alumno = ext.alumno;
    for (const [id, e] of Object.entries(ext.retos || {})) {
      const mio = datos.retos[id] = estadoReto(id);
      mio.niveles = Object.assign({}, e.niveles || {}, mio.niveles || {});
      mio.superado = mio.superado || e.superado;
      mio.intentos = Math.max(mio.intentos || 0, e.intentos || 0);
      mio.modo = Math.max(mio.modo || 0, e.modo || 0);
      if (e.requisitosCumplidos) {
        mio.requisitosCumplidos = Math.max(mio.requisitosCumplidos || 0, e.requisitosCumplidos);
        mio.requisitosTotal = e.requisitosTotal;
      }
    }
    for (const k of ['respuestas', 'pruebas', 'insignias', 'borradores', 'ejecuciones']) {
      datos[k] = Object.assign({}, ext[k] || {}, datos[k] || {});
    }
    for (const [s, p] of Object.entries(ext.pasos || {})) datos.pasos[s] = Object.assign({}, p, datos.pasos[s] || {});
    // Datos del juego: nos quedamos con lo mejor de cada lado
    const je = ext.juego || {}, jm = datos.juego = datos.juego || {};
    jm.xp = Math.max(jm.xp || 0, je.xp || 0);
    for (const k of ['logros', 'actividades', 'exploradores', 'desafios', 'animo']) jm[k] = Object.assign({}, je[k] || {}, jm[k] || {});
    jm.c = jm.c || {};
    for (const [k, v] of Object.entries(je.c || {})) jm.c[k] = Math.max(jm.c[k] || 0, v);
    jm.otorgado = jm.otorgado || {};
    for (const [k, v] of Object.entries(je.otorgado || {})) jm.otorgado[k] = Math.max(jm.otorgado[k] || 0, v);
    jm.kahoots = jm.kahoots || {};
    for (const [k, v] of Object.entries(je.kahoots || {})) {
      const m = jm.kahoots[k] || { mejor: 0, mejorPct: 0, jugadas: 0 };
      jm.kahoots[k] = { mejor: Math.max(m.mejor, v.mejor || 0), mejorPct: Math.max(m.mejorPct, v.mejorPct || 0), jugadas: Math.max(m.jugadas, v.jugadas || 0), ultima: v.ultima || m.ultima };
    }
    if (je.racha && (!jm.racha || (je.racha.mejor || 0) > (jm.racha.mejor || 0))) jm.racha = Object.assign({}, jm.racha || {}, { mejor: je.racha.mejor });
    if (!jm.avatar && je.avatar) jm.avatar = je.avatar;
    const vistas = new Set(datos.coevaluaciones.map(c => c.fecha));
    for (const c of ext.coevaluaciones || []) if (!vistas.has(c.fecha)) datos.coevaluaciones.push(c);
    guardar(true);
    return ext;
  }

  function reiniciar() {
    datos = vacio();
    guardar(true);
  }

  /* ---------- Resumen para entregar ---------- */
  function resumenTexto() {
    const a = datos.alumno;
    const cal = calificacion();
    const j = datos.juego || {};
    const nv = PB.juego ? PB.juego.nivelInfo(j.xp || 0) : { nivel: 1, titulo: '' };
    const L = [];
    L.push(`${PB.config.nombreCurso}`);
    L.push(`Alumno: ${a.nombre || '(sin nombre)'}${a.grupo ? ' · Grupo: ' + a.grupo : ''}`);
    L.push(`Fecha: ${PB.util.fechaCorta(PB.util.hoyISO())}`);
    L.push(`Nivel ${nv.nivel} (${nv.titulo}) · ${j.xp || 0} XP · ${Object.keys(j.logros || {}).length} logros · mejor racha ${(j.racha && j.racha.mejor) || 0} días`);
    L.push('');
    L.push('MISIONES');
    for (const s of PB.curso.sesiones) {
      const partes = [];
      if (s.mision) { const n = mejorNivel(s.mision.id); partes.push('misión: ' + (n ? `${n} ${'★'.repeat(ESTRELLAS[n])}` : 'pendiente')); }
      if (s.proyecto) { const e = estadoReto(s.proyecto.id); partes.push('proyecto: ' + (e.superado ? `entregado (${e.requisitosCumplidos || 0}/${e.requisitosTotal || '?'})` : e.requisitosCumplidos ? `en proceso (${e.requisitosCumplidos}/${e.requisitosTotal})` : 'pendiente')); }
      if (s.retos && s.retos.length) partes.push(`retos ${s.retos.filter(r => superado(r.id)).length}/${s.retos.length}`);
      if (s.actividades && s.actividades.length) partes.push(`actividades ${s.actividades.filter(x => j.actividades && j.actividades[x.id]).length}/${s.actividades.length}`);
      const k = j.kahoots && j.kahoots['m' + s.numero];
      if (s.kahoot) partes.push('kahoot ' + (k ? Math.round(k.mejorPct * 100) + ' %' : '—'));
      const animo = j.animo && j.animo[s.numero];
      if (animo) partes.push('ánimo ' + animo);
      L.push(`  ${s.numero}. ${s.titulo}: ${partes.join(' · ') || '—'}`);
    }
    const diag = prueba('diagnostica'), fin = prueba('final');
    L.push('');
    L.push('PRUEBAS DE LECTURA DE CÓDIGO');
    L.push(`  Diagnóstica: ${diag ? diag.puntaje + '/' + diag.total : 'sin presentar'}`);
    L.push(`  Final: ${fin ? fin.puntaje + '/' + fin.total : 'sin presentar'}`);
    if (datos.coevaluaciones.length) {
      L.push('');
      L.push('COEVALUACIONES REALIZADAS');
      for (const c of datos.coevaluaciones) L.push(`  A ${c.companero}: ${Object.entries(c.criterios || {}).map(([k, v]) => k + ' ' + v).join(', ')}`);
    }
    L.push('');
    L.push('INSIGNIAS: ' + (PB.curso.unidades.filter(u => tieneInsignia(u.numero)).map(u => u.insignia).join(', ') || 'ninguna todavía'));
    L.push('');
    L.push('CALIFICACIÓN ESTIMADA (la definitiva la asigna el docente)');
    L.push(`  Retos de programación (${cal.pesos.retos} %): ${cal.retos}`);
    L.push(`  Actividades interactivas (${cal.pesos.actividades} %): ${cal.actividades}`);
    L.push(`  Kahoots (${cal.pesos.kahoots} %): ${cal.kahoots}`);
    L.push(`  Proyecto final (${cal.pesos.proyectoFinal} %): requisitos ${cal.final.cumplidos}/${cal.final.total} (se evalúa con rúbrica)`);
    L.push(`  Estimado: ${cal.total}/100`);
    return L.join('\n');
  }

  return {
    cargar, guardar, alumno, fijarAlumno,
    estadoReto, sumarIntento, marcarReto, mejorNivel, superado,
    borrador, guardarBorrador, respuesta, responder, prueba, guardarPrueba, agregarCoevaluacion,
    marcarPaso, pasoVisto, registrarEjecucion, ejecucionOk,
    estrellasSesion, revisarInsignias, tieneInsignia, calificacion, guardarRequisitos, principalDe,
    exportar, codigoProgreso, leerExterno, importar, reiniciar, resumenTexto,
    alCambiar: (fn) => alCambiar.push(fn),
    get datos() { return datos; },
    NIVELES, ESTRELLAS
  };
})();
