# Guía docente de Misión Python

Esta guía explica cómo está organizada la plataforma, cómo usarla en el aula y cómo modificar su contenido. Los planes de cada misión están en [planes-de-clase.md](planes-de-clase.md). Los instrumentos de evaluación (ponderación, prueba de lectura, lista de cotejo, rúbrica y las claves de todos los Kahoots) y las soluciones de referencia se generan en la carpeta privada `mision-python-privado` (junto a la carpeta del proyecto), que no se publica en GitHub: `docente/instrumentos-de-evaluacion.md` y `soluciones/`.

## 1. La idea en una página

- **Python desde el primer día.** El alumno escribe código en un editor de Python desde la Misión 0. Los bloques siguen disponibles en el taller (modos 1 y 2, y el panel «🧩 Bloques» como pista), pero son un apoyo opcional, no el camino principal.
- **Teoría corta y visual.** Cada concepto se presenta en tarjetas de una sola idea, con dibujos (cajas, balanzas, trenes de letras, escaleras, máquinas), ejemplos que se ejecutan con un botón y laboratorios donde el alumno cambia valores y ve el resultado al instante.
- **Practicar jugando antes de programar.** Antes de escribir un programa completo, el alumno juega: ordena líneas, caza errores, predice salidas, traza variables… Así la dificultad sube de forma gradual.
- **Kahoot para cerrar.** Cada misión termina con un Kahoot (individual o en equipos con el proyector) que sirve como evaluación formativa rápida.
- **Gamificación que motiva, no que califica.** XP, niveles, logros, rachas y avatares premian el esfuerzo y la constancia. La calificación se calcula aparte, con lo logrado.

## 2. Cómo es una misión

Cada misión tiene siete pasos. El alumno los ve como pestañas y la plataforma marca con ✓ los que ya visitó.

| Paso | Qué hace el alumno | Tiempo sugerido |
|---|---|---|
| 🔥 **Calienta** (desde la Misión 2) | 3 preguntas rápidas de misiones anteriores (repaso espaciado). | 3 min |
| 📖 **Aprende** | Recorre las tarjetas de teoría, prueba los laboratorios y responde las preguntas rápidas. | 10 min |
| 🔍 **Observa** | Ejemplo resuelto con la secuencia PRIMM: predice (+30 XP si acierta), ejecuta, investiga y modifica en el editor. | 7 min |
| 🎮 **Juega** | 4 a 6 juegos de práctica de la misión. | 15 min |
| 💻 **Programa** | Retos rápidos (una sola idea), la misión principal en 3 niveles y un reto extra opcional. | 20 min |
| ⚡ **Kahoot** | 8 a 10 preguntas con tiempo, individual o en equipos. | 5 min |
| 🏁 **Cierre** | Resumen de lo aprendido, autoevaluación con emojis, preguntas de reflexión y logros recientes. | 3 min |

En una clase de 60 minutos lo habitual es: activación + Aprende en grupo (proyectando las tarjetas), Juega en parejas, Programa individual y Kahoot en equipos al final. Si el tiempo no alcanza, Juega y Programa pueden terminarse en casa: la plataforma recuerda dónde se quedó cada alumno («▶ Continuar» en el mapa).

### Mapa del curso

| Misión | Conceptos | Misión principal |
|---|---|---|
| 0. Despegue: ¡Hola, Python! | qué es programar, `print()`, errores | 3 retos de inicio y prueba diagnóstica |
| 1. Secuencia y salida | `print()`, comas, comentarios `#` | Tarjeta de presentación |
| 2. Variables y operaciones | `=`, `+ - * / // % **`, `int`, `float` | Calculadora de la tiendita |
| 3. Leer datos del usuario | `input()`, `int()`, `float()`, `str()` | Conversor de unidades |
| 4. Trabajar con texto | `+`, `len()`, `.upper()`, `.lower()`, `.title()`, f-strings | Generador de apodos |
| 5. Comparar y decidir | `bool`, `== != > < >= <=`, `if / else` | ¿Aprobado o reprobado? |
| 6. Varias opciones | `elif`, `and`, `or`, `not` | Clasificador del clima |
| 7. Mini-proyecto | contador, `.lower()`, integra 1 a 6 | Quiz de 5 preguntas con puntaje |
| 8. Repetir un número fijo de veces | `for`, `range()` | Tablas de multiplicar |
| 9. Repetir mientras se cumpla algo | `while`, `random.randint()` | Adivina el número |
| 10. Acumular y validar | acumuladores, `+=`, `break`, validación | Contraseña con 3 intentos |
| 11. Guardar varios datos | listas, índices, `.append()`, `len()` | Inventario de la mochila |
| 12. Recorrer listas | `for x in lista`, `in`, `sum()`, `max()`, `random.choice()` | Promedio de calificaciones y sorteo |
| 13. Crear instrucciones propias | `def`, parámetros | Fábrica de saludos y marcos |
| 14. Funciones que responden | `return`, descomposición | Rehacer el quiz con funciones |
| 15. Proyecto final | todo el curso | 4 opciones: piedra, papel o tijera; aventura de texto; quiz temático; mascota virtual |
| 16. Presentación | presentación, coevaluación | Prueba final, Gran Kahoot y certificado |

