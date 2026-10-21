import type { State } from './domain';
import { validateState } from './domain';

const KEY = 'demo-manager-v1';
const sources = import.meta.glob('./data/imported.json', { eager: true, import: 'default' });
const imported = Object.values(sources)[0] as Pick<State, 'demos' | 'absences' | 'importInfo'> | undefined;
export function initialState(): State {
  return { version: 1, demos: imported?.demos ?? [], absences: imported?.absences ?? [], importInfo: imported?.importInfo, settings: { denominator: 'worked', quarters: {} } };
}
export function loadState(): { state: State; error: string } {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return { state: initialState(), error: '' };
    const parsed: unknown = JSON.parse(saved);
    if (!validateState(parsed)) throw new Error('Ungültige gespeicherte Daten');
    return { state: parsed, error: '' };
  } catch {
    return { state: initialState(), error: 'Die gespeicherten Daten konnten nicht geladen werden. Änderungen bleiben bis zum nächsten erfolgreichen Speichern nur in dieser Sitzung. Die ursprünglichen Excel-Daten werden angezeigt.' };
  }
}
export function saveState(state: State) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
