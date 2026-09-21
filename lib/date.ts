function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function diffInDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const aTime = toLocalMidnight(a).getTime();
  const bTime = toLocalMidnight(b).getTime();
  return Math.round((aTime - bTime) / msPerDay);
}

export function getTodayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const DEBUG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function resolveDebugDate(
  searchParam: string | null,
  isProduction: boolean,
): Date | null {
  if (isProduction || !searchParam) return null;
  if (!DEBUG_DATE_PATTERN.test(searchParam)) return null;

  const [year, month, day] = searchParam.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const isRealCalendarDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isRealCalendarDate ? date : null;
}
