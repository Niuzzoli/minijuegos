# Daily Puzzles — Diseño (v3: Connections)

Fecha: 2026-09-22
Estado: Aprobado para plan de implementación

## 1. Objetivo

Agregar **Connections** como tercer juego jugable de Daily Puzzles, en
paralelo con Wordle y Sudoku (specs `2026-09-21-daily-puzzles-design.md` y
`2026-09-22-sudoku-design.md`). Cada juego tiene su propio puzzle diario,
determinístico por fecha, independiente de los otros: un usuario puede
resolver cualquier combinación de los tres juegos en un día dado, cada uno
con su propia racha y estadísticas.

A diferencia de Wordle (pool de palabras) y Sudoku (generado
proceduralmente por script), Connections requiere contenido **curado a
mano**: agrupar 16 palabras en 4 categorías por una razón semántica/
creativa no es algo que se pueda generar algorítmicamente.

## 2. Alcance de la v3

Incluye:
- Connections completo: grilla de 16 items, selección de hasta 4,
  evaluación de intentos, feedback "casi" (one away), límite de 4 errores
  con derrota y revelado de categorías, victoria al resolver las 4.
- Pool de ~60 puzzles curados a mano, en español, con selección diaria
  determinística (mismo esquema que Wordle/Sudoku).
- Compartir resultado como grilla de colores (estilo Wordle, adaptado).
- Página "Juegos" con Connections marcado `available: true`.
- Home ("Hoy") mostrando la tercera tarjeta de puzzle del día.
- Estadísticas de Connections (sección propia, sin distribución de
  intentos — no hay equivalente natural a esa métrica acá).

Explícitamente fuera de alcance en v3:
- Botón "mezclar" (shuffle visual de las celdas).
- Timer/tiempo transcurrido.
- Distribución de errores en estadísticas.
- Dificultad variable del pool (cada puzzle ya trae sus 4 categorías con
  su propio color/dificultad implícita — no hay un nivel de dificultad
  global del puzzle como en Sudoku).
- Memory (sigue "próximamente").

## 3. Modelo de datos

### DailyPuzzle — nueva variante

```ts
type DailyPuzzle =
  | { id: string; date: string; game: 'wordle'; solution: string }
  | { id: string; date: string; game: 'sudoku'; givens: string; solution: string }
  | { id: string; date: string; game: 'connections'; categories: ConnectionsCategory[] };
```

```ts
// types/connections.ts
export type ConnectionsColor = 'yellow' | 'green' | 'blue' | 'purple';

export type ConnectionsCategory = {
  title: string;       // la razón del agrupamiento, oculta hasta resolverla
  color: ConnectionsColor; // amarillo = más fácil, morado = más difícil
  items: string[];      // exactamente 4 palabras/frases
};
```

Cada `DailyPuzzle` de Connections trae exactamente 4 `ConnectionsCategory`
(16 items en total, todos distintos entre sí dentro del mismo puzzle). El
orden de los 4 items dentro de cada categoría y el orden en que se
muestran los 16 en la grilla NO tiene por qué coincidir — la grilla se
mezcla en el cliente al cargar el puzzle (mezcla determinística por fecha,
igual que el resto de la selección diaria, para que un refresh no reordene
la grilla mid-partida — ver §6).

### DailyProgress — nueva variante

```ts
export type DailyProgress =
  | { game: 'wordle'; status: GameStatus; attempts: WordleAttempt[]; completedAt?: string }
  | { game: 'sudoku'; status: 'in-progress' | 'won'; board: SudokuBoard; completedAt?: string }
  | {
      game: 'connections';
      status: GameStatus; // Connections SÍ usa 'lost' (spec §2, a diferencia de Sudoku)
      solvedCategories: ConnectionsCategory[]; // en orden de resolución
      mistakesMade: number; // 0-4
      guessHistory: ConnectionsColor[][]; // colores de cada item por intento enviado, para compartir
      completedAt?: string;
    };
```

`guessHistory` guarda, por cada intento enviado (correcto o no), el color
de categoría real de cada uno de los 4 items elegidos (en el orden en que
el jugador los seleccionó) — así se puede reconstruir la grilla de
colores para compartir sin tener que re-derivar nada del resto del
estado, y sin revelar qué categoría es cada color hasta que esté resuelta.

