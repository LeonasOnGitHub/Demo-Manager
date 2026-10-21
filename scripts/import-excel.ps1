param([string]$Path, [string]$Output = 'src/data/imported.json')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$book = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Path))
function Read-ZipText($name) {
  $reader = [IO.StreamReader]::new($book.GetEntry($name).Open())
  try { $reader.ReadToEnd() } finally { $reader.Dispose() }
}
try {
  [xml]$strings = Read-ZipText 'xl/sharedStrings.xml'
  $shared = @($strings.sst.si | ForEach-Object { $_.InnerText })
  [xml]$sheet = Read-ZipText 'xl/worksheets/sheet1.xml'
  $records = [Collections.Generic.List[object]]::new()
  $seen = @{}
  $duplicates = 0
  $quarter = ''
  foreach ($row in $sheet.worksheet.sheetData.row) {
    $cells = @{}
    foreach ($cell in $row.c) {
      $v = [string]$cell.v
      if ($cell.t -eq 's') { $v = $shared[[int]$v] }
      if ($cell.t -eq 'inlineStr') { $v = $cell.is.InnerText }
      $cells[($cell.r -replace '\d','')] = $v.Trim()
    }
    if ($cells.C -match '^Q([1-4]) (\d{4})$') { $quarter = "$($Matches[2])-Q$($Matches[1])" }
    if ($cells.D -and $cells.E -and $cells.F -match '^https://app-eu1.hubspot.com/') {
      $date = ''
      $issues = [Collections.Generic.List[string]]::new()
      $serial = 0.0
      if ([double]::TryParse($cells.C, [ref]$serial) -and $serial -gt 40000 -and $serial -lt 70000) {
        $date = ([datetime]'1899-12-30').AddDays($serial).ToString('yyyy-MM-dd')
      } else { $issues.Add("Datum fehlt oder ist ungültig (Excel: '$($cells.C)').") }
      $key = "$date|$($cells.D)|$($cells.E)"
      if ($seen.ContainsKey($key)) { $duplicates++; $seen[$key].sourceRows += [int]$row.r; continue }
      if ($date) {
        $d = [datetime]$date
        $actualQuarter = "$($d.Year)-Q$([math]::Ceiling($d.Month / 3))"
        if ($quarter -ne $actualQuarter) { $issues.Add("Excel-Abschnitt $quarter weicht vom Termindatum ab; nach Datum zugeordnet.") }
      } else { $actualQuarter = $quarter }
      $record = [pscustomobject]@{
        id = "excel-$($row.r)"; company = $cells.E; contact = $cells.D; date = $date; time = ''
        quarter = $actualQuarter; status = 'review'; hubspot = $cells.F; notes = ''
        sourceRows = @([int]$row.r); issues = @($issues.ToArray())
      }
      $seen[$key] = $record
      $records.Add($record)
    }
  }
  $payload = @{
    demos = @($records.ToArray())
    absences = @(
      @{ id='excel-absence-q1'; quarter='2026-Q1'; kind='combined'; days=13; note='Excel H69: Krank + Urlaub, nicht nach Art aufgeteilt' },
      @{ id='excel-absence-q2'; quarter='2026-Q2'; kind='combined'; days=13; note='Excel H87: Krank + Urlaub, nicht nach Art aufgeteilt' },
      @{ id='excel-absence-q3'; quarter='2026-Q3'; kind='combined'; days=8; note='Excel H127: Krank + Urlaub, nicht nach Art aufgeteilt' }
    )
    importInfo = @{ source='LM_Demos_Vertieb.xlsx'; duplicates=$duplicates; count=$records.Count; note='Status nicht eindeutig. Alle Demos bitte prüfen. Leerer zweiter Q3-Abschnitt nicht importiert; dessen Zusammenfassungswerte sind keine einzelnen Demos.' }
  }
  $dir = Split-Path $Output -Parent
  if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [IO.File]::WriteAllText((Join-Path (Get-Location) $Output), ($payload | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
  Write-Output "Imported $($records.Count) records; merged $duplicates exact duplicates."
} finally { $book.Dispose() }
