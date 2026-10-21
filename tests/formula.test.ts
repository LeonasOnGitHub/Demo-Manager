import test from 'node:test';
import assert from 'node:assert/strict';
import { baseline, metrics, quarterOf, shiftQuarter, weekdays, validateState, isDate, safeUrl, DAYS_PER_TWO_QUARTERS, type Demo, type State } from '../src/domain.ts';

const state = (): State => ({ version: 1, demos: [], absences: [], settings: { quarters: {} } });
const demo = (id: string, status: Demo['status'] = 'completed', date = '2026-07-10'): Demo => ({ id, status, date, quarter: quarterOf(date), company: 'Test GmbH', contact: '', time: '', hubspot: '', notes: '' });
function withHistory(): State {
  const s = state();
  s.settings.quarters = {
    '2026-Q1': { confirmed: true, historicalDemos: 19, historicalCredit: 4 },
    '2026-Q2': { confirmed: true, historicalDemos: 14, historicalCredit: 4 },
  };
  s.absences = [{ id: 'q1', quarter: '2026-Q1', days: 10, kind: 'vacation', note: '' }, { id: 'q2', quarter: '2026-Q2', days: 5, kind: 'sick', note: '' }, { id: 'q3', quarter: '2026-Q3', days: 8, kind: 'combined', note: '' }];
  return s;
}
test('quarter boundaries and year rollover', () => {
  assert.equal(quarterOf('2026-03-31'), '2026-Q1');
  assert.equal(quarterOf('2026-04-01'), '2026-Q2');
  assert.equal(shiftQuarter('2026-Q1', -1), '2025-Q4');
  assert.equal(shiftQuarter('2026-Q1', -2), '2025-Q3');
  assert.equal(shiftQuarter('2026-Q4', 1), '2027-Q1');
  assert.equal(weekdays('2026-Q1'), 64);
});
test('user example: 33 actual plus 8 credited demos divided by fixed 130.2 days', () => {
  const s = withHistory();
  const m = metrics(s, '2026-Q3');
  assert.equal(DAYS_PER_TWO_QUARTERS, 130.2);
  assert.equal(m.rate, 41 / 130.2);
  assert.equal(m.rate!.toFixed(3), '0.315');
  assert.equal(m.credit, (41 / 130.2) * 8);
  assert.equal(baseline(s, '2026-Q1').total, 23);
  assert.equal(baseline(s, '2026-Q2').total, 18);
  s.absences[0].days = 30;
  assert.equal(metrics(s, '2026-Q3').rate, 41 / 130.2);
});
test('missing or unconfirmed history stays unknown, not zero', () => {
  const s = withHistory();
  delete s.settings.quarters['2026-Q1'];
  assert.equal(metrics(s, '2026-Q3').credit, null);
  assert.equal(metrics(s, '2026-Q3').rate, null);
  assert.equal(metrics(s, '2026-Q4').credit, 0);
});
test('confirmed zero demos and zero credits are valid', () => {
  const s = withHistory();
  for (const c of Object.values(s.settings.quarters)) { c.historicalDemos = 0; c.historicalCredit = 0; }
  assert.equal(metrics(s, '2026-Q3').credit, 0);
});
test('earlier credits roll into the next two-quarter average without intermediate rounding', () => {
  const s = withHistory();
  s.settings.quarters['2026-Q3'] = { confirmed: true, historicalDemos: 20, historicalCredit: null };
  s.absences.push({ id: 'q4', quarter: '2026-Q4', days: 3.5, kind: 'sick', note: '' });
  const q3Credit = 41 / 130.2 * 8;
  const q4Rate = (18 + 20 + q3Credit) / 130.2;
  assert.equal(baseline(s, '2026-Q3').credit, q3Credit);
  assert.equal(metrics(s, '2026-Q4').rate, q4Rate);
  assert.equal(metrics(s, '2026-Q4').credit, q4Rate * 3.5);
  assert.notEqual(q3Credit, 0.315 * 8);
});
test('missing starting credit blocks the dependent chain, explicit zero starts it', () => {
  const s = withHistory();
  s.settings.quarters['2026-Q1'].historicalCredit = null;
  assert.equal(metrics(s, '2026-Q3').rate, null);
  s.settings.quarters['2026-Q1'].historicalCredit = 0;
  assert.equal(metrics(s, '2026-Q3').rate, 37 / 130.2);
});
test('only completed demos count; plans affect forecast only', () => {
  const s = state();
  s.demos = [demo('1'), demo('2', 'planned'), demo('3', 'cancelled'), demo('4', 'review')];
  const m = metrics(s, '2026-Q3');
  assert.equal(m.total, 1); assert.equal(m.forecast, 2); assert.equal(m.review, 1);
});
test('bonus and target thresholds use unrounded values', () => {
  const s = state();
  s.demos = Array.from({ length: 21 }, (_, i) => demo(String(i)));
  assert.equal(metrics(s, '2026-Q3').bonusReached, true);
  assert.equal(metrics(s, '2026-Q3').targetReached, false);
  s.demos.pop(); assert.equal(metrics(s, '2026-Q3').bonusReached, false);
  s.demos = Array.from({ length: 30 }, (_, i) => demo(String(i)));
  assert.equal(metrics(s, '2026-Q3').targetReached, true);
  const fractional = withHistory();
  fractional.demos = Array.from({ length: 20 }, (_, i) => demo(String(i)));
  fractional.absences[2].days = 1;
  fractional.settings.quarters['2026-Q1'] = { confirmed: true, historicalDemos: 130, historicalCredit: 0 };
  fractional.settings.quarters['2026-Q2'] = { confirmed: true, historicalDemos: 0, historicalCredit: 0 };
  assert.equal(metrics(fractional, '2026-Q3').total.toFixed(2), '21.00');
  assert.equal(metrics(fractional, '2026-Q3').bonusReached, false);
});
test('unresolved imports block history unless a confirmed historic total replaces them', () => {
  const s = withHistory();
  s.settings.quarters['2026-Q1'].historicalDemos = null;
  s.demos = [demo('1', 'completed', '2026-01-10'), demo('2', 'review', '2026-01-11')];
  assert.equal(metrics(s, '2026-Q3').rate, null);
  s.demos[1].status = 'cancelled';
  assert.equal(metrics(s, '2026-Q3').rate, (1 + 4 + 14 + 4) / 130.2);
});
test('backup validation rejects unsafe, invalid and inconsistent records', () => {
  const s = withHistory(); assert.equal(validateState(s), true);
  s.demos = [demo('1')]; assert.equal(validateState(s), true);
  s.demos[0].hubspot = 'javascript:alert(1)'; assert.equal(validateState(s), false);
  s.demos[0].hubspot = ''; s.demos[0].quarter = '2026-Q1'; assert.equal(validateState(s), false);
  s.demos = []; s.absences[0].days = 100; assert.equal(validateState(s), false);
  s.absences[0].days = 10; s.settings.quarters['2026-Q1'].historicalCredit = -1; assert.equal(validateState(s), false);
  assert.equal(validateState({}), false);
  assert.equal(isDate('2026-02-30'), false);
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(safeUrl('javascript:alert(1)'), '');
});
