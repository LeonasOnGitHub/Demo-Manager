export type DemoStatus = 'planned' | 'completed' | 'cancelled' | 'review';
export type Demo = {
  id: string; company: string; contact: string; date: string; time: string;
  quarter: string; status: DemoStatus; hubspot: string; notes: string;
  sourceRows?: number[]; issues?: string[];
};
export type Absence = { id: string; quarter: string; kind: 'vacation' | 'sick' | 'combined'; days: number; note: string };
export type QuarterConfig = { confirmed: boolean; historicalDemos: number | null; historicalCredit?: number | null };
export type State = {
  version: 1; demos: Demo[]; absences: Absence[];
  settings: { quarters: Record<string, QuarterConfig> };
  importInfo?: { source: string; duplicates: number; count: number; note: string };
};
export const TARGET = 30;
export const MINIMUM = 21;
export const DAYS_PER_MONTH = 21.7;
export const DAYS_PER_QUARTER = 65.1;
export const DAYS_PER_TWO_QUARTERS = 130.2;
export const statusLabels: Record<DemoStatus, string> = { planned: 'Vereinbart', completed: 'Durchgeführt', cancelled: 'Abgesagt', review: 'Zu prüfen' };
export const absenceLabels = { vacation: 'Urlaub', sick: 'Krankheit', combined: 'Urlaub & Krankheit' };
export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
export const formatNumber = (n: number, digits = 2) => n.toLocaleString('de-DE', { maximumFractionDigits: digits });
export const quarterOf = (date: string) => `${date.slice(0, 4)}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`;
export const quarterLabel = (q: string) => `${q.slice(5)} ${q.slice(0, 4)}`;
export function shiftQuarter(q: string, delta: number) {
  const index = Number(q.slice(0, 4)) * 4 + Number(q.slice(-1)) - 1 + delta;
  return `${Math.floor(index / 4)}-Q${((index % 4) + 4) % 4 + 1}`;
}
export function quarterDates(q: string) {
  const y = Number(q.slice(0, 4)), month = (Number(q.slice(-1)) - 1) * 3;
  return { start: new Date(Date.UTC(y, month, 1)).toISOString().slice(0, 10), end: new Date(Date.UTC(y, month + 3, 0)).toISOString().slice(0, 10) };
}
export function weekdays(q: string) {
  const { start, end } = quarterDates(q);
  let count = 0;
  for (let d = new Date(`${start}T12:00:00Z`); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) count++;
  }
  return count;
}
export const defaultQuarter = (): QuarterConfig => ({ confirmed: false, historicalDemos: null, historicalCredit: null });
type Baseline = { quarter: string; count: number; absence: number; credit: number | null; total: number | null; ready: boolean; config: QuarterConfig };
export function baseline(state: State, q: string, memo = new Map<string, Baseline>()): Baseline {
  const cached = memo.get(q);
  if (cached) return cached;
  const config = state.settings.quarters[q] ?? defaultQuarter();
  const demos = state.demos.filter(d => d.quarter === q);
  const absence = state.absences.filter(a => a.quarter === q).reduce((sum, a) => sum + a.days, 0);
  const count = config.historicalDemos ?? demos.filter(d => d.status === 'completed').length;
  const confirmed = config.confirmed && (config.historicalDemos !== null || !demos.some(d => d.status === 'review'));
  let credit = config.historicalCredit ?? (absence === 0 ? 0 : null);
  if (credit === null && confirmed) {
    const prior = [baseline(state, shiftQuarter(q, -2), memo), baseline(state, shiftQuarter(q, -1), memo)];
    if (prior.every(p => p.ready)) credit = prior.reduce((sum, p) => sum + p.total!, 0) / DAYS_PER_TWO_QUARTERS * absence;
  }
  const result = { quarter: q, count, absence, credit, total: credit === null ? null : count + credit, ready: confirmed && credit !== null, config };
  memo.set(q, result);
  return result;
}
export function metrics(state: State, q: string) {
  const demos = state.demos.filter(d => d.quarter === q);
  const completed = demos.filter(d => d.status === 'completed').length;
  const planned = demos.filter(d => d.status === 'planned').length;
  const review = demos.filter(d => d.status === 'review').length;
  const absenceDays = state.absences.filter(a => a.quarter === q).reduce((sum, a) => sum + a.days, 0);
  const memo = new Map<string, Baseline>();
  const previous = [baseline(state, shiftQuarter(q, -2), memo), baseline(state, shiftQuarter(q, -1), memo)];
  const rate = previous.every(p => p.ready) ? previous.reduce((s, p) => s + p.total!, 0) / DAYS_PER_TWO_QUARTERS : null;
  const credit = absenceDays === 0 ? 0 : rate === null ? null : absenceDays * rate;
  const total = completed + (credit ?? 0);
  return { completed, planned, review, absenceDays, previous, rate, credit, total, forecast: total + planned, bonusReached: total >= MINIMUM, targetReached: total >= TARGET };
}
export const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v;
export const isQuarter = (v: unknown): v is string => typeof v === 'string' && /^(19|20|21)\d{2}-Q[1-4]$/.test(v);
export function safeUrl(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function validateState(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const s = value as State;
  if (s.version !== 1 || !Array.isArray(s.demos) || !Array.isArray(s.absences) || !s.settings || !s.settings.quarters || typeof s.settings.quarters !== 'object') return false;
  const strings = (o: object, keys: string[]) => keys.every(k => typeof (o as Record<string, unknown>)[k] === 'string');
  if (!s.demos.every(d => d && strings(d, ['id', 'company', 'contact', 'date', 'time', 'hubspot', 'notes']) && d.company.trim() && isQuarter(d.quarter) && Object.hasOwn(statusLabels, d.status) && (d.date === '' ? ['review', 'planned', 'cancelled'].includes(d.status) : isDate(d.date) && quarterOf(d.date) === d.quarter) && (d.status !== 'completed' || d.date <= today()) && (!d.hubspot || safeUrl(d.hubspot)) && (!d.issues || Array.isArray(d.issues) && d.issues.every(i => typeof i === 'string')))) return false;
  if (!s.absences.every(a => a && strings(a, ['id', 'note']) && isQuarter(a.quarter) && Object.hasOwn(absenceLabels, a.kind) && Number.isFinite(a.days) && a.days > 0 && a.days <= weekdays(a.quarter))) return false;
  if (new Set(s.demos.map(d => d.id)).size !== s.demos.length || new Set(s.absences.map(a => a.id)).size !== s.absences.length) return false;
  if (!Object.entries(s.settings.quarters).every(([q, c]) => isQuarter(q) && c && typeof c.confirmed === 'boolean' && (c.historicalDemos === null || Number.isInteger(c.historicalDemos) && c.historicalDemos >= 0) && (c.historicalCredit == null || Number.isFinite(c.historicalCredit) && c.historicalCredit >= 0))) return false;
  for (const q of new Set(s.absences.map(a => a.quarter))) {
    if (s.absences.filter(a => a.quarter === q).reduce((sum, a) => sum + a.days, 0) > weekdays(q)) return false;
  }
  return true;
}
