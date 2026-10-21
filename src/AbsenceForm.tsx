import { useState, type FormEvent } from 'react';
import { Leaf, ShieldCheck, Trash2 } from 'lucide-react';
import { absenceLabels, formatNumber, quarterLabel, type Absence } from './domain';

type Props = {
  item?: Absence;
  quarter: string;
  quarters: string[];
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onDelete: () => void;
};

export default function AbsenceForm({ item, quarter, quarters, onSave, onCancel, onDelete }: Props) {
  const [kind, setKind] = useState<Absence['kind'] | ''>(item?.kind ?? '');
  const [selectedQuarter, setSelectedQuarter] = useState(item?.quarter ?? quarter);
  const [days, setDays] = useState(String(item?.days ?? 1));
  const [note, setNote] = useState(item?.note ?? '');
  return <form onSubmit={onSave}>
    <p className="modal-intro">Erfasse angefallene Abwesenheitstage ohne Wochenenden und Feiertage. Bereits erfasste Tage nicht doppelt eintragen.</p>
    <fieldset className="absence-kind-picker">
      <legend>Art der Abwesenheit auswählen</legend>
      {Object.entries(absenceLabels).map(([value, label]) => <label key={value} className={kind === value ? 'selected' : ''}>
        <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value as Absence['kind'])} required/>
        {value === 'sick' ? <ShieldCheck size={17}/> : <Leaf size={17}/>}
        <span>{label}</span>
      </label>)}
    </fieldset>
    <div className="form-grid">
      <label>Quartal <select name="quarter" value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)}>{quarters.map(q => <option key={q} value={q}>{quarterLabel(q)}</option>)}</select></label>
      <label>Anzahl Arbeitstage <input name="days" type="number" required min="0.5" step="0.5" max="70" value={days} onChange={e => setDays(e.target.value)}/></label>
    </div>
    <label>Notiz <textarea name="note" rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="z. B. Sommerurlaub, 10.–21. August"/></label>
    <div className="absence-save-summary" role="status">
      {kind ? <>Du speicherst: <strong>{formatNumber(Number(days) || 0)} Tage {absenceLabels[kind]}</strong> in {quarterLabel(selectedQuarter)}.</> : 'Bitte Urlaub, Krankheit oder eine kombinierte Abwesenheit auswählen.'}
    </div>
    <div className="modal-footer">
      {item && <button type="button" className="icon-button danger" aria-label="Abwesenheit löschen" onClick={onDelete}><Trash2 size={18}/></button>}
      <button type="button" className="button secondary" onClick={onCancel}>Abbrechen</button>
      <button type="submit" className="button primary" disabled={!kind}>Speichern</button>
    </div>
  </form>;
}