### Convención de clave de storage (recordatorio, ya fijada)

`ProgressStore` sigue usando la clave compuesta `` `${game}:${dateKey}` ``
fijada en el fix de Sudoku (spec `2026-09-22-sudoku-design.md` §3). Un
progreso de Connections del 2026-09-25 se guarda bajo la clave
`"connections:2026-09-25"`. Ningún código nuevo debe leer/escribir con
`dateKey` a secas como clave del store.

## 4. Contenido: pool curado a mano

`data/connections/puzzles.ts` contiene ~60 entradas de tipo
`{ categories: ConnectionsCategory[] }` (4 categorías de 4 items cada una,
81 palabras... 16 palabras por puzzle). Se escriben a mano como parte del
plan de implementación, en español, siguiendo las convenciones típicas del
género:

- Colores de dificultad ascendente: amarillo (más obvio) → verde → azul →
  morado (más rebuscado/con juego de palabras).
- Al menos una "trampa cruzada" por puzzle: una palabra que razonablemente
  podría pertenecer a más de una categoría a primera vista, para que el
  puzzle tenga la tensión característica del género (no es un requisito
  duro por puzzle, pero sí la norma general del pool).
- Sin repetir la misma palabra dentro de un mismo puzzle (las 16 son
  únicas entre sí).

Un test de datos (`data/connections/puzzles.test.ts`, mismo patrón que
`data/words/words.test.ts` y `data/sudoku/puzzles.test.ts`) valida
estructuralmente cada entrada del pool: exactamente 4 categorías, exactamente
4 items por categoría, 16 items únicos por puzzle, los 4 colores presentes
una vez cada uno, y `pool.length >= 60`.

## 5. Selección diaria

`lib/daily-puzzle.ts` suma `getDailyConnectionsPuzzle(date, puzzles)`,
reutilizando el helper compartido `dailyIndexForPool` (mismo `LAUNCH_DATE`,
mismo esquema que `getDailyWordlePuzzle`/`getDailySudokuPuzzle`) — cada
juego cicla su propio pool a su propio ritmo, sin correlación problemática
entre los tres por compartir la fecha de lanzamiento.

## 6. Orden de la grilla (determinístico, no aleatorio en cada carga)

Los 16 items se muestran mezclados (no agrupados por categoría, sería
trivial resolver el puzzle a simple vista) pero el orden debe ser el
**mismo en cada carga del mismo puzzle** — si se mezclara con
`Math.random()` en cada render, un refresh reordenaría la grilla a mitad
de partida, lo cual es confuso y rompe la sensación de "la celda que
tocaste sigue ahí". Se deriva un orden determinístico a partir del
`puzzle.id` (ej. una función `shuffleDeterministic(items, seed)` usando el
mismo generador `createRng`-style que ya existe en `lib/sudoku-generator.ts`
para Sudoku, con el `id` del puzzle como semilla) — puro, sin estado, se
recalcula igual en cada render a partir del mismo puzzle.

## 7. Reglas del juego

- El jugador selecciona (toggle) hasta 4 celdas de las que quedan sin
  resolver; el botón "Enviar" solo se habilita con exactamente 4
  seleccionadas.
- Al enviar, se evalúa contra las 4 categorías del puzzle:
  - **Las 4 pertenecen a la misma categoría** → acierto: esa categoría se
    anima saliendo de la grilla, aparece como banda arriba con su color y
    su `title` revelado; se agrega a `solvedCategories`.
  - **Exactamente 3 de las 4 pertenecen a la misma categoría** → mensaje
    "¡Uno más!" (one away); cuenta como error (resta uno de los 4
    disponibles) pero sin revelar cuál de las 4 seleccionadas sobra.
  - **Cualquier otro resultado** → error genérico, sin pista adicional.
- Cada intento enviado (acierto o no) se agrega a `guessHistory` con el
  color real de cada uno de los 4 items.
- A los 4 errores acumulados (`mistakesMade === 4`): `status: 'lost'`, se
  revelan las 4 categorías completas (incluidas las no resueltas) con su
  color/título/items tal como están en el dato — el juego queda bloqueado
  por el resto del día.
- Al resolver las 4 categorías: `status: 'won'`, bloqueado por el resto
  del día (mismo patrón de bloqueo que Wordle/Sudoku).