## 3. Teoría gráfica

- **Tarjetas en carrusel.** Se avanza con los botones, con las flechas del teclado o deslizando el dedo. «☰ Ver todas» muestra todas las tarjetas en una sola página (útil para repasar o proyectar). Al terminar el carrusel el alumno gana 50 XP.
- **Py 🐍**, la mascota, aparece con consejos en las tarjetas.
- **Laboratorios (exploradores).** En las tarjetas «Laboratorio…» el alumno escribe valores y ve el resultado al momento: cajas de variables que cambian, operadores con puntos que se agrupan para entender `//` y `%`, interruptores `and` / `or` / `not` que prenden un foco, un `if` con dos caminos, la escalera del `elif` con un deslizador, la pista de `range`, un `while` paso a paso, una lista que se llena, una máquina de funciones y un chat que simula `input()`. Proyectarlos y preguntar «¿qué pasará si…?» funciona muy bien en grupo.
- **Ejemplos que se ejecutan.** Las tarjetas con el botón **▶ Probar** corren el código ahí mismo, incluso con `input()`.

## 4. Los juegos de práctica

| Juego | Qué practica | Cómo se gana |
|---|---|---|
| 🧩 Ordena el código | Secuencia y sangría (problemas de Parsons). Algunos traen piezas trampa. | Todas las líneas en orden (y con la sangría correcta cuando se pide). |
| 🐞 Caza el error | Leer con atención y reconocer errores. | Tocar la línea equivocada y elegir el tipo de error (SyntaxError, NameError…). En los errores lógicos el programa no falla pero hace algo incorrecto. |
| ✏️ Completa el código | Sintaxis guiada. | Llenar los huecos (se puede escribir o tocar las piezas del banco). |
| 🔮 ¿Qué imprime? | Predecir la salida (trazado mental). | Elegir la opción o escribir la salida exacta. |
| 🕵️ Traza las variables | Seguir el valor de cada variable línea por línea, también dentro de bucles. | Llenar la tabla correctamente. |
| 🗂️ Clasifica | Tipos de datos, True/False, requisitos del proyecto… | Cada elemento en su caja. |
| 🔗 Relaciona | Código ↔ resultado, término ↔ definición. | Formar todas las parejas. |
| ⚡ Verdadero o falso | Repaso rápido contra reloj. | Al menos 70 % de aciertos. |
| 🧠 Memorama | Código ↔ resultado, con memoria. | Encontrar todas las parejas. |
| ⌨️ Mecanografía Python | Escribir símbolos (`:`, `()`, `""`, `[]`) con soltura. | Escribir las líneas exactamente. |

Cada juego da 60 XP (40 la mecanografía) y 20 XP extra si se resuelve a la primera. Se puede repetir, pero los XP se ganan una sola vez.

## 5. Programar: retos, niveles y modos

- **Retos rápidos**: programas cortos de una idea, con código inicial y huecos `___` que hay que completar. 80 XP cada uno.
- **Misión principal en tres niveles**: Explorador (parte del programa ya está escrita: 100 XP), Programador (programa completo: 150 XP) y Maestro (un requisito adicional: 200 XP). Dan 1, 2 o 3 estrellas en el mapa.
- **Reto extra** (opcional): para quien termina antes. 150 XP.
- **Proyectos** (Misiones 7 y 15): esqueletos con comentarios, revisión automática de requisitos con «Revisar requisitos» y 300 XP al entregar.
- **Modos de trabajo**: el taller abre en el **modo 3 (Con apoyo)**: editor de Python con los bloques como pista. El alumno puede cambiar a **4 (Libre)**, o bajar a **1 (Bloques)** o **2 (Completar)** si lo necesita; su elección se recuerda en cada reto.
- **Ayudas**: pistas escalonadas, **👣 Paso a paso** (resalta la línea que se ejecuta y muestra las variables), barra de símbolos para tabletas y errores explicados en español con sugerencias.

