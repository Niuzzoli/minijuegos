# Daily Puzzles — Diseño (v2: Sudoku)

Fecha: 2026-09-22
Estado: Aprobado para plan de implementación

## 1. Objetivo

Agregar **Sudoku** como segundo juego jugable de Daily Puzzles, en paralelo
con Wordle (spec `2026-09-21-daily-puzzles-design.md`). Cada juego tiene su
propio puzzle diario, determinístico por fecha, independiente del otro: un
usuario puede resolver Wordle, Sudoku, ambos o ninguno en un día dado, y
cada uno trackea su propia racha y estadísticas.

Esta v2 también generaliza dos capas que en v1 habían quedado
Wordle-específicas a pesar de estar pensadas como compartidas
(`DailyProgress` y el hook de persistencia), para que agregar un tercer
juego en el futuro (Connections, Memory) no requiera repetir este trabajo.

## 2. Alcance de la v2

Incluye:
- Sudoku completo: grilla 9x9, generación de puzzles con solución única,
  selección diaria determinística, resolución y verificación.
- Resaltado de celdas con el mismo número al seleccionar una celda.
- Página "Juegos" con Sudoku marcado `available: true`.
- Home ("Hoy") mostrando una tarjeta de puzzle del día por cada juego
  disponible, en vez de un único hero de un solo juego.
- Estadísticas separadas por juego (Wordle y Sudoku cada uno con su
  sección).
- Generalización de `DailyProgress` (unión discriminada por `game`) y del
  hook `useDailyProgress` para que no asuman la forma de Wordle.

Explícitamente fuera de alcance en v2:
- Estado de derrota en Sudoku (no hay límite de errores; solo
  resuelto/no resuelto).
- Modo notas/candidatos (lápiz).
- Resaltado de fila/columna/región.
- Marcado de errores en tiempo real celda por celda.
- Dificultad variable (un solo nivel fijo para todo el pool).
- Timer/tiempo transcurrido.
- Connections y Memory (siguen "próximamente").

## 3. Modelo de datos

### DailyPuzzle — nueva variante

```ts
type DailyPuzzle =
  | { id: string; date: string; game: 'wordle'; solution: string }
  | { id: string; date: string; game: 'sudoku'; givens: string; solution: string };
```

`givens` y `solution` son strings de 81 caracteres, fila por fila
(índice `row * 9 + col`). En `givens`, `'0'` marca una celda vacía para
completar; en `solution`, todos los caracteres son `'1'`-`'9'`.

### SudokuBoard

```ts
// types/sudoku.ts
export type SudokuBoard = number[]; // longitud 81, cada valor 0-9 (0 = vacío)
```

Representa el estado *actual* de la grilla (pistas originales + lo que el
usuario fue completando), no solo lo que el usuario tipeó — así un reload
a mitad de partida restaura la grilla completa tal cual estaba.

### DailyProgress — pasa a unión discriminada

En v1, `DailyProgress` tenía `attempts: WordleAttempt[]` hardcodeado pese a
que el campo `game: string` sugería generalidad. v2 lo corrige:

```ts
export type GameStatus = 'in-progress' | 'won' | 'lost';

export type DailyProgress =
  | { game: 'wordle'; status: GameStatus; attempts: WordleAttempt[]; completedAt?: string }
  | { game: 'sudoku'; status: 'in-progress' | 'won'; board: SudokuBoard; completedAt?: string };

export type ProgressStore = Record<string, DailyProgress>;
```

Sudoku nunca usa `status: 'lost'` (spec §2 — sin derrota), pero comparte el
tipo `GameStatus` en vez de inventar uno paralelo, para no duplicar el
concepto de "en progreso" innecesariamente.

**Formato de la clave de `ProgressStore`:** `DailyProgress` es una unión
discriminada por VALOR (campo `game`), pero la clave del store es un string
aparte que un consumidor tiene que elegir — no hay nada en el tipo que la
ate al valor. La clave **debe** ser compuesta, `` `${game}:${dateKey}` ``
(p. ej. `"sudoku:2026-09-22"`), nunca el `dateKey` a secas. Con clave bare
(`"2026-09-22"`), Wordle y Sudoku jugados el mismo día escriben en la misma
entrada y uno pisa el progreso del otro — un bug de pérdida de datos
silenciosa que rompió esta misma feature una vez (ver el fix de C1 en el
review final de la rama Sudoku). Convenciones que dependen de este formato:

- `lib/storage.ts` (`getDayProgress`/`setDayProgress`) permanece agnóstico:
  toma la clave ya compuesta como un string opaco.
- `hooks/useDailyProgress.ts` construye la clave: `updateDay(game, dateKey,
  buildProgress)` arma `` `${game}:${dateKey}` `` internamente antes de leer
  o escribir en el store.
