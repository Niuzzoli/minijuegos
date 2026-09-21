# Daily Puzzles — Diseño (v1: Wordle)

Fecha: 2026-09-21
Estado: Aprobado para plan de implementación

## 1. Objetivo

Construir **Daily Puzzles**, una web de puzzles diarios sin backend. Cada día
existe un puzzle distinto, determinado de forma determinística a partir de la
fecha local del usuario. El progreso, la racha y las estadísticas se guardan
exclusivamente en `localStorage`.

Esta v1 implementa un único juego completo: **Wordle en español**. La
arquitectura debe permitir agregar Sudoku, Connections y Memory más adelante
sin reescribir las capas de fecha, persistencia o layout.

## 2. Alcance de la v1

Incluye:
- Página "Hoy" con el puzzle del día y estado de racha.
- Wordle completo (juego, teclado, resultado, compartir).
- Página "Juegos" (Wordle disponible; Sudoku/Connections/Memory bloqueados
  como "próximamente").
- Página "Estadísticas" calculada desde localStorage.
- Tema claro/oscuro con toggle.
- Detección de cambio de día sin timers permanentes.

Explícitamente fuera de alcance en v1:
- Cualquier backend, base de datos, autenticación o cuentas de usuario.
- Implementación real de Sudoku, Connections o Memory (solo su lugar en la UI).
- PWA/instalable.
- Tests automatizados de UI/componentes (solo lógica pura).

## 3. Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS + `motion`
(animaciones) + `lucide-react` (iconos). Persistencia: `localStorage`.
Gestor de paquetes: npm.

## 4. Arquitectura de carpetas

```
/app
  layout.tsx                → fuentes, ThemeProvider, Header
  page.tsx                  → "Hoy": hero + puzzle del día + racha
  /jugar/wordle/page.tsx    → pantalla de juego activo
  /juegos/page.tsx          → listado de juegos
  /estadisticas/page.tsx    → estadísticas + distribución de intentos
/components
  Header, ThemeToggle, PageTransition
  GameCard, DailyPuzzleHero, StreakDisplay
  WordleBoard, WordleKeyboard, ResultModal, ShareButton
  StatsPanel
/lib
  date.ts            → getTodayKey, diffInDays, parseDebugDate
  daily-puzzle.ts    → getDailyPuzzle(date)
  storage.ts         → lectura/escritura de progreso en localStorage
  streak.ts          → cálculo de racha actual y mejor racha
  wordle-engine.ts   → evaluación de intentos (función pura)
  stats.ts           → agregación de estadísticas desde el progreso guardado
/data
  words/solutions.ts      → ~500 palabras solución (sin tildes, con Ñ)
  words/valid-guesses.ts  → superset de palabras aceptadas como intento
  games.ts                → metadata de juegos (id, nombre, estado disponible/próximamente)
/types
  daily-puzzle.ts, game-result.ts, wordle.ts, user-stats.ts, daily-progress.ts
```

## 5. Modelo de datos

### DailyPuzzle (discriminado por juego, extensible)

```ts
type DailyPuzzle =
  | { id: string; date: string; game: 'wordle'; solution: string }
  // futuras variantes: { game: 'sudoku'; data: SudokuPuzzleData } etc.
```

Solo existe la variante `wordle` en v1. Agregar un juego futuro significa
sumar una variante a la unión, no tocar la lógica de fecha ni persistencia.

### DailyProgress (persistido)

```ts
type DailyProgress = {
  game: string;               // 'wordle', futuro: 'sudoku', etc.
  status: 'in-progress' | 'won' | 'lost';
  attempts: WordleAttempt[];  // intentos ya realizados ese día
  completedAt?: string;       // ISO timestamp, solo si status !== 'in-progress'
};

type WordleAttempt = {
  guess: string;
  result: ('correct' | 'present' | 'absent')[]; // por letra
};
```

### Persistencia

Una sola clave en `localStorage`: `daily-puzzles-progress-v1`.

```ts
type ProgressStore = Record<string /* YYYY-MM-DD */, DailyProgress>;
```

El sufijo `-v1` permite migrar el formato en el futuro sin colisionar con
datos ya guardados por usuarios existentes.

### UserStats (derivado, no persistido aparte)

Calculado en `stats.ts` a partir de `ProgressStore`: puzzles jugados, puzzles
ganados, % de victorias, racha actual, mejor racha, distribución de intentos
(conteo de partidas ganadas en 1..6 intentos).

## 6. Fecha y cambio de día

- `getTodayKey()`: devuelve `YYYY-MM-DD` usando año/mes/día **locales** del
  dispositivo (`getFullYear`/`getMonth`/`getDate`), nunca UTC, para evitar
  que el cambio de día ocurra en el horario incorrecto según el huso horario
  del usuario.
- En desarrollo (`NODE_ENV !== 'production'`), un query param
  `?debugDate=2026-09-25` sobreescribe `getTodayKey()` para poder probar
  distintos días sin esperar. Ignorado por completo en producción.
- Detección de cambio de día: se recalcula `getTodayKey()` al montar la app,
  en el evento `visibilitychange` y al recuperar el foco de la ventana. Si
  cambió respecto del valor en memoria, se recarga el puzzle correspondiente
  a la nueva fecha. No se usa `setInterval` ni ninguna tarea programada a
  medianoche.

## 7. Puzzle diario determinístico

`getDailyPuzzle(date: Date): DailyPuzzle`:

1. Calcula `diasDesdeLanzamiento = diffInDays(date, LAUNCH_DATE)`, con
   `LAUNCH_DATE` como constante fija (fecha de lanzamiento del producto).
