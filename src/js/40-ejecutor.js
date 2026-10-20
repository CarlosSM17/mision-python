/* =========================================================================
 * 40-ejecutor.js — Ejecuta Python en el navegador con Skulpt.
 *   · interactivo: la consola pide los datos de input()
 *   · paso a paso: pausa en cada línea y muestra las variables
 *   · prueba: entradas y números «al azar» fijos, para el verificador
 * ========================================================================= */
'use strict';

PB.ejecutor = (() => {
  const DETENIDO = '__PB_DETENIDO__';
  const SIN_ENTRADAS = '__PB_SIN_ENTRADAS__';
  const MAX_SALIDA = 60000;

  let ocupado = false;
  let detenerSolicitado = false;
  let rechazarEntrada = null;
  let pasoPendiente = null;     // {continuar, rechazar} cuando está en pausa
  let pausado = false;
  let retardoPaso = 600;

  function disponible() {
    return typeof window.Sk !== 'undefined' && Sk.misceval && Sk.importMainWithBody;
  }

  function leerModulo(nombre) {
    const archivos = (window.PB_STDLIB && window.PB_STDLIB.files) || (Sk.builtinFiles && Sk.builtinFiles.files) || {};
    if (archivos[nombre] === undefined) throw "File not found: '" + nombre + "'";
    return archivos[nombre];
  }

  function reprCorto(v) {
    let r;
    try {
      r = Sk.misceval.objectRepr(v);
      if (typeof r !== 'string') r = r && r.v !== undefined ? r.v : String(r);
    } catch (e) { r = '?'; }
    return r.length > 80 ? r.slice(0, 77) + '…' : r;
  }

  function tipoDe(v) {
    try { return (v.tp$name || (v.ob$type && v.ob$type.tp$name) || '').toString(); } catch (e) { return ''; }
  }

  function leerVariables(dic) {
    const r = [];
    if (!dic) return r;
    for (const k of Object.keys(dic)) {
      if (k.startsWith('__') || k.startsWith('$')) continue;
      const v = dic[k];
      if (v === undefined || v === null) continue;
      const t = tipoDe(v);
      if (t === 'module') continue;
      if (t === 'function') { r.push({ nombre: k, tipo: 'función', valor: k + '()' }); continue; }
      r.push({ nombre: k, tipo: t, valor: reprCorto(v) });
    }
    return r;
  }

  function preludioAzar(azar) {
    const cola = JSON.stringify(azar);
    return 'import random as __pb_r; __pb_q = ' + cola +
      '; __pb_r.randint = lambda a, b: __pb_q.pop(0) if __pb_q else a' +
      '; __pb_r.choice = lambda s: __pb_q.pop(0) if __pb_q else s[0]' +
      '; __pb_r.shuffle = lambda s: None; __pb_r.random = lambda: 0.5\n';
  }

  function extraerError(e, desfase) {
    const texto = String(e && e.toString ? e.toString() : e);
    if (texto.includes(DETENIDO) || detenerSolicitado) return { tipo: 'Detenido', mensaje: '', linea: null, original: '' };
    if (texto.includes(SIN_ENTRADAS)) return { tipo: 'EntradasAgotadas', mensaje: '', linea: null, original: '' };
    let tipo = 'Error', mensaje = texto, linea = null;
    try {
      if (window.Sk && e instanceof Sk.builtin.BaseException) {
        tipo = String(e.tp$name || (e.constructor && e.constructor.tp$name) || 'Error');
        if (e.args && e.args.v && e.args.v.length) {
          const a = e.args.v[0];
          mensaje = a && a.v !== undefined ? String(a.v) : String(a);
        } else mensaje = '';
        if (e.traceback && e.traceback.length) {
          const marco = e.traceback.find(t => t.filename && t.filename.indexOf('<stdin>') === 0) || e.traceback[0];
          linea = marco.lineno;
        }
      } else if (e instanceof Error) {
        tipo = 'ErrorInterno';
        mensaje = e.message;
      }
    } catch (x) { /* nos quedamos con el texto */ }
    if (linea !== null && desfase) linea -= desfase;
    if (linea !== null && linea < 1) linea = null;
    if (tipo === 'TimeoutError' || tipo === 'TimeLimitError') tipo = 'TiempoAgotado';
    return { tipo, mensaje, linea, original: tipo === 'TiempoAgotado' ? 'TimeLimitError: ' + mensaje : (tipo + (mensaje ? ': ' + mensaje : '')) };
  }

  /**
   * Ejecuta código Python.
   * opciones:
   *   entradas: [..]       → modo prueba (si se acaban, error EntradasAgotadas)
   *   azar: [..]           → valores fijos para random.randint / random.choice
   *   alSalida(t)          → cada fragmento impreso (interactivo)
   *   alEntrada(prompt)    → Promise<string> (interactivo)
   *   paso: {retardo, alLinea(linea, vars, locales)} → paso a paso
   *   limiteMs             → tiempo máximo de cálculo
   */
  async function ejecutar(codigo, opciones = {}) {
    if (!disponible()) {
      return { ok: false, salida: '', salidaPantalla: '', error: { tipo: 'SinInterprete', mensaje: '', linea: null, original: '' } };
    }
    if (ocupado) return { ok: false, salida: '', salidaPantalla: '', error: { tipo: 'Ocupado', mensaje: '', linea: null, original: '' } };
    ocupado = true;
    detenerSolicitado = false;
    pausado = false;
    pasoPendiente = null;

    const modoPrueba = Array.isArray(opciones.entradas);
    const entradas = modoPrueba ? opciones.entradas.map(String) : [];
    let usadas = 0;
    let salida = '';            // solo lo que imprime el programa con print (lo que revisan las pruebas)
    let pantalla = '';          // como se vería en la terminal (mensajes de input y lo que se escribió)
    let excesiva = false;

    const azar = opciones.azar && opciones.azar.length ? opciones.azar : null;
    const preludio = azar ? preludioAzar(azar) : '';
    const desfase = preludio ? 1 : 0;
    const fuente = preludio + codigo;
    const limite = opciones.limiteMs || (modoPrueba ? 4000 : 20000);
    retardoPaso = opciones.paso ? (opciones.paso.retardo ?? 600) : 0;

    const escribir = (t) => {
      if (excesiva) return;
      salida += t;
      pantalla += t;
      if (salida.length > MAX_SALIDA) {
        excesiva = true;
        Sk.execLimit = 1;
      }
      if (opciones.alSalida) opciones.alSalida(t);
    };

    const entrada = (prompt) => {
      const p = prompt === undefined || prompt === null ? '' : String(prompt);
      if (p) {
        pantalla += p;
        if (opciones.alSalida) opciones.alSalida(p);
      }
      if (modoPrueba) {
        if (usadas >= entradas.length) return Promise.reject(new Error(SIN_ENTRADAS));
        const v = entradas[usadas++];
        pantalla += v + '\n';
        return Promise.resolve(v);
      }
      return new Promise((resolve, reject) => {
        rechazarEntrada = reject;
        Promise.resolve(opciones.alEntrada ? opciones.alEntrada(p) : '').then(v => {
          rechazarEntrada = null;
          const valor = PB.util.quitarComillasTipograficas(String(v ?? ''));
          pantalla += valor + '\n';
          usadas++;
          Sk.execStart = Date.now();   // el tiempo de escribir no cuenta
          resolve(valor);
        }, err => { rechazarEntrada = null; reject(err); });
      });
    };

    Sk.configure({
      output: escribir,
      read: leerModulo,
      __future__: Sk.python3,
      inputfun: entrada,
      inputfunTakesPrompt: true,
      execLimit: limite,
      yieldLimit: 100,
      // En paso a paso, los bucles también pausan en su encabezado en cada vuelta
      killableWhile: !!opciones.paso,
      killableFor: !!opciones.paso,
      debugging: !!opciones.paso,
      breakpoints: () => true
    });
    Sk.execLimit = limite;
    Sk.execStart = Date.now();

    const manejadores = {};
    if (opciones.paso) {
      let ultimaLinea = null;
      const manejar = (susp) => new Promise((resolve, reject) => {
        if (detenerSolicitado) { reject(new Error(DETENIDO)); return; }
        let s = susp, modulo = null, profundo = null;
        while (s instanceof Sk.misceval.Suspension) {
          if (s.$loc && Object.prototype.hasOwnProperty.call(s.$loc, '__name__')) modulo = s;
          if (s.$lineno) profundo = s;
          s = s.child;
        }
        const linea = profundo ? profundo.$lineno - desfase : null;
        const continuar = () => {
          pasoPendiente = null;
          Sk.execStart = Date.now();
          try { resolve(susp.resume()); } catch (e) { reject(e); }
        };
        // Misma línea dos veces seguidas (encabezado de bucle): no pausar de nuevo
        if (linea === ultimaLinea && !pausado) { setTimeout(continuar, 0); return; }
        ultimaLinea = linea;
        const vars = modulo ? leerVariables(modulo.$loc) : [];
        let locales = null;
        if (profundo && profundo !== modulo && profundo.$tmps) {
          locales = leerVariables(Object.fromEntries(Object.entries(profundo.$tmps).filter(([k]) => !k.startsWith('$'))));
        }
        try { opciones.paso.alLinea(linea, vars, locales); } catch (e) { /* la interfaz no debe romper la ejecución */ }
        pasoPendiente = { continuar, rechazar: reject };
        if (!pausado) setTimeout(() => { if (pasoPendiente && pasoPendiente.continuar === continuar && !pausado) continuar(); }, retardoPaso);
      });
      manejadores['Sk.debug'] = manejar;
      manejadores['Sk.delay'] = manejar;
    }

    let error = null;
    try {
      await Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, fuente, true), manejadores);
    } catch (e) {
      error = extraerError(e, desfase);
    }
    if (excesiva) error = { tipo: 'SalidaExcesiva', mensaje: '', linea: null, original: '' };
    ocupado = false;
    rechazarEntrada = null;
    pasoPendiente = null;
    const fueDetenido = error && error.tipo === 'Detenido';
    detenerSolicitado = false;
    return { ok: !error, salida, salidaPantalla: pantalla, error, detenido: fueDetenido, entradasUsadas: usadas };
  }

  function detener() {
    if (!ocupado) return;
    detenerSolicitado = true;
    try { Sk.execLimit = 1; } catch (e) { /* nada */ }
    if (rechazarEntrada) rechazarEntrada(new Error(DETENIDO));
    if (pasoPendiente) pasoPendiente.rechazar(new Error(DETENIDO));
  }

  function pausar(valor) {
    pausado = valor;
    if (!valor && pasoPendiente) pasoPendiente.continuar();
  }

  function siguientePaso() {
    if (pasoPendiente) pasoPendiente.continuar();
  }

  function fijarRetardo(ms) { retardoPaso = ms; }

  return {
    ejecutar, detener, pausar, siguientePaso, fijarRetardo, disponible,
    get ocupado() { return ocupado; },
    get pausado() { return pausado; }
  };
})();
