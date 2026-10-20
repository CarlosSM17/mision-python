/* =========================================================================
 * 41-errores.js — Explica los errores de Python en español.
 * Siempre muestra también el nombre original del error (SyntaxError,
 * NameError…) para que el alumno aprenda a reconocerlos.
 * ========================================================================= */
'use strict';

PB.errores = (() => {
  const CONFUSIONES = {
    Print: 'print', PRINT: 'print', imprimir: 'print', escribir: 'print', mostrar: 'print', prnt: 'print', pritn: 'print', pint: 'print',
    Input: 'input', imput: 'input', entrada: 'input', leer: 'input', inpt: 'input',
    true: 'True', false: 'False', verdadero: 'True', falso: 'False', none: 'None',
    Int: 'int', entero: 'int', Float: 'float', Str: 'str', Len: 'len', lenght: 'len', length: 'len',
    Range: 'range', rango: 'range', si: 'if', mientras: 'while', para: 'for', sino: 'else',
    Random: 'random', aleatorio: 'random'
  };

  function nombresDelCodigo(codigo) {
    const c = PB.py.contar(codigo);
    return Object.keys(c.nombres || {});
  }

  function lineaDeAsignacion(codigo, nombre) {
    try {
      const { toks } = PB.py.tokenizar(codigo);
      for (let k = 0; k < toks.length - 1; k++) {
        const t = toks[k];
        if (t.tipo === 'NAME' && t.valor === nombre) {
          const s = toks[k + 1];
          const ant = toks[k - 1];
          if (s.tipo === 'OP' && (s.valor === '=' || s.valor === '+=')) return t.linea;
          if (ant && ant.tipo === 'NAME' && (ant.valor === 'for' || ant.valor === 'def')) return t.linea;
        }
      }
    } catch (e) { /* nada */ }
    return null;
  }

  function sugerencia(nombre, codigo) {
    if (CONFUSIONES[nombre]) return CONFUSIONES[nombre];
    const candidatos = new Set([...nombresDelCodigo(codigo), ...PB.py.FUNCIONES_INTEGRADAS]);
    candidatos.delete(nombre);
    let mejor = null, dist = 3;
    for (const c of candidatos) {
      const d = PB.util.distancia(nombre.toLowerCase(), c.toLowerCase());
      const tope = Math.max(1, Math.floor(Math.min(nombre.length, c.length) / 3));
      if (d < dist && d <= tope) { mejor = c; dist = d; }
    }
    return mejor;
  }

  /**
   * err: {tipo, mensaje, linea, original} de PB.ejecutor
   * Devuelve {tipo, titulo, texto, linea, original}
   */
  function explicar(err, codigo) {
    if (!err) return null;
    const r = { tipo: err.tipo, linea: err.linea, original: err.original || '', texto: '' };
    const m = err.mensaje || '';
    let x;

    switch (err.tipo) {
      case 'SyntaxError': case 'IndentationError': case 'TabError': {
        const diag = PB.py.revisarSintaxis(codigo);
        if (diag) {
          r.tipo = diag.tipo;
          r.linea = diag.linea;
          r.texto = diag.mensaje;
        } else {
          r.texto = 'Python no entiende cómo está escrita esta línea. Revisa que los paréntesis y las comillas cierren, ' +
            'que no falten comas u operadores y que if, for, while y def terminen con dos puntos «:».';
          if (/indent/i.test(m)) {
            r.tipo = 'IndentationError';
            r.texto = 'Hay un problema de sangría (los espacios al inicio de la línea). Las líneas de un mismo bloque deben empezar en la misma columna.';
          }
        }
        break;
      }
      case 'NameError': {
        x = /name '([^']+)' is not defined/.exec(m);
        const nombre = x ? x[1] : '';
        if (nombre === '___') {
          r.texto = 'Todavía hay un hueco «___» sin completar en esta línea. Pon ahí el bloque o el valor que falta.';
          break;
        }
        if (nombre === 'random') {
          r.texto = 'Usas random, pero falta traer el módulo. Agrega «import random» al inicio del programa.';
          break;
        }
        const sug = sugerencia(nombre, codigo);
        const lineaAsig = lineaDeAsignacion(codigo, nombre);
        if (lineaAsig && err.linea && lineaAsig > err.linea) {
          r.texto = `Usas «${nombre}» antes de darle un valor: se crea hasta la línea ${lineaAsig}. En Python primero se guarda el valor y después se usa.`;
        } else if (sug && sug !== nombre) {
          r.texto = `Python no conoce «${nombre}». ¿Quisiste decir «${sug}»? Python distingue mayúsculas y minúsculas, y el nombre debe escribirse exactamente igual.`;
        } else if (nombre && /^[\p{L}_]+$/u.test(nombre) && !lineaAsig) {
          r.texto = `Python no conoce «${nombre}». Si es una variable, primero guárdale un valor (${nombre} = …). Si es un texto, ponlo entre comillas: "${nombre}".`;
        } else {
          r.texto = `Python no conoce el nombre «${nombre}». Revisa cómo está escrito y que tenga un valor antes de usarlo.`;
        }
        break;
      }
      case 'TypeError': {
        if (/concatenate|can only concatenate|for \+: '(int|float)' and 'str'|for \+: 'str' and '(int|float)'/.test(m)) {
          r.texto = 'Estás uniendo con + un texto y un número. Convierte el número en texto con str(), o separa con comas en print: print("Edad:", edad). Si el número viene de input(), recuerda que input() siempre da texto: conviértelo con int() o float().';
        } else if ((x = /unsupported operand type\(s\) for ([^:]+): '(\w+)' and '(\w+)'/.exec(m))) {
          r.texto = `No se puede usar «${x[1].trim()}» entre un valor ${tipoEs(x[2])} y uno ${tipoEs(x[3])}. ¿Algún dato viene de input()? Conviértelo con int() o float() antes de hacer cuentas.`;
        } else if ((x = /'([<>=!]+)' not supported between instances of '(\w+)' and '(\w+)'/.exec(m))) {
          r.texto = `Estás comparando un valor ${tipoEs(x[2])} con uno ${tipoEs(x[3])}. Si el número viene de input(), conviértelo con int() antes de comparar.`;
        } else if ((x = /(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:were|was) given/.exec(m))) {
          r.texto = `La función ${x[1]}() recibe ${x[2]} valor(es), pero le diste ${x[3]}. Revisa los paréntesis de la llamada.`;
        } else if ((x = /(\w+)\(\) missing (\d+) required positional argument/.exec(m))) {
          r.texto = `A la función ${x[1]}() le falta(n) ${x[2]} valor(es) entre los paréntesis.`;
        } else if (/object is not callable/.test(m)) {
          r.texto = 'Pusiste paréntesis () después de algo que no es una función. ¿Usaste una variable con el mismo nombre que una función (por ejemplo, una variable llamada print o input)?';
        } else if (/not subscriptable/.test(m)) {
          r.texto = 'Usas corchetes [ ] en algo que no es una lista ni un texto.';
        } else if (/'(int|float)' object is not iterable/.test(m)) {
          r.texto = 'for necesita algo que recorrer. Si quieres repetir n veces, usa range(n) en lugar de n.';
        } else if (/indices must be integers/.test(m)) {
          r.texto = 'La posición dentro de una lista o texto debe ser un número entero (int). Si viene de input(), conviértela con int().';
        } else if (/can't multiply sequence by non-int/.test(m)) {
          r.texto = 'Solo se puede multiplicar un texto o una lista por un número entero. ¿Algún valor es texto que debería ser número? Usa int() o float().';
        } else {
          r.texto = 'Estás usando un valor de un tipo que no sirve para esa operación (por ejemplo, texto donde va un número).';
        }
        break;
      }
      case 'ValueError': {
        if ((x = /invalid literal for int\(\) with base 10: '(.*)'/.exec(m))) {
          r.texto = x[1].trim() === ''
            ? 'int() recibió un texto vacío. Escribe un número antes de presionar Enter.'
            : `int() no puede convertir «${x[1]}» en número entero. Si tiene punto decimal usa float(); si es una palabra, escribe un número.`;
        } else if ((x = /could not convert string to float: '(.*)'/.exec(m))) {
          r.texto = `float() no puede convertir «${x[1]}» en número. Escribe un número; para decimales usa punto (2.5), no coma.`;
        } else if (/remove\(x\): x not in list|not in list/.test(m)) {
          r.texto = 'Intentas quitar de la lista un valor que no está en ella. Puedes revisar antes con: if valor in lista:';
        } else {
          r.texto = 'Un valor no tiene la forma que se esperaba.';
        }
        break;
      }
      case 'ZeroDivisionError':
        r.texto = 'No se puede dividir entre cero. Revisa el valor que va después de / , // o %.';
        break;
      case 'IndexError':
        r.texto = 'Pediste una posición que no existe. Recuerda: la primera posición es 0 y la última es len(lista) - 1.';
        break;
      case 'AttributeError':
        if ((x = /'(\w+)' object has no attribute '(\w+)'/.exec(m))) {
          const extra = x[2] === 'append' ? ' append solo funciona con listas.' : (['upper', 'lower', 'title'].includes(x[2]) ? ` .${x[2]}() solo funciona con texto (str).` : '');
          r.texto = `Los valores ${tipoEs(x[1])} no tienen «.${x[2]}».${extra}`;
        } else r.texto = 'Usas un método que ese valor no tiene.';
        break;
      case 'KeyError':
        r.texto = 'Buscas una clave que no existe.';
        break;
      case 'RecursionError': case 'RangeError':
        r.texto = 'Una función se llama a sí misma sin parar.';
        break;
      case 'ImportError': case 'ModuleNotFoundError':
        r.texto = 'Ese módulo no está disponible en la plataforma. En este curso usamos random.';
        break;
      case 'TiempoAgotado':
        r.tipo = 'TimeLimitError';
        r.texto = 'El programa tardó demasiado. ¿Hay un bucle que nunca termina? Revisa que la condición del while llegue a ser False (por ejemplo, que el contador aumente dentro del bucle).';
        break;
      case 'EntradasAgotadas':
        r.tipo = 'Faltan datos';
        r.texto = 'El programa pidió más datos con input() de los que trae esta prueba. ¿Pides los datos el número de veces correcto? Si es un bucle, ¿se detiene cuando debe?';
        break;
      case 'SalidaExcesiva':
        r.tipo = 'Demasiada salida';
        r.texto = 'El programa imprimió demasiado. ¿Hay un print dentro de un bucle que nunca termina?';
        break;
      case 'Detenido':
        r.tipo = 'Detenido';
        r.texto = 'Detuviste el programa.';
        break;
      case 'SinInterprete':
        r.tipo = 'Sin intérprete';
        r.texto = 'No se pudo cargar el intérprete de Python. Revisa la conexión a internet y vuelve a cargar la página.';
        break;
      default:
        r.texto = 'Ocurrió un error al ejecutar el programa.';
    }
    r.titulo = r.tipo + (r.linea ? ' · línea ' + r.linea : '');
    return r;
  }

  function tipoEs(t) {
    return ({ int: 'entero (int)', float: 'decimal (float)', str: 'de texto (str)', list: 'lista (list)', bool: 'lógico (bool)', NoneType: 'vacío (None)' })[t] || `de tipo ${t}`;
  }

  return { explicar };
})();
