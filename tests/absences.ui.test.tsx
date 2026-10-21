import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { State } from '../src/domain';

let container: HTMLDivElement;
let root: Root;
const key = 'demo-manager-v1';
const fixture = (): State => ({
  version: 1, demos: [], absences: [], settings: { quarters: {
    '2026-Q2': { confirmed: true, historicalDemos: 14, historicalCredit: 4 },
    '2026-Q3': { confirmed: true, historicalDemos: 19, historicalCredit: 3 },
  } },
});
function mount(state = fixture()) {
  localStorage.setItem(key, JSON.stringify(state));
  act(() => root.render(<App/>));
  clickButton('Abwesenheiten');
}
function click(element: Element) { act(() => (element as HTMLElement).click()); }
function clickButton(text: string, scope: ParentNode = container) {
  const button = [...scope.querySelectorAll('button')].find(b => b.textContent?.trim() === text);
  expect(button, text).toBeDefined();
  click(button!);
}
function dialog() { return container.querySelector('dialog')!; }
function fill(name: string, value: string) {
  const input = dialog().querySelector<HTMLInputElement>('input[name="' + name + '"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function choose(kind: string) { click(dialog().querySelector('input[name="kind"][value="' + kind + '"]')!); }
function saved(): State { return JSON.parse(localStorage.getItem(key)!); }
function stat(label: string) {
  return [...container.querySelectorAll('.stat-card')].find(c => c.querySelector('.stat-top')?.textContent === label)!.querySelector('.stat-value')!.textContent;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); localStorage.clear(); vi.useRealTimers(); });

describe('Abwesenheiten erfassen und korrigieren', () => {
  it('speichert 3 Krankheitstage und 5,5 Urlaubstage getrennt, auch nach erneutem Laden', () => {
    mount();
    clickButton('Abwesenheit erfassen');
    choose('sick'); fill('days', '3');
    expect(dialog().querySelector('.absence-save-summary')!.textContent).toContain('3 Tage Krankheit');
    clickButton('Speichern', dialog());

    clickButton('Abwesenheit erfassen');
    expect(dialog().querySelector('input[name="kind"]:checked')).toBeNull();
    choose('vacation'); fill('days', '5.5');
    expect(dialog().querySelector('.absence-save-summary')!.textContent).toContain('5,5 Tage Urlaub');
    clickButton('Speichern', dialog());
    expect(saved().absences.map(a => [a.kind, a.days])).toEqual([['sick', 3], ['vacation', 5.5]]);
    expect(stat('Urlaub')).toBe('5,5Tage');
    expect(stat('Krankheit')).toBe('3Tage');
    expect(stat('Angerechnete Gutschrift')).toBe('+3Demos');

    act(() => root.unmount()); root = createRoot(container);
    act(() => root.render(<App/>)); clickButton('Abwesenheiten');
    expect(stat('Urlaub')).toBe('5,5Tage');
    expect(stat('Krankheit')).toBe('3Tage');
  });
  it('korrigiert die Art des 5,5-Tage-Eintrags, ohne Tage oder andere Einträge zu verändern', () => {
    const state = fixture();
    state.absences = [
      { id: 'wrong', quarter: '2026-Q4', kind: 'sick', days: 5.5, note: 'Urlaub' },
      { id: 'correct', quarter: '2026-Q4', kind: 'sick', days: 3, note: '' },
    ];
    mount(state);
    click(container.querySelectorAll('[aria-label="Abwesenheit bearbeiten"]')[0]);
    expect(dialog().querySelector<HTMLInputElement>('input[value="sick"]')!.checked).toBe(true);
    choose('vacation'); clickButton('Speichern', dialog());
    expect(saved().absences).toEqual([{ ...state.absences[0], kind: 'vacation' }, state.absences[1]]);
    expect(stat('Urlaub')).toBe('5,5Tage'); expect(stat('Krankheit')).toBe('3Tage');
    click(container.querySelectorAll('[aria-label="Abwesenheit bearbeiten"]')[1]);
    expect(dialog().querySelector<HTMLInputElement>('input[value="sick"]')!.checked).toBe(true);
    expect(dialog().querySelector<HTMLInputElement>('input[name="days"]')!.value).toBe('3');
  });
  it('verlangt eine ausdrückliche Auswahl und verwirft abgebrochene Eingaben', () => {
    mount(); clickButton('Abwesenheit erfassen');
    expect([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Speichern')!.disabled).toBe(true);
    act(() => dialog().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(saved().absences).toHaveLength(0);
    choose('sick'); fill('days', '3'); clickButton('Abbrechen', dialog());
    clickButton('Abwesenheit erfassen');
    expect(dialog().querySelector('input[name="kind"]:checked')).toBeNull();
    choose('vacation'); fill('days', '5.5'); clickButton('Speichern', dialog());
    expect(saved().absences.map(a => [a.kind, a.days])).toEqual([['vacation', 5.5]]);
  });
});