## 6. Kahoot

### Individual

Cada pregunta tiene tiempo (20 a 30 segundos). Una respuesta correcta da hasta 1000 puntos (más entre más rápida) y la racha de aciertos suma un bono de hasta 500. Al final aparecen medalla, puntaje, la revisión de cada respuesta con su explicación y el récord personal. Los XP del Kahoot son proporcionales a los aciertos (hasta 150 por misión) y se queda el mejor intento.

También hay Kahoots fuera de las misiones:

- **🔥 Calienta**: 3 preguntas de misiones anteriores al inicio de cada misión.
- **⚡ Desafío del día** (en el mapa): 5 preguntas de lo que el alumno ya estudió. Da XP una vez al día y ayuda a mantener la racha.
- **🏆 Gran Kahoot**: 20 preguntas al azar de todo el curso. Ideal antes de la prueba final.

### En equipos, con el proyector

Desde el paso Kahoot de cualquier misión («👥 Jugar en equipos») o desde el **Panel docente** («Kahoot en equipos», donde también puedes elegir el Gran Kahoot):

1. Elige el número de equipos (2 a 8) y, si quieres, cámbiales el nombre. Pon la plataforma en pantalla completa con el botón ⛶.
2. Cada pregunta aparece con sus cuatro colores y formas (▲ rojo, ◆ azul, ● amarillo, ■ verde). Los equipos responden **levantando una tarjeta de color** o mostrando con los dedos 1 a 4.
3. Al terminar el tiempo (o con «Revelar respuesta») se muestra la correcta. Toca los equipos que acertaron; con la ⭐ marcas al **primero** en responder bien.
4. Cada acierto vale 1000 puntos y el primero gana 300 extra. Entre preguntas se ve el marcador animado y al final el **podio**.

Atajos: barra espaciadora o Enter para avanzar; «⏸ Pausa» para detener el tiempo mientras discuten.

> Sugerencia: imprime tarjetas de cuatro colores con las formas para cada equipo. Las claves de todas las preguntas están en `mision-python-privado/docente/instrumentos-de-evaluacion.md` (sección «Claves de los Kahoots»).

## 7. Gamificación

| Acción | XP |
|---|---|
| Terminar la teoría de una misión | 50 |
| Acertar la predicción del ejemplo | 30 |
| Juego de práctica | 60 (+20 a la primera) |
| Reto rápido | 80 |
| Misión: Explorador / Programador / Maestro | 100 / 150 / 200 |
| Reto extra | 150 |
| Proyecto entregado | 300 |
| Kahoot de la misión | hasta 150 (según aciertos) |
| Calienta / Desafío del día / Gran Kahoot | hasta 30 / 60 / 200 |
| Coevaluación · prueba diagnóstica o final · autoevaluación | 40 · 50 · 10 |
| Cada logro | 20 a 300 |

- **XP sin trampas**: cada cosa da XP una sola vez (repetir un juego no suma de nuevo; mejorar sí suma la diferencia).
- **15 niveles**, de *Novato* a *Leyenda*. Al subir de nivel aparece una celebración y se desbloquean avatares nuevos.
- **32 logros**: primeros pasos (¡Hola, mundo!, Primer reto), constancia (rachas de 3 y 7 días, desafíos diarios), maestría (A la primera, Nivel Maestro, Kahoot perfecto), exploración (Científico: usar 10 laboratorios; Cámara lenta: usar el paso a paso) y resiliencia (*Aprendo de mis errores*: leer 10 errores explicados).
- **Racha**: días seguidos en los que el alumno practica. Se ve en la cabecera 🔥.
- **Insignias por mundo** y **certificado** imprimible al final (con nivel, XP, logros y retos superados).
- **Sonido**: el botón 🔊 de la cabecera lo silencia (se recuerda por alumno).

**Recomendaciones de uso**

- Proyecta el **podio** (los 3 primeros por XP) del Panel docente, no la lista completa: así se celebra sin exhibir a quien va más lento.
- Reconoce también la constancia (rachas) y la mejora (de la prueba diagnóstica a la final), no solo el XP total.
- Recuerda al grupo que el XP **no es la calificación**.

## 8. Evaluación y seguimiento

