/* =========================================================================
 * 00-base.js — Espacio de nombres, utilidades DOM, almacenamiento seguro,
 * ventanas modales, avisos, descarga y copia con alternativas.
 * Todo lo de la plataforma vive dentro del objeto global PB.
 * ========================================================================= */
'use strict';

const PB = window.PB = window.PB || {};

PB.util = (() => {
  /** Crea un elemento: el('div', {class: 'x', onclick: fn}, hijo1, 'texto', ...) */
  function el(tag, attrs, ...hijos) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'style' && typeof v === 'object') {
          // Las variables CSS (--c, --p…) solo se pueden fijar con setProperty
          for (const [p, x] of Object.entries(v)) {
            if (x === null || x === undefined) continue;
            if (p.startsWith('--')) e.style.setProperty(p, String(x));
            else e.style[p] = x;
          }
        }
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(e.dataset, v);
        else if (v === true) e.setAttribute(k, '');
        else e.setAttribute(k, v);
      }
    }
    agregar(e, hijos);
    return e;
  }

  function agregar(padre, hijos) {
    for (const h of hijos.flat(Infinity)) {
      if (h === null || h === undefined || h === false) continue;
      padre.appendChild(h instanceof Node ? h : document.createTextNode(String(h)));
    }
    return padre;
  }

  function vaciar(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Quita acentos, pasa a minúsculas y compacta espacios: para comparar salidas. */
  function normalizar(s) {
    return String(s ?? '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[¡¿]/g, '')
      .toLowerCase()
      .replace(/[ \t]+/g, ' ')
      .split('\n').map(l => l.trim()).join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function fechaCorta(iso) {
    if (!iso) return '';
    try {
      // «2026-10-01» sin hora se interpretaría en UTC (y saldría un día antes en México)
      const f = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T12:00:00') : new Date(iso);
      return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return iso.slice(0, 10); }
  }

  function hoyISO() { return new Date().toISOString(); }

  function clonar(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

  /** Distancia de edición, para sugerir nombres parecidos en NameError. */
  function distancia(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  function slug(s) {
    return normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'alumno';
  }

  return { el, agregar, vaciar, esc, normalizar, debounce, fechaCorta, hoyISO, clonar, distancia, slug };
})();

/* ---------- Almacenamiento: localStorage con respaldo en memoria ----------
 * Dentro del iframe de Google Sites, Safari puede bloquear o borrar el
 * almacenamiento. Nunca dejamos que eso rompa la plataforma.            */
PB.almacen = (() => {
  const memoria = {};
  let disponible = false;
  try {
    const k = '__pb_prueba__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    disponible = true;
  } catch (e) { disponible = false; }

  function leer(clave, porDefecto) {
    try {
      const v = disponible ? window.localStorage.getItem(clave) : memoria[clave];
      if (v === null || v === undefined) return porDefecto;
      return JSON.parse(v);
    } catch (e) { return porDefecto; }
  }

  function escribir(clave, valor) {
    const txt = JSON.stringify(valor);
    memoria[clave] = txt;
    if (!disponible) return false;
    try { window.localStorage.setItem(clave, txt); return true; } catch (e) { return false; }
  }

  function borrar(clave) {
    delete memoria[clave];
    try { if (disponible) window.localStorage.removeItem(clave); } catch (e) { /* nada */ }
  }

  function leerSesion(clave) {
    try { return window.sessionStorage.getItem(clave); } catch (e) { return memoria['s:' + clave] ?? null; }
  }
  function escribirSesion(clave, v) {
    memoria['s:' + clave] = v;
    try { window.sessionStorage.setItem(clave, v); } catch (e) { /* nada */ }
  }

  return { leer, escribir, borrar, leerSesion, escribirSesion, get disponible() { return disponible; } };
})();

/* ---------- Ventanas modales, avisos y diálogos propios ----------
 * window.prompt/alert pueden estar bloqueados en el iframe de Google Sites,
 * por eso usamos diálogos dentro de la página.                         */
PB.ui = (() => {
  const { el } = PB.util;
  let pila = [];

  function modal({ titulo, contenido, botones = [{ texto: 'Cerrar', tipo: 'primario' }], ancho, alCerrar, clase }) {
    return new Promise(resolve => {
      const fondo = el('div', { class: 'modal-fondo' });
      const caja = el('div', { class: 'modal' + (clase ? ' ' + clase : ''), role: 'dialog', 'aria-modal': 'true' });
      if (ancho) caja.style.maxWidth = ancho;
      const cerrar = (valor) => {
        fondo.remove();
        pila = pila.filter(p => p !== fondo);
        document.removeEventListener('keydown', teclas);
        if (alCerrar) alCerrar(valor);
        resolve(valor);
      };
      const teclas = (ev) => {
        if (pila[pila.length - 1] !== fondo) return;
        if (ev.key === 'Escape') cerrar(null);
      };
      if (titulo) caja.appendChild(el('h2', { class: 'modal-titulo' }, titulo));
      const cuerpo = el('div', { class: 'modal-cuerpo' });
      if (typeof contenido === 'function') contenido(cuerpo, cerrar);
      else if (contenido instanceof Node) cuerpo.appendChild(contenido);
      else if (contenido) cuerpo.innerHTML = contenido;
      caja.appendChild(cuerpo);
      if (botones && botones.length) {
        const pie = el('div', { class: 'modal-pie' });
        for (const b of botones) {
          pie.appendChild(el('button', {
            class: 'btn ' + (b.tipo === 'primario' ? 'btn-primario' : b.tipo === 'peligro' ? 'btn-peligro' : 'btn-secundario'),
            onclick: () => {
              if (b.accion) {
                const r = b.accion(cuerpo);
                if (r === false) return;
                cerrar(r === undefined ? (b.valor ?? b.texto) : r);
              } else cerrar(b.valor ?? b.texto);
            }
          }, b.texto));
        }
        caja.appendChild(pie);
      }
      fondo.appendChild(caja);
      fondo.addEventListener('mousedown', ev => { if (ev.target === fondo) cerrar(null); });
      document.body.appendChild(fondo);
      pila.push(fondo);
      document.addEventListener('keydown', teclas);
      const foco = caja.querySelector('input, textarea, select') || caja.querySelector('.modal-pie .btn-primario');
      if (foco) setTimeout(() => foco.focus(), 30);
    });
  }

  function alerta(mensaje, titulo) {
    return modal({ titulo: titulo || 'Aviso', contenido: el('p', {}, mensaje), botones: [{ texto: 'Entendido', tipo: 'primario' }] });
  }

  function confirmar(mensaje, titulo, textoSi = 'Sí', textoNo = 'Cancelar', peligro = false) {
    return modal({
      titulo: titulo || 'Confirmar',
      contenido: el('p', {}, mensaje),
      botones: [{ texto: textoNo, valor: false }, { texto: textoSi, valor: true, tipo: peligro ? 'peligro' : 'primario' }]
    }).then(v => v === true);
  }

  /** Pide un texto. validar(texto) devuelve un mensaje de error o null. */
  function pedirTexto(mensaje, porDefecto = '', { titulo, validar, placeholder } = {}) {
    let entrada, error;
    return modal({
      titulo: titulo || 'Escribe',
      contenido: (c) => {
        c.appendChild(el('label', { class: 'campo-etiqueta' }, mensaje));
        entrada = el('input', {
          type: 'text', class: 'campo', value: porDefecto, placeholder: placeholder || '',
          autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off'
        });
        error = el('p', { class: 'campo-error' });
        entrada.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') { ev.preventDefault(); c.parentNode.querySelector('.modal-pie .btn-primario').click(); }
        });
        c.appendChild(entrada);
        c.appendChild(error);
      },
      botones: [
        { texto: 'Cancelar', valor: null },
        {
          texto: 'Aceptar', tipo: 'primario', accion: () => {
            const v = PB.util.quitarComillasTipograficas(entrada.value.trim());
            const msg = validar ? validar(v) : null;
            if (msg) { error.textContent = msg; entrada.focus(); return false; }
            return v;
          }
        }
      ]
    });
  }

  let contAvisos = null;
  function aviso(mensaje, tipo = 'info', ms = 3200) {
    if (!contAvisos) {
      contAvisos = el('div', { class: 'avisos', 'aria-live': 'polite' });
      document.body.appendChild(contAvisos);
    }
    const t = el('div', { class: 'aviso aviso-' + tipo }, mensaje);
    contAvisos.appendChild(t);
    setTimeout(() => t.classList.add('saliendo'), ms);
    setTimeout(() => t.remove(), ms + 400);
  }

  return { modal, alerta, confirmar, pedirTexto, aviso };
})();

/* Las teclas del iPad pueden escribir comillas “tipográficas”: las cambiamos
 * por comillas rectas, que son las que entiende Python. */
PB.util.quitarComillasTipograficas = (s) =>
  String(s).replace(/[“”„‟″«»]/g, '"').replace(/[‘’‚‛′]/g, "'");

/* ---------- Descargar y copiar, con alternativas ----------
 * El iframe de Google Sites puede bloquear descargas o el portapapeles;
 * en ese caso mostramos el texto para copiarlo a mano. */
PB.archivos = (() => {
  const { el } = PB.util;

  function mostrarParaCopiar(texto, titulo, nota) {
    return PB.ui.modal({
      titulo: titulo || 'Copia este texto',
      ancho: '720px',
      contenido: (c) => {
        if (nota) c.appendChild(el('p', { class: 'nota' }, nota));
        const ta = el('textarea', { class: 'campo campo-codigo', rows: '14', readonly: true, spellcheck: 'false' });
        ta.value = texto;
        c.appendChild(ta);
        setTimeout(() => { ta.focus(); ta.select(); }, 60);
      },
      botones: [{ texto: 'Cerrar', tipo: 'primario' }]
    });
  }

  function descargar(nombre, contenido, tipo = 'text/plain') {
    try {
      const blob = new Blob([contenido], { type: tipo + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: nombre, style: { display: 'none' } });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      PB.ui.aviso('Descarga iniciada: ' + nombre, 'exito');
      // Si el navegador bloqueó la descarga no hay forma de saberlo con certeza:
      // ofrecemos siempre la opción de ver el texto.
      return true;
    } catch (e) {
      mostrarParaCopiar(contenido, nombre, 'Tu navegador no permitió descargar el archivo. Copia el texto y guárdalo con el nombre «' + nombre + '».');
      return false;
    }
  }

  async function copiar(texto, titulo) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        PB.ui.aviso('Copiado al portapapeles', 'exito');
        return true;
      }
    } catch (e) { /* probamos el método antiguo */ }
    try {
      const ta = el('textarea', { style: { position: 'fixed', left: '-9999px', top: '0' } });
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) { PB.ui.aviso('Copiado al portapapeles', 'exito'); return true; }
    } catch (e) { /* mostramos el texto */ }
    mostrarParaCopiar(texto, titulo || 'Copia este texto', 'No se pudo copiar automáticamente. Selecciona el texto y cópialo.');
    return false;
  }

  function leerArchivo(aceptar = '.json,application/json,text/plain', multiple = false) {
    return new Promise(resolve => {
      const inp = el('input', { type: 'file', accept: aceptar, style: { display: 'none' } });
      if (multiple) inp.multiple = true;
      inp.addEventListener('change', async () => {
        const archivos = Array.from(inp.files || []);
        const textos = [];
        for (const f of archivos) {
          textos.push({ nombre: f.name, texto: await f.text() });
        }
        inp.remove();
        resolve(multiple ? textos : (textos[0] || null));
      });
      document.body.appendChild(inp);
      inp.click();
    });
  }

  return { descargar, copiar, mostrarParaCopiar, leerArchivo };
})();
