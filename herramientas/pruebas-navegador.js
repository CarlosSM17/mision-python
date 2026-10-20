/* Banco de pruebas que corre dentro del navegador (lo usa probar_plataforma.py).
 * 1. Contenido en Skulpt: soluciones de retos (y su conversión a bloques), actividades,
 *    preguntas de Kahoot con «salidaEsRespuesta», ejemplos de la teoría y prueba de lectura.
 * 2. Interfaz: pinta cada pantalla, cada paso de cada misión, cada tarjeta y cada explorador.
 * 3. Juego: resuelve cada actividad con sus respuestas declaradas (debe aparecer «¡Lo lograste!»)
 *    y juega un Kahoot completo respondiendo bien. */
(async function () {
  const salida = { pruebas: 0, retos: 0, actividades: 0, pantallas: 0, fallos: [], avisos: [], tiempo: 0 };
  const t0 = Date.now();
  const fallo = (m) => salida.fallos.push(m);
  const aviso = (m) => salida.avisos.push(m);
  const sinHuecos = (c) => c.replace(/«([^»]*)»/g, (_, t) => t || '___');
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  const txt = (html) => { const d = document.createElement('div'); d.innerHTML = String(html); return d.textContent; };
  const exacta = (s) => String(s).replace(/\s+$/gm, '').replace(/^\n+|\n+$/g, '');
  const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find(b => b.textContent.includes(texto));
  window.addEventListener('error', (e) => fallo('JS: ' + e.message + ' @' + (e.filename || '').slice(-30) + ':' + e.lineno));
  window.addEventListener('unhandledrejection', (e) => fallo('Promesa: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));

  try {
    PB.blockly.configurar();
    PB.progreso.cargar();
    PB.juego.estado();
    PB.juego.estado().sonido = false;
    const ws = new Blockly.Workspace();
    const regenerar = (codigo) => { PB.conv.cargar(ws, codigo); return PB.gen.generar(ws); };
    const correr = (codigo, entradas, azar) => PB.ejecutor.ejecutar(codigo, { entradas: entradas || [], azar: azar || [] });

    /* ===================== 1. Contenido en Skulpt ===================== */
    for (const s of PB.curso.sesiones) {
      const donde = 'M' + s.numero;
      for (const [i, t] of (s.teoria || []).entries()) {
        const et = `${donde} tarjeta ${i + 1}`;
        if (t.tipo === 'bloques' || t.tipo === 'codigo') {
          const d = PB.py.revisarSintaxis(t.codigo);
          if (d) fallo(`${et}: ${d.mensaje} (línea ${d.linea})`);
        }
        let cod = null, esperado = null;
        if (t.tipo === 'idea' && t.codigo && t.salida !== undefined) { cod = t.codigo; esperado = t.salida; }
        if (t.tipo === 'ilustracion' && t.nombre === 'consola') { cod = t.datos.codigo; esperado = t.datos.salida; }
        if (cod) {
          const r = await correr(cod);
          if (r.error) fallo(`${et}: ${r.error.tipo} ${r.error.mensaje}`);
          else if (exacta(r.salida) !== exacta(esperado)) fallo(`${et}: Skulpt muestra ${JSON.stringify(r.salida)} y la tarjeta dice ${JSON.stringify(esperado)}`);
        }
      }
      if (s.ejemplo) {
        try {
          const g = regenerar(s.ejemplo.codigo);
          const r = await correr(g.codigo, s.ejemplo.entradasPrueba, s.ejemplo.azarPrueba);
          if (r.error) fallo(`${donde} ejemplo: ${r.error.tipo} ${r.error.mensaje}`);
        } catch (e) { fallo(`${donde} ejemplo: ${e.message}`); }
      }
      for (const [i, q] of ((s.kahoot && s.kahoot.preguntas) || []).entries()) {
        if (!q.salidaEsRespuesta) continue;
        salida.pruebas++;
        const r = await correr(q.codigo, q.entradas, q.azar);
        if (r.error) { fallo(`${donde} kahoot ${i + 1}: ${r.error.tipo} ${r.error.mensaje}`); continue; }
        if (exacta(r.salida) !== exacta(txt(q.opciones[q.correcta]))) fallo(`${donde} kahoot ${i + 1}: Skulpt muestra ${JSON.stringify(r.salida)}, la respuesta dice ${JSON.stringify(q.opciones[q.correcta])}`);
      }
      for (const a of s.actividades || []) {
        const et = `${donde} ${a.id} (${a.tipo})`;
        const corre = a.ejecutable !== false;
        if (a.tipo === 'salida') {
          const r = await correr(a.codigo, a.entradas, a.azar);
          if (r.error) fallo(`${et}: ${r.error.tipo} ${r.error.mensaje}`);
          else if (exacta(r.salida) !== exacta(a.respuesta)) fallo(`${et}: Skulpt muestra ${JSON.stringify(r.salida)} y la respuesta es ${JSON.stringify(a.respuesta)}`);
        } else if (a.tipo === 'completar' && corre) {
          const cod = a.codigo.replace(/⟦([^⟧]*)⟧/g, (_, x) => x.split('|')[0]);
          const r = await correr(cod, a.entradas, a.azar);
          if (r.error) fallo(`${et}: el código completado falla en Skulpt: ${r.error.tipo} ${r.error.mensaje}`);
        } else if (a.tipo === 'ordenar' && corre) {
          const r = await correr(a.lineas.join('\n'), a.entradas, a.azar);
          if (r.error) fallo(`${et}: la solución falla en Skulpt: ${r.error.tipo} ${r.error.mensaje}`);
        } else if (a.tipo === 'error' && a.tipoError !== 'logico') {
          const r = await correr(a.codigo, a.entradas, a.azar);
          const lineas = new Set([...(a.lineas || [a.linea]), a.lineaError].filter(Boolean));
          if (!r.error) fallo(`${et}: Skulpt no marca ningún error`);
          else if (((PB.errores.explicar(r.error, a.codigo) || {}).tipo || r.error.tipo) !== a.tipoError) aviso(`${et}: la plataforma muestra ${(PB.errores.explicar(r.error, a.codigo) || {}).tipo || r.error.tipo} (se pregunta por ${a.tipoError})`);
          else if (r.error.linea && !lineas.has(r.error.linea)) aviso(`${et}: Skulpt marca la línea ${r.error.linea}`);
        }
      }
      // Retos
      const retos = [];
      for (const r of s.retos || []) retos.push(['reto', r, null]);
      if (s.mision) for (const n of ['explorador', 'programador', 'maestro']) if (s.mision.niveles && s.mision.niveles[n]) retos.push(['mision', s.mision, n]);
      if (s.extra) retos.push(['extra', s.extra, null]);
      if (s.proyecto) {
        for (const op of s.proyecto.opciones || []) {
          if (op.inicio) { const d = PB.py.revisarSintaxis(sinHuecos(op.inicio)); if (d) fallo(`${donde} proyecto ${op.id} inicio: ${d.mensaje}`); }
          if (op.solucion) {
            const malos = PB.verificador.revisarRestricciones(op.solucion, s.proyecto.requiere || []).filter(x => !x.ok);
            if (malos.length) fallo(`${donde} proyecto ${op.id}: la solución no cumple ${malos.map(x => x.texto).join(', ')}`);
            if (op.entradasPrueba) {
              const r = await correr(op.solucion, op.entradasPrueba, op.azarPrueba);
              if (r.error) fallo(`${donde} proyecto ${op.id}: ${r.error.tipo} ${r.error.mensaje} línea ${r.error.linea}`);
            }
          }
        }
      }
      for (const [, reto, nivel] of retos) {
        salida.retos++;
        const etiqueta = `${donde} ${reto.id}${nivel ? ' ' + nivel : ''}`;
        const n = (reto.niveles && nivel && reto.niveles[nivel]) || {};
        const sol = n.solucion || reto.solucion;
        const inicio = n.inicio !== undefined ? n.inicio : (reto.inicio || '');
        const cfg = PB.verificador.configuracion(reto, nivel);
        salida.pruebas += cfg.pruebas.length;
        if (sol) {
          const r = await PB.verificador.verificar(sol, reto, nivel);
          if (!r.ok) fallo(`${etiqueta}: la solución NO pasa en Skulpt → ${resumen(r)}`);
          let g;
          try { g = regenerar(sol); } catch (e) { fallo(`${etiqueta}: la solución no se convierte a bloques: ${e.message}`); }
          if (g) {
            const r2 = await PB.verificador.verificar(g.codigo, reto, nivel);
            if (!r2.ok) fallo(`${etiqueta}: la solución regenerada desde bloques NO pasa → ${resumen(r2)}`);
          }
        }
        if (inicio && inicio.trim()) {
          try { regenerar(inicio); } catch (e) { fallo(`${etiqueta}: el código inicial no se convierte a bloques: ${e.message}`); }
          const texto = sinHuecos(inicio);
          const d = PB.py.revisarSintaxis(texto);
          if (d) fallo(`${etiqueta}: el código inicial tiene error de sintaxis: ${d.mensaje} (línea ${d.linea})`);
          else if (cfg.pruebas.length) {
            const r = await PB.verificador.verificar(texto, reto, nivel);
            if (r.ok) aviso(`${etiqueta}: el código inicial ya pasa el reto`);
          }
        }
      }
    }
    // Prueba de lectura
    for (const [i, it] of PB.curso.prueba.items.entries()) {
      const r = await correr(it.codigo, it.entradasPrueba);
      if (r.error) { fallo(`Prueba de lectura ${i + 1}: ${r.error.tipo}`); continue; }
      if (it.verificarSalida === false) continue;
      const esperado = PB.util.normalizar(it.opciones[it.correcta]);
      const obtenido = PB.util.normalizar(r.salida.replace(it.quitarDeSalida || '', ''));
      if (!obtenido.endsWith(esperado)) fallo(`Prueba de lectura ${i + 1}: la opción correcta no coincide con la salida «${r.salida}»`);
    }

    /* ===================== 2. Interfaz ===================== */
    const cont = document.createElement('main');
    cont.className = 'vista';
    document.body.appendChild(cont);
    const pantalla = async (nombre, fn) => {
      cont.innerHTML = '';
      cont.className = 'vista';
      salida.pantallas++;
      try { await fn(cont); } catch (e) { fallo(`Pantalla ${nombre}: ${e && e.stack || e}`); }
      await esperar(30);
      if (cont.textContent.includes('Algo salió mal')) fallo(`Pantalla ${nombre}: muestra «Algo salió mal»`);
    };
    for (const [nombre, fn] of Object.entries({ mapa: V => V.mapa(cont), logros: V => V.logros(cont), perfil: V => V.perfil(cont), desafio: V => V.desafio(cont),
      granKahoot: V => V.granKahoot(cont), granKahootEquipos: V => V.granKahoot(cont, 'equipos'), glosario: V => V.glosario(cont), progreso: V => V.progreso(cont),
      certificado: V => V.certificado(cont), docente: V => V.docente(cont) })) {
      await pantalla(nombre, () => fn(PB.vistas));
    }
    for (const s of PB.curso.sesiones) {
      for (const p of PB.vistas.pasosDe(s)) await pantalla(`M${s.numero}/${p.id}`, () => PB.vistas.mision(cont, s.numero, p.id));
      if (s.kahoot) await pantalla(`M${s.numero}/kahoot/equipos`, () => PB.vistas.mision(cont, s.numero, 'kahoot', 'equipos'));
      for (const [i, t] of (s.teoria || []).entries()) {
        try { const n = PB.teoria.tarjeta(t, []); cont.appendChild(n); } catch (e) { fallo(`M${s.numero} tarjeta ${i + 1} (${t.tipo}): ${e.message}`); }
      }
    }
    for (const n of ['print', 'variables', 'tipos', 'operadores', 'texto', 'comparar', 'logica', 'si', 'elif', 'range', 'while', 'listas', 'recorrer', 'funciones', 'input']) {
      cont.innerHTML = '';
      try {
        PB.exploradores.crear(n, cont, {});
        if (!cont.querySelector('.exp')) fallo(`Explorador ${n}: no se pintó`);
        // Interactúa: cambia el primer campo y pulsa los botones
        const campo = cont.querySelector('input'); if (campo) { campo.value = '5'; campo.dispatchEvent(new Event('input', { bubbles: true })); }
        for (const b of [...cont.querySelectorAll('button')].slice(0, 4)) b.click();
        await esperar(50);
      } catch (e) { fallo(`Explorador ${n}: ${e.message}`); }
    }
    // Un taller de cada tipo
    const s2 = PB.curso.sesiones.find(x => x.numero === 2);
    await pantalla('taller reto', () => PB.vistas.mision(cont, 2, 'programa', 'reto', '1'));
    await pantalla('taller misión', () => PB.vistas.mision(cont, 2, 'programa', 'mision', 'programador'));
    await pantalla('taller extra', () => PB.vistas.mision(cont, 2, 'programa', 'extra'));
    await pantalla('taller observa', () => PB.vistas.mision(cont, 2, 'observa', 'taller'));
    await pantalla('taller proyecto', () => PB.vistas.mision(cont, 15, 'programa', 'proyecto', 'ppt'));
    if (!s2) fallo('No existe la misión 2');

    /* ===================== 3. Resolver cada actividad ===================== */
    for (const s of PB.curso.sesiones) {
      for (const a of s.actividades || []) {
        cont.innerHTML = '';
        salida.actividades++;
        const et = `M${s.numero} ${a.id} (${a.tipo})`;
        try {
          PB.vistas.mision(cont, s.numero, 'juega', a.id);
          const raiz = cont.querySelector('.actividad');
          if (!raiz) { fallo(`${et}: no se abrió`); continue; }
          await resolver(raiz, a, et);
          await esperar(60);
          if (!raiz.querySelector('.act-exito')) {
            const m = raiz.querySelector('.act-mensaje');
            fallo(`${et}: no se pudo resolver con sus respuestas${m && m.textContent ? ' → ' + m.textContent : ''}`);
          }
        } catch (e) { fallo(`${et}: ${e && e.stack || e}`); }
      }
    }

    /* ===================== 4. Un Kahoot completo ===================== */
    const sK = PB.curso.sesiones.find(x => x.numero === 4);
    cont.innerHTML = '';
    const preguntas = sK.kahoot.preguntas;
    PB.kahoot.jugar(cont, { titulo: 'Prueba', preguntas, clave: 'prueba-automatica', xpMax: 150 });
    cont.querySelector('.kh-btn-jugar').click();
    await esperar(3400);
    for (const [i, q] of preguntas.entries()) {
      const ops = cont.querySelectorAll('.kh-opcion');
      if (!ops.length) { fallo(`Kahoot: no apareció la pregunta ${i + 1}`); break; }
      ops[q.correcta].click();
      await esperar(80);
      const sig = cont.querySelector('.kh-btn-sig');
      if (!sig) { fallo(`Kahoot: no apareció «Siguiente» en la pregunta ${i + 1}`); break; }
      sig.click();
    }
    await esperar(100);
    const fin = cont.querySelector('.kh-final');
    if (!fin) fallo('Kahoot: no apareció la pantalla final');
    else if (!fin.textContent.includes(`${preguntas.length}/${preguntas.length}`)) fallo('Kahoot: respondiendo todo bien no se obtuvo el 100 %: ' + fin.textContent.slice(0, 120));
    else if (!(PB.juego.estado().kahoots['prueba-automatica'] || {}).jugadas) fallo('Kahoot: no se registró la partida');

    // Kahoot en equipos: configurar y avanzar una pregunta
    cont.innerHTML = '';
    PB.kahoot.equipos(cont, { titulo: 'Prueba equipos', preguntas: preguntas.slice(0, 2), alSalir: () => {} });
    const empezarEq = [...cont.querySelectorAll('button')].find(b => /Empezar|Comenzar|Jugar/i.test(b.textContent));
    if (!empezarEq) fallo('Kahoot en equipos: no hay botón para empezar');
    else {
      empezarEq.click();
      await esperar(3400);
      if (!cont.querySelector('.kh-pregunta')) fallo('Kahoot en equipos: no apareció la primera pregunta');
    }
  } catch (e) {
    fallo('EXCEPCIÓN: ' + (e && e.stack || e));
  }
  salida.tiempo = Date.now() - t0;
  const pre = document.createElement('pre');
  pre.id = 'resultado-pruebas';
  pre.textContent = JSON.stringify(salida);
  document.body.appendChild(pre);

  /* ---------- Resolver una actividad como lo haría un alumno ---------- */
  async function resolver(raiz, a, et) {
    const comprobar = () => { const b = boton(raiz, 'Comprobar'); if (b) b.click(); else fallo(`${et}: no hay botón Comprobar`); };
    const escribir = (inp, valor) => { inp.value = valor; inp.dispatchEvent(new Event('input', { bubbles: true })); };
    switch (a.tipo) {
      case 'ordenar': {
        const sol = a.lineas.map(l => ({ t: l.trim(), n: Math.round(l.match(/^ */)[0].length / 4) }));
        for (const x of sol) {
          const p = [...raiz.querySelectorAll('.ord-pieza')].find(b => b.textContent === x.t);
          if (!p) { fallo(`${et}: no encontré la pieza «${x.t}»`); return; }
          p.click();
        }
        if (a.sangria) {
          for (let k = 0; k < sol.length; k++) {
            for (let j = 0; j < sol[k].n; j++) raiz.querySelectorAll('.ord-linea')[k].querySelector('button[title="Agregar sangría"]').click();
          }
        }
        comprobar();
        break;
      }
      case 'error': {
        raiz.querySelectorAll('.err-linea')[(a.lineas || [a.linea])[0] - 1].click();
        if (a.tipoError !== 'logico') {
          const b = [...raiz.querySelectorAll('.err-tipos button')].find(x => x.textContent === a.tipoError);
          if (!b) { fallo(`${et}: no aparece la opción ${a.tipoError}`); return; }
          b.click();
        }
        break;
      }
      case 'completar': {
        const huecos = a.codigo.match(/⟦([^⟧]*)⟧/g).map(h => h.slice(1, -1).split('|')[0]);
        raiz.querySelectorAll('.comp-hueco').forEach((inp, k) => escribir(inp, huecos[k]));
        comprobar();
        break;
      }
      case 'clasificar': {
        for (const e of a.elementos) {
          const f = [...raiz.querySelectorAll('.cla-bandeja .cla-ficha')].find(x => x.textContent === e.texto);
          if (!f) { fallo(`${et}: no encontré «${e.texto}»`); return; }
          if (!f.classList.contains('sel')) f.click();
          raiz.querySelectorAll('.cla-caja')[a.categorias.findIndex(c => c.id === e.cat)].click();
        }
        comprobar();
        break;
      }
      case 'relacionar': {
        const textoDer = (t) => (a.codigoDer !== false ? t : txt(t));
        a.pares.forEach((par, i) => {
          raiz.querySelectorAll('.rel-col')[0].children[i].click();
          const d = [...raiz.querySelectorAll('.rel-col')[1].children].find(b => b.textContent === textoDer(par[1]));
          if (!d) fallo(`${et}: no encontré «${par[1]}»`); else d.click();
        });
        comprobar();
        break;
      }
      case 'salida': {
        if (a.opciones) raiz.querySelectorAll('.sal-opcion')[a.correcta].click();
        else { raiz.querySelector('.sal-texto').value = a.respuesta; comprobar(); }
        break;
      }
      case 'traza': {
        const valores = [];
        for (const f of a.filas) for (const v of a.variables) { const x = f.valores[v]; if (x !== '' && x !== undefined && x !== null) valores.push(String(x)); }
        raiz.querySelectorAll('.tra-input').forEach((inp, k) => escribir(inp, valores[k]));
        comprobar();
        break;
      }
      case 'vf': {
        boton(raiz, 'Empezar').click();
        for (const it of a.afirmaciones) {
          await esperar(30);
          raiz.querySelector(it.correcta ? '.vf-v' : '.vf-f').click();
          await esperar(800);
        }
        await esperar(200);
        break;
      }
      case 'memorama': {
        const lados = a.codigo || [];
        const texto = (par, lado) => (lados.includes(lado) ? par[lado] : txt(par[lado]));
        for (const par of a.pares) {
          const cartas = [...raiz.querySelectorAll('.mem-carta')];
          const c0 = cartas.find(c => !c.classList.contains('hecha') && c.querySelector('.mem-frente').textContent === texto(par, 0));
          const c1 = cartas.find(c => c !== c0 && !c.classList.contains('hecha') && c.querySelector('.mem-frente').textContent === texto(par, 1));
          if (!c0 || !c1) { fallo(`${et}: no encontré las cartas de «${par[0]}»`); return; }
          c0.click(); c1.click();
        }
        break;
      }
      case 'teclear': {
        const inp = raiz.querySelector('.tec-input');
        for (const l of a.lineas) escribir(inp, l);
        break;
      }
      default:
        fallo(`${et}: tipo sin simulación`);
    }
  }

  function resumen(r) {
    if (r.sintaxis) return r.sintaxis.titulo + ': ' + r.sintaxis.texto;
    const partes = [];
    if (r.huecos) partes.push(r.huecos + ' huecos');
    for (const x of r.restricciones) if (!x.ok) partes.push('restricción: ' + x.texto);
    for (const p of r.pruebas) if (!p.ok) partes.push(p.nombre + ': ' + p.detalle + ' | salida: ' + JSON.stringify(p.salida));
    return partes.join(' · ');
  }
})();