- **Calificación estimada** (Progreso → Calificación estimada), con los pesos de `configuracion.json`: retos de programación 35 %, juegos 15 %, Kahoots 20 % (mejor porcentaje de cada misión) y proyecto final 30 %. El mini-proyecto de la Misión 7 cuenta como una misión dentro de los retos. Los detalles y la rúbrica están en `mision-python-privado/docente/instrumentos-de-evaluacion.md`; la rúbrica también aparece en la Misión 15 con el modo docente activo.
- **Prueba diagnóstica y final**: los mismos 10 reactivos de lectura de código en las Misiones 0 y 16; el alumno ve cuánto avanzó.
- **Entregas**: en **Progreso**, el alumno puede copiar un resumen (nivel, XP, avance por misión, Kahoots y autoevaluación) para pegarlo en Classroom, o descargar su archivo de progreso.
- **Panel docente → Progreso y ranking del grupo**: selecciona todos los archivos de progreso (o pega los códigos) y obtienes la tabla del grupo, el podio por XP, los promedios de las pruebas y un CSV para tu hoja de cálculo.

### Modo docente

Entra a **🔑 Docente** con el PIN (por defecto `2468`; cámbialo en `configuracion.json`). Mientras está activo en esa pestaña:

- en cada reto aparece «⋯ → Ver solución»;
- el plan de clase aparece al inicio de cada misión y la rúbrica en el proyecto;
- puedes abrir cualquier modo del taller y repetir la prueba diagnóstica o final para mostrarla.

### Progreso y dispositivos

El progreso (incluidos XP, logros y avatar) se guarda en el navegador del dispositivo. Si los alumnos cambian de equipo, o el navegador borra los datos (frecuente dentro de Google Sites en iPad), pueden **descargar el archivo** o **copiar el código** de progreso y recuperarlo en otro dispositivo. Pídelo al final de cada semana.

## 9. Editar o agregar contenido

Cada misión es un archivo `contenido/sesion-NN.json`. Después de editar, ejecuta `python construir.py`: valida la estructura y **prueba con Python** soluciones, juegos, preguntas y ejemplos; si algo no cuadra, dice exactamente qué y dónde. Luego `python herramientas/probar_plataforma.py` lo prueba en el navegador.

### Campos de una misión

```jsonc
{
  "numero": 3, "unidad": 2,              // mundo (contenido/unidades.json)
  "titulo": "Leer datos del usuario", "icono": "⌨️",
  "modo": 3,                             // modo inicial del taller (3 = Python con apoyo)
  "python": ["input()", "int()"],        // chips de la cabecera
  "historia": "…", "historiaIcono": "🌡️",
  "objetivos": ["…"],
  "teoria": [ /* tarjetas, ver abajo */ ],
  "ejemplo": { "titulo": "…", "codigo": "…", "prediccion": { "pregunta": "…", "opciones": ["…"], "correcta": 0 }, "investigar": ["…"], "modificar": "…" },
  "actividades": [ /* juegos, ver abajo */ ],
  "retos": [ /* retos rápidos */ ],
  "mision": { "id": "m03-mision", "titulo": "…", "enunciado": "…", "pruebas": [], "niveles": { "explorador": {}, "programador": {}, "maestro": {} } },
  "extra": { /* reto extra */ },
  "kahoot": { "preguntas": [ /* ver abajo */ ] },     // o { "aleatorio": 10 }
  "resumen": [{ "icono": "⌨️", "texto": "…", "codigo": "…" }],
  "glosario": [{ "en": "input", "es": "entrada", "def": "…" }],
  "autoevaluacion": [{ "pregunta": "…", "respuesta": "…" }],
  "plan": { "activacion": "…", "ejemplo": "…", "practica": "…", "reto": "…", "cierre": "…", "notas": "…" }
}
```

Campos opcionales de misiones especiales: `"proyecto"` (con `opciones`, `requiere`, `listaCotejo` o `rubrica`), `"prueba": "diagnostica" | "final"`, `"coevaluacion"` y `"certificado": true`.

Los retos usan los mismos campos que en «De Bloques a Python»: `enunciado`, `inicio`, `pruebas` (`entradas`, `azar`, `contiene`, `no_contiene`, `exacto`, `lineasMin`), `requiere` / `prohibe` (por ejemplo `"input*2"`, `"for|while"`, `"print<=2"`), `pistas` y `solucion`.

### Tarjetas de teoría

