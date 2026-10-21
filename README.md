# Demo Manager

Lokale React-App für die quartalsweise Verwaltung von Vertriebsdemos. Enthält eine Quartalsübersicht, Demo-Verwaltung mit Suche und Statusfiltern, Abwesenheiten, transparente Zielberechnung und JSON-Backups.

## Starten

Voraussetzung: Node.js 22.18+ oder 24 und npm.

```powershell
npm install
npm run dev
```

Die im Terminal angezeigte lokale Adresse im Browser öffnen. `npm run build` erstellt die geprüfte Produktionsversion in `dist/`. `npm run preview` zeigt diesen Build lokal an. `npm test` prüft die Berechnungslogik. `npm run test:ui` prüft Erfassen, Bearbeiten und Speichern der Abwesenheiten in einer isolierten DOM-Testumgebung.

## Regeln

- Ziel: 30 angerechnete Demos pro Quartal. Bonusgrenze: mindestens 21.
- Nur explizit als durchgeführt bestätigte Demos zählen. Vereinbarte Demos zählen ausschließlich zur separat gekennzeichneten Prognose. Abgesagte und ungeprüfte Demos zählen nicht.
- Gutschrift = Abwesenheitstage des ausgewählten Quartals × ((durchgeführte + bereits gutgeschriebene Demos der zwei direkt vorhergehenden Quartale) / 130,2).
- Die Basis ist fest: 21,7 Arbeitstage pro Monat × 6 Monate = 130,2 Tage. Urlaub, Krankheit und Feiertage werden nicht von diesem Nenner abgezogen.
- Beispiel des Nutzers: 33 durchgeführte + 8 gutgeschriebene Demos = 41; 41 / 130,2 = 0,3149001536… Demos je Abwesenheitstag, dargestellt rund 0,315. Das Beispiel ist keine Behauptung über die importierten Ist-Daten.
- Beide historischen Quartale müssen als vollständig bestätigt sein. Bei fehlender Grundlage bleibt die Gutschrift offen. Bestätigte Nullwerte sind gültig. Historische Gesamtzahlen ergänzen fehlende Daten und ersetzen ausschließlich die Zählung für den historischen Tagesdurchschnitt.
- Frühere Gutschriften fließen in den Durchschnitt ein. Ohne manuellen historischen Startwert werden sie automatisch aus ihren eigenen Vorquartalen berechnet. Für die ersten Quartale können bereits erhaltene Gutschriften eingetragen werden; dadurch ist keine endlose Vorgeschichte erforderlich. Fehlende Startwerte bleiben erkennbar offen.
- Die gesamte Abwesenheitsgutschrift wird einmal pro Quartal kaufmännisch auf ganze Demos gerundet: 2,49 → 2; 2,50 → 3; 2,52 → 3. Der Tagessatz bleibt für die Berechnung ungerundet. Einzelne Abwesenheitseinträge werden vor dem Runden zusammengezählt.
- Der Quartalsstand, die Bonusgrenze und die Basis späterer Quartale verwenden die gerundeten Gutschriften. Auch ältere gespeicherte historische Gutschriften mit Nachkommastellen werden bei der Berechnung auf ganze Demos gerundet.
- Abwesenheiten werden als Quartalssummen in halben Tagen gepflegt. Überschneidungen müssen beim Erfassen vermieden werden. Ein Eintrag über Quartalsgrenzen ist auf die betreffenden Quartale aufzuteilen.
- Datum und Quartal werden automatisch gekoppelt. Ohne Datum ist ein vereinbarter Termin möglich, eine durchgeführte Demo benötigt ein Datum bis einschließlich heute (Europe/Berlin).

## Excel-Daten

Die bereitgestellte Arbeitsmappe wird nur gelesen, nicht verändert. Der lokale Import enthält 60 eindeutige Demo-Einträge; sechs identische Wiederholungen werden zusammengeführt. Fehlende/ungültige Termine bleiben offen. Die Werte aus Q1–Q3 2026 für Krankheit und Urlaub werden kombiniert übernommen (13, 13, 8 Tage). Der ursprüngliche Status ist nicht eindeutig und wird deshalb als „Zu prüfen“ importiert. Die App übernimmt keine historischen Excel-Gutschriften, da die neue Zwei-Quartals-Regel maßgeblich ist.

Der Quelldatensatz `src/data/imported.json` ist wegen der personenbezogenen Daten von Git ausgeschlossen. Er wird beim Build lokal eingebunden. Ohne diese Datei startet die App leer. Zum erneuten Import der gleichen Excel-Struktur:

```powershell
./scripts/import-excel.ps1 -Path 'C:/Pfad/LM_Demos_Vertieb.xlsx'
```

Der Import ist auf die Struktur der bereitgestellten Arbeitsmappe ausgerichtet. Vorhandene Browserdaten haben Vorrang vor dem Quelldatensatz. Das Skript ersetzt keine vorhandenen Browserdaten.

## Speicherung

Die App speichert Daten ausschließlich im Local Storage des verwendeten Browsers unter `demo-manager-v1`. Sie hat keinen Server, keine Anmeldung und keine Synchronisierung zwischen Geräten. Regelmäßig ein Backup herunterladen. JSON-Backups können unter Einstellungen validiert und wiederhergestellt werden; davor wird automatisch ein Backup des aktuellen Stands heruntergeladen.

Keine Veröffentlichung erfolgt. Ein Build mit importierten Daten enthält personenbezogene Angaben und ist für den persönlichen lokalen Einsatz vorgesehen. HubSpot-Links öffnen lediglich den vorhandenen CRM-Eintrag. Es gibt keine API-Anbindung.

## Technik

React 19, TypeScript, Vite, Lucide-Icons. Responsive Oberfläche mit nativen modalen Dialogen und Tastaturbedienung. Die Schriftarten DM Sans und Manrope werden optional über Google Fonts geladen; bei fehlender Verbindung greift die lokale Sans-Serif-Schrift.