- `lib/progress-filter.ts` (`filterStoreByGame`) filtra por el prefijo
  `` `${game}:` `` y lo recorta del resultado, de modo que su salida sea un
  `ProgressStore` con clave `dateKey` plano — así `calculateStreak`/
  `calculateStats`, que tratan las claves del store como fechas
  directamente, no necesitan saber nada de este esquema compuesto.

Cualquier juego nuevo (Connections, Memory) sigue esta misma convención:
nunca escribir/leer con `dateKey` a secas como clave del store.

## 4. Generación del pool de puzzles

Un script Node, **`scripts/generate-sudoku-puzzles.mjs`**, genera el pool
una sola vez, en tiempo de desarrollo (no en runtime de la app):

1. Genera un tablero 9x9 completo y válido por backtracking aleatorizado
   (fila por fila, probando dígitos en orden aleatorio, retrocediendo ante
   conflicto) — este es `solution`.
2. Remueve celdas del tablero completo (en orden aleatorio) verificando en
   cada paso, con un solver de conteo de soluciones, que el tablero
   resultante siga teniendo **exactamente una** solución. Si remover una
   celda produce más de una solución posible, esa celda no se remueve.
   Repite hasta alcanzar una cantidad de pistas fija para todo el pool
   (dificultad única, spec §2) — un rango típico de 30-36 pistas para una
   dificultad media.
3. Repite 200 veces (con semillas distintas) para producir el pool
   completo.
4. Vuelca el resultado a **`data/sudoku/puzzles.ts`** como un array de 200
   `{ givens: string; solution: string }`.

El script se ejecuta una vez durante la implementación; el resultado
commiteado es el dato real que usa la app. No hay generación de tableros
en el cliente ni en el servidor en runtime — mismo espíritu que la lista
de palabras de Wordle (dato estático curado, no generado al vuelo).

## 5. Fecha y selección diaria

La lógica de "día desde el lanzamiento, módulo tamaño del pool" que hoy
vive dentro de `getDailyPuzzle` (spec Wordle §7) se extrae a un helper
compartido:

```ts
// lib/daily-puzzle.ts
function dailyIndexForPool(date: Date, poolLength: number): number; // ya existía inline, se nombra y reutiliza

export function getDailyWordlePuzzle(date: Date, solutions: readonly string[]): DailyPuzzle;
export function getDailySudokuPuzzle(date: Date, puzzles: readonly SudokuPuzzleSeed[]): DailyPuzzle;
```

(`getDailyPuzzle` se renombra a `getDailyWordlePuzzle` para que el nombre
distinga de qué juego habla, dado que ahora hay dos. `LAUNCH_DATE` se
mantiene único y compartido entre ambos juegos — cada uno tiene su propio
pool, así que el mismo `LAUNCH_DATE` no hace que ambos elijan "el mismo
índice de la vida" de forma correlacionada de ninguna manera problemática,
simplemente cada pool cicla a su propio ritmo según su propio tamaño.)

## 6. Verificación y completado (sin estado de derrota)

- El botón "Verificar" solo se habilita cuando las 81 celdas tienen un
  valor (ninguna en 0).
- Al verificar: si el tablero actual coincide exactamente con `solution`,
  el progreso pasa a `status: 'won'`, se guarda `completedAt`, y el juego
  queda bloqueado por el resto del día (mismo patrón de bloqueo que
  Wordle).