| `tipo` | Campos |
|---|---|
| `portada` | `icono`, `titulo`, `texto` |
| `idea` | `icono`, `titulo`, `texto`, `codigo`, `salida` (se comprueba que sea la salida real) |
| `ilustracion` | `nombre`, `datos`, `titulo`, `texto`, `codigo` |
| `explorador` | `nombre` (print, variables, tipos, operadores, texto, comparar, logica, si, elif, range, while, listas, recorrer, funciones, input), `titulo`, `texto` |
| `animacion` | `animacion` (variables, decision, bucle, mientras, lista, funcion), `titulo`, `texto` |
| `codigo` | `titulo`, `texto`, `codigo` (con botón ▶ Probar), `nota` |
| `comparar` | `titulo`, `texto`, `mal` y `bien` (`codigo` o `texto`, y `nota`) |
| `pregunta` | `pregunta`, `codigo`, `opciones`, `correcta`, `explicacion` |
| `tabla` | `titulo`, `texto`, `encabezados`, `filas` |
| `pasos` | `titulo`, `texto`, `pasos: [{ "icono", "texto" }]` |
| `bloques` | `titulo`, `texto`, `codigo` (se muestra en bloques y en Python) |

Cualquier tarjeta acepta `"py": "…"` para un consejo de la mascota.

Ilustraciones (`nombre` → `datos`): `computadora` (a, b, c) · `consola` (codigo, salida) · `caja` (nombre y valor, o `cajas: [{nombre, valor}]`) · `tipos` · `operadores` · `maquina-io` (entrada, dato, proceso, salidaCodigo, resultado) · `tren-texto` (texto) · `balanza` (izq, op, der, resultado) · `camino-if` (condicion, si, no, marcar: "si" o "no") · `escalera-elif` (pasos: [[condición, valor], …, [null, valor]], marcar) · `pista-for` (valores, variable o codigo) · `ciclo-while` (condicion, cuerpo) · `estante-lista` (nombre, elementos) · `maquina-funcion` (nombre, parametro, entrada, codigo, salida) · `error` (codigo, linea, tipo, mensaje).

### Juegos (`actividades`)

Todos llevan `id`, `tipo`, `titulo`, `instrucciones` y, opcionalmente, `xp` y `explicacion` (se muestra al ganar).

| `tipo` | Campos propios |
|---|---|
| `ordenar` | `lineas` (la solución, con sangría de 4 espacios), `distractores`, `sangria: true` (el alumno pone la sangría), `alternativas`, `entradas`, `ejecutable` |
| `error` | `codigo`, `linea` o `lineas`, `tipoError` (SyntaxError, NameError, TypeError, IndentationError, ValueError, IndexError, ZeroDivisionError o `logico`), `explicacion`, `correccion`, `pista`, `entradas` |
| `completar` | `codigo` con huecos `⟦respuesta⟧` o `⟦a\|b⟧` (varias respuestas válidas), `opciones` (banco de piezas), `entradas` |
| `clasificar` | `categorias: [{id, nombre, color, icono}]`, `elementos: [{texto, cat}]` |
| `relacionar` | `pares: [[izquierda, derecha]]`, `codigoIzq` / `codigoDer: false` para texto con formato |
| `salida` | `codigo`, `respuesta`, y opcionalmente `opciones` + `correcta`; `entradas` |
| `traza` | `codigo`, `variables`, `filas: [{linea, valores: {variable: "valor" o ""}}]` (`""` = todavía no existe; en bucles, una fila por vuelta) |
| `vf` | `afirmaciones: [{texto, correcta, codigo, explicacion}]`, `tiempo` |
| `memorama` | `pares`, `codigo: [0]` (qué lado se muestra como código) |
| `teclear` | `lineas` |

### Preguntas de Kahoot

```json
{ "pregunta": "¿Qué muestra?", "codigo": "print(7 // 2)", "opciones": ["3", "3.5", "4", "1"], "correcta": 0,
  "tiempo": 30, "explicacion": "…", "salidaEsRespuesta": true }
```

- 2 a 4 opciones; `"tipo": "vf"` con `["Verdadero", "Falso"]` para verdadero o falso.
- `salidaEsRespuesta: true` hace que `construir.py` ejecute el código y compruebe que la opción correcta es exactamente lo que imprime (con `entradas` si usa `input()`).
- `codigoOpciones: true` muestra las opciones como código.
- El Calienta, el Desafío del día y el Gran Kahoot toman preguntas al azar de estos mismos bancos.