- Sin timer, sin modo notas, sin botón mezclar (spec §2).

## 8. Compartir resultado

Igual que Wordle (`ShareButton`), adaptado: genera una grilla de emojis
por fila de intento a partir de `guessHistory`, mapeando cada color a su
emoji (🟨🟩🟦🟪), en el orden en que se enviaron los intentos — sin
revelar las categorías, solo los colores, igual que el juego original.
Si `status === 'lost'`, el resultado compartido igual muestra la grilla de
intentos (colores, no categorías) — no hay problema en compartir una
derrota, es parte de la cultura del juego.

## 9. UI y componentes

- **`components/ConnectionsGrid.tsx`** — grilla 4x4 de celdas
  seleccionables (toggle, máximo 4 simultáneas), solo muestra los items no
  resueltos aún (los resueltos se sacan de la grilla). Cada celda con
  `aria-label` con su texto y si está seleccionada.
- **`components/ConnectionsCategoryBanner.tsx`** — banda de color con
  `title` + los 4 `items`, una por cada categoría en `solvedCategories`
  (o las 4, si `status === 'lost'`, en cuyo caso las no resueltas se
  muestran igual pero visualmente distinguidas de las que sí acertó el
  jugador).
- **`components/ConnectionsMistakes.tsx`** — indicador de errores
  restantes (4 marcadores, se van "apagando" a medida que `mistakesMade`
  sube), con `aria-label` textual (ej. "Te quedan 2 errores").
- **`app/jugar/connections/page.tsx`** — página del juego, mismo patrón de
  hidratación/resume que Wordle/Sudoku (`if (!hydrated) return null`,
  `useTodayKey`, `useDailyProgress` → `updateDay('connections', ...)`,
  reset de estado local de UI en el cambio de día).
- **`data/games.ts`** — Connections pasa a `available: true, route:
  '/jugar/connections'`.

## 10. Accesibilidad

Cada celda es un botón enfocable con `aria-label` claro; el estado
seleccionado no depende solo del color (outline/borde adicional, mismo
patrón ya corregido en Sudoku — ver spec Sudoku §10 y su fix de contraste).
El indicador de errores restantes tiene equivalente textual, no solo
visual. Las bandas de categoría resuelta llevan el color como fondo pero
el título es texto real, no solo color.

## 11. Estadísticas

`calculateConnectionsStats(store, todayKey): BaseGameStats` (reutiliza el
tipo `BaseGameStats` ya definido en `types/user-stats.ts` — jugados,
ganados, % victorias, racha actual, mejor racha), mismo patrón que
`calculateSudokuStats`: filtra internamente con `filterStoreByGame(store,
'connections')`, sin distribución de intentos (spec §2). La página
`/estadisticas` suma una tercera sección.

## 12. Testing

Funciones puras nuevas, con tests unitarios Vitest:
- `getDailyConnectionsPuzzle` (determinismo, igual patrón que las otras
  dos funciones de selección diaria).
- `shuffleDeterministic` (mismo input + seed → mismo output siempre;
  distintos seeds → distinto orden, para el caso de prueba concreto).
- Evaluación de un intento contra las 4 categorías: acierto, "one away"
  (exactamente 3/4), y error genérico (0, 1 o 2 de 4).
- `data/connections/puzzles.test.ts`: validación estructural del pool
  completo (4 categorías, 4 items c/u, 16 únicos, 4 colores presentes,
  `length >= 60`).
- `calculateConnectionsStats`.

El resto (UI, flujo completo de juego, compartir) se verifica manualmente:
build sin errores, resolver un Connections de punta a punta, perder por 4
errores y ver las categorías reveladas, recargar a mitad de partida
(grilla + errores + categorías resueltas restauradas), recargar después de
terminar (ganado o perdido, bloqueo de replay), los tres juegos jugables
el mismo día sin interferirse entre sí, estadísticas de Connections
correctas, responsive.

## 13. Preparado para la siguiente etapa

Memory queda con el mismo camino que siguieron Sudoku y Connections:
agregar su variante a `DailyPuzzle`/`DailyProgress` (siguiendo la
convención de clave compuesta), su propio pool de datos (curado o
generado según corresponda a su mecánica), su propia página de juego
sobre `updateDay`, sin tocar la capa de persistencia compartida.