- Si no coincide, se muestra un mensaje genérico ("Todavía hay errores en
  el tablero") sin señalar qué celdas están mal — no hay resaltado de
  errores en tiempo real (spec §2) — y el usuario sigue editando
  libremente, sin contador de intentos ni penalización.

## 7. Racha y estadísticas — separadas por juego

`calculateStreak` y `calculateStats` (spec Wordle §8, §14) ya operan sobre
un `ProgressStore` genérico, filtrando por `status === 'won'` sin mirar el
campo `game`. Se les antepone un filtro por juego antes de invocarlas:

```ts
export function filterStoreByGame(store: ProgressStore, game: DailyProgress['game']): ProgressStore;
```

Cada juego calcula su propia racha/estadísticas llamando
`calculateStreak(filterStoreByGame(store, 'sudoku'), todayKey)`, sin
modificar la lógica interna de `calculateStreak`.

`UserStats` (spec Wordle §5) se separa en una parte común y una extensión
específica de Wordle, porque la distribución de intentos (1-6) no tiene
sentido para Sudoku (no hay concepto de "intentos"):

```ts
export type BaseGameStats = {
  played: number;
  won: number;
  winPercentage: number;
  currentStreak: number;
  bestStreak: number;
};

export type WordleStats = BaseGameStats & {
  attemptsDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
};

export type SudokuStats = BaseGameStats;
```

`calculateStats` (Wordle) sigue devolviendo `WordleStats`; se agrega
`calculateSudokuStats(store, todayKey): SudokuStats` que reutiliza
`calculateStreak` + un conteo simple de jugados/ganados, sin distribución.

La página `/estadisticas` pasa a tener una sección por juego (Wordle con
su distribución de intentos, Sudoku sin ella), no un panel único.

## 8. Hook de persistencia — generalización

`useDailyProgress` (spec Wordle §11 wraps `lib/storage.ts`) hoy expone
`recordAttempt`/`finishGame`, nombrados y tipados para Wordle. Pasa a
exponer solo el primitivo genérico que ya usaba internamente:

```ts
export function useDailyProgress(): {
  store: ProgressStore;
  hydrated: boolean;
  updateDay: (dateKey: string, build: (existing?: DailyProgress) => DailyProgress) => void;
};
```

Cada juego arma su propia lógica de actualización sobre `updateDay`:
`app/jugar/wordle/page.tsx` mantiene su comportamiento actual (mismo
`recordAttempt`/`finishGame`, ahora como funciones locales de esa página
en lugar de métodos del hook), y `app/jugar/sudoku/page.tsx` usa
`updateDay` para persistir cada cambio de celda y el resultado final. El
hook en sí no sabe nada de juegos específicos — cumple lo que la v1 del
spec ya prometía ("preparado para agregar juegos futuros sin reescribir
la persistencia") pero no había cumplido del todo.

## 9. UI y componentes

- **`components/PuzzleOfDayCard.tsx`** — versión compacta y reutilizable
  del hero de "puzzle del día" (reemplaza a `DailyPuzzleHero`, que asumía
  un solo juego). Recibe `puzzle`, `streak`, `alreadyPlayed`, `gameName`,
  `gameDescription`, `playRoute`; layout más chico que el hero original
  para convivir dos o más en la misma pantalla.
- **`components/TodayView.tsx`** (ya existe) — pasa de renderizar un solo
  `DailyPuzzleHero` a mapear los juegos `available` en `GAMES` y renderizar
  una `PuzzleOfDayCard` por cada uno, cada una con su propio puzzle/racha
  calculados independientemente.
- **`components/SudokuBoard.tsx`** — grilla 9x9, separadores visuales más
  gruesos cada bloque de 3x3, celda seleccionada resalta (spec §2) las
  demás celdas con el mismo número que la seleccionada (si tiene un
  valor). Pistas originales (`givens`) se muestran en un estilo distinto
  (más peso de fuente, no editables) de las celdas completadas por el
  usuario.
- **`components/SudokuNumpad.tsx`** — botones 1-9 + borrar, mismo patrón
  táctil que `WordleKeyboard`, también recibe entrada de teclado físico
  (dígitos 1-9, Backspace/Delete, flechas para mover la celda
  seleccionada).
- **`app/jugar/sudoku/page.tsx`** — página del juego: hidratación/resume
  igual que Wordle (spec Wordle §11), restaura `board` desde
  `DailyProgress` si `status === 'in-progress'`, bloquea edición y muestra
  resultado si `status === 'won'`.
- **`data/games.ts`** — Sudoku pasa a `{ available: true, route:
  '/jugar/sudoku' }`.

## 10. Accesibilidad

Cada celda de la grilla es un botón enfocable (`aria-label` con su fila,
columna y valor actual), navegable con flechas de teclado además de
click/tap. El numpad reutiliza el mismo patrón de `aria-label` por tecla
que `WordleKeyboard`. El resaltado de números iguales no es la única señal
de selección: la celda activa también lleva un borde/outline distinto,
no solo color de fondo.

## 11. Testing

Funciones puras nuevas, con tests unitarios Vitest:
- Generador de tableros y removedor de celdas (`scripts/generate-sudoku-puzzles.mjs`
  y su lógica de solver/conteo de soluciones, extraída a `lib/sudoku-solver.ts`
  para poder testearla y para que el propio juego la reuse si hace falta
  validar localmente).
- `getDailySudokuPuzzle` (determinismo, igual patrón que
  `getDailyWordlePuzzle`).
- `filterStoreByGame`, `calculateSudokuStats`.
- Validación de tablero completo contra la solución.

El resto (UI, flujo completo de juego) se verifica manualmente: build sin
errores, resolver un Sudoku de punta a punta, recargar a mitad de partida,
recargar después de resolver (bloqueo de replay), Wordle y Sudoku
funcionando en paralelo el mismo día sin interferirse, estadísticas
separadas mostrando datos correctos por juego, responsive.

## 12. Preparado para la siguiente etapa

- El pool de Sudoku vive en un archivo de datos separado
  (`data/sudoku/puzzles.ts`), mismo patrón que `data/words/`— agregar más
  puzzles después es solo correr el script de nuevo con un pool más
  grande.
- `useDailyProgress` genérico y `DailyProgress` como unión discriminada
  dejan a Connections/Memory el mismo camino que siguió Sudoku: agregar su
  variante a `DailyPuzzle` y `DailyProgress`, su propio pool de datos, su
  propia página de juego sobre `updateDay`, sin tocar la capa de
  persistencia compartida.