2. `index = diasDesdeLanzamiento % solutions.length` (siempre no negativo).
3. Devuelve `{ id: 'wordle-' + index, date: getTodayKey(date), game: 'wordle',
   solution: solutions[index] }`.

Es puro y determinístico: la misma fecha siempre produce el mismo resultado,
sin aleatoriedad ni estado externo. Cuando el pool de soluciones se agote,
el ciclo se reinicia automáticamente (ampliar `solutions.ts` es la única
acción necesaria para extender la cobertura).

## 8. Racha

Se deriva de las fechas en `ProgressStore` con `status === 'won'`, ordenadas:

- **Racha actual**: cuenta hacia atrás días calendario consecutivos desde la
  fecha ganada más reciente, pero solo se considera "vigente" (no rota) si
  esa fecha es hoy o ayer — así no se resetea a las 00:01 antes de que el
  usuario haya tenido oportunidad de jugar el nuevo día.
- **Mejor racha**: la racha consecutiva más larga en todo el historial.

## 9. Wordle

- Palabra de 5 letras, 6 intentos, sin tildes, con **Ñ** como letra propia
  (ej. `PIÑAS` es válida; `NIÑO` normaliza tildes pero no la Ñ).
- `wordle-engine.ts` expone una función pura `evaluateGuess(guess, solution)`
  que devuelve el estado por letra (`correct` / `present` / `absent`),
  manejando correctamente letras repetidas (algoritmo estándar de Wordle:
  primero se marcan las posiciones exactas, luego se reparten las presentes
  respetando el conteo restante de cada letra en la solución).
- Diccionario: `solutions.ts` (~500 palabras curadas como soluciones
  jugables) y `valid-guesses.ts` (superset más amplio de palabras aceptadas
  como intento válido, incluye todas las soluciones más otras palabras
  comunes de 5 letras).
- Entrada por teclado físico y por teclado visual en pantalla (mismo
  manejador de eventos para ambos).
- Estado persistido intento a intento en `DailyProgress.attempts`, así un
  refresh a mitad de partida restaura exactamente los intentos ya jugados.

## 10. Compartir resultado

Botón "Compartir" genera un texto tipo:

```
DAILY PUZZLES
21/09/2026
🟩🟩⬜🟨🟩
🟩🟩🟩🟩🟩
4/6
🔥 7 días
```

Nunca incluye la palabra solución. Usa `navigator.share` (Web Share API) si
está disponible; si no, copia al portapapeles vía `navigator.clipboard` y
muestra un feedback "¡Copiado!" temporal.

## 11. SSR e hidratación

Todo acceso a `localStorage` vive dentro de hooks (`useDailyProgress`,
`useTheme`) que:
1. En el render inicial (servidor y primer render cliente) devuelven un
   estado neutro ("no cargado todavía").
2. En `useEffect` (solo cliente) leen `localStorage` y actualizan el estado.

Se acepta un flash mínimo tipo skeleton mientras hidrata; es el patrón
estándar para evitar hydration mismatch en Next.js App Router con datos que
solo existen en el navegador.

## 12. Visual

- Tema dual claro/oscuro: variables CSS + clase en `<html>`, preferencia
  persistida en `localStorage`, por defecto sigue `prefers-color-scheme`,
  toggle manual en el header.
- Tipografía: **Space Grotesk** (títulos/logo) + **Inter** (texto), cargadas
  vía `next/font/google`.
- Iconos: `lucide-react`. Animaciones: paquete `motion`.
- Identidad: minimalista, un acento de color por estado (no una paleta
  competida), microinteracciones puntuales (aparición de letras, acierto,
  error, apertura de modal de resultado, transición entre páginas),
  evitando animación constante o decorativa sin propósito.

## 13. Componentes principales

`Header`, `ThemeToggle`, `PageTransition`, `GameCard`, `DailyPuzzleHero`,
`StreakDisplay`, `WordleBoard`, `WordleKeyboard`, `ResultModal`,
`ShareButton`, `StatsPanel`. Cada uno con responsabilidad única; la lógica
de juego, fecha y persistencia vive en `/lib`, no en los componentes.

## 14. Testing

- Tests unitarios (Vitest) para las funciones puras de `/lib`:
  `getTodayKey`, `getDailyPuzzle`, `evaluateGuess`, cálculo de racha y de
  estadísticas. Son el corazón de la lógica de negocio y son triviales de
  testear al ser puras.
- El resto del flujo (UI, integración completa) se verifica manualmente:
  build sin errores de TypeScript/lint, flujo completo de Wordle, persistencia
  tras recargar, cambio de puzzle entre días (vía `?debugDate`), bloqueo de
  replay el mismo día, responsive en mobile/tablet/desktop.

## 15. Accesibilidad

Navegación básica por teclado (tab/enter en botones y teclado virtual),
`aria-label` en botones de ícono (compartir, cerrar modal, toggle de tema),
buen contraste en ambos temas, estados de letra en Wordle señalizados con
color **y** un indicador adicional (no dependen solo del color) para
usuarios con daltonismo.

## 16. Preparado para la siguiente etapa

- `games.ts` ya modela Sudoku/Connections/Memory como entradas
  "próximamente"; agregar un juego real implica: nueva variante en
  `DailyPuzzle`, nuevo motor puro en `/lib`, nuevos componentes de juego, y
  extender `getDailyPuzzle` para elegir juego+puzzle del día (hoy siempre
  devuelve Wordle porque es el único disponible).
- El formato de persistencia versionado (`-v1`) deja lugar para migraciones
  futuras sin perder el progreso de usuarios existentes.
