# Functies voor de ingebouwde Windows PowerShell-publicatie van Diestroyers.xlsm.
function Read-ArchiveAssignment($Serializer, [string] $Path, [string] $Name, [switch] $Projection) {
    $content = [IO.File]::ReadAllText($Path)
    $pattern = '(?s)^\s*window\.' + [regex]::Escape($Name) + '\s*=\s*(?<json>.*?)\s*;\s*'
    if ($Projection) { $pattern += 'window\.ScorebladArchief\.apply\(window\);\s*' }
    $match = [regex]::Match($content, $pattern + '$')
    if (!$match.Success) { throw "Ongeldige archiefbron: $([IO.Path]::GetFileName($Path))." }
    return ,$Serializer.DeserializeObject($match.Groups['json'].Value)
}

function Save-ArchiveBasis([string] $Base, [string] $StageAssets, [string] $VersionPath) {
    if ([IO.File]::ReadAllText((Join-Path $StageAssets 'config-data.js')) -notmatch '"archiefVersie"\s*:') { return }
    $basis = Join-Path $StageAssets 'archief-basis'
    $null = New-Item -ItemType Directory -Path $basis
    foreach ($name in @('config-data.js', 'resultaten-data.js', 'historiek-maand-data.js', 'kpi-detail-data.js')) {
        Copy-Item -LiteralPath (Join-Path $StageAssets $name) -Destination $basis
    }
    Copy-Item -LiteralPath $VersionPath -Destination $basis
    Save-GitHubFile $Base 'assets/archief-data.js' (Join-Path $basis 'archief-data.js')
}

function Get-ArchiveRowPeriod($Row) {
    if ($Row['Periode']) { return [string]$Row['Periode'] }
    return [string]$Row['periode']
}

function Test-ArchiveLegacyCorrection($Correction, $Rows) {
    $matches = @($Rows | Where-Object {
        $_['EntiteitType'] -eq $Correction['type'] -and
        ($Correction['type'] -eq 'Winkel' -or [string]$_['PersoneelsNr'] -ceq [string]$Correction['id'])
    })
    if ($matches.Count -ne 1) { return $false }
    foreach ($field in $Correction['waarden'].Keys) {
        if ($null -eq $matches[0][$field] -or [double]$matches[0][$field] -ne [double]$Correction['waarden'][$field]) { return $false }
    }
    return $true
}

function Update-MonthArchive([string] $WorkAssets, [string] $SitePath, [datetime] $Now = [datetime]::UtcNow) {
    $basis = Join-Path $WorkAssets 'archief-basis'
    if (!(Test-Path -LiteralPath (Join-Path $basis 'archief-data.js') -PathType Leaf)) { return }
    $zone = [TimeZoneInfo]::FindSystemTimeZoneById('Romance Standard Time')
    $current = [TimeZoneInfo]::ConvertTimeFromUtc($Now.ToUniversalTime(), $zone).ToString('yyyy-MM')
    Add-Type -AssemblyName System.Web.Extensions
    $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $serializer.MaxJsonLength = [int]::MaxValue
    $status = Read-ArchiveAssignment $serializer (Join-Path $WorkAssets 'import-status-data.js') 'DIESTROYERS_IMPORT_STATUS'
    if ($status['valid'] -ne $true -or -not ([string]$status['omzetTot']).StartsWith($current + '-') -or
        -not ([string]$status['winkelTot']).StartsWith($current + '-')) { return }
    $fresh = Read-ArchiveAssignment $serializer (Join-Path $WorkAssets 'resultaten-data.js') 'DIESTROYERS_RESULTATEN'
    if (!(@($fresh | Where-Object { $_['EntiteitType'] -eq 'Winkel' -and (Get-ArchiveRowPeriod $_) -eq $current }).Count)) { return }

    $config = Read-ArchiveAssignment $serializer (Join-Path $basis 'config-data.js') 'DIESTROYERS_CONFIG_DATA'
    $projection = Read-ArchiveAssignment $serializer (Join-Path $basis 'archief-data.js') 'DIESTROYERS_ARCHIEF' -Projection
    if ($projection['format'] -ne 1 -or $projection['versie'] -cne $config['archiefVersie']) { throw 'De archiefversies komen niet overeen.' }
    $months = $projection['maanden']
    $version = ConvertFrom-Json -InputObject ([IO.File]::ReadAllText((Join-Path $basis 'dashboard-version.json')))
    if ($version.dataRevision -cnotmatch '^[a-f0-9]{64}$') { throw 'Ongeldige bronrevisie voor afsluiting.' }
    $results = Read-ArchiveAssignment $serializer (Join-Path $basis 'resultaten-data.js') 'DIESTROYERS_RESULTATEN'
    $history = Read-ArchiveAssignment $serializer (Join-Path $basis 'historiek-maand-data.js') 'DIESTROYERS_HISTORIEK_MAAND'
    $details = Read-ArchiveAssignment $serializer (Join-Path $basis 'kpi-detail-data.js') 'DIESTROYERS_KPI_DETAIL'
    $periods = @($results | Where-Object { $_['EntiteitType'] -eq 'Winkel' } | ForEach-Object { Get-ArchiveRowPeriod $_ } |
        Where-Object { $_ -cmatch '^\d{4}-(0[1-9]|1[0-2])$' -and $_ -clt $current -and !$months.ContainsKey($_) } | Sort-Object -Unique)
    if (!$periods.Count) { return }

    $stamp = $Now.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    $files = [System.Collections.Generic.List[string]]::new()
    $archiveDir = Join-Path $SitePath 'archief'
    $null = New-Item -ItemType Directory -Path $archiveDir -Force
    foreach ($period in $periods) {
        $rows = @($results | Where-Object { (Get-ArchiveRowPeriod $_) -ceq $period })
        $corrections = @($config['resultaatCorrecties'] | Where-Object { $_ -and $_['periode'] -ceq $period })
        $waiting = @($corrections | Where-Object { !(Test-ArchiveLegacyCorrection $_ $rows) })
        if ($waiting.Count) {
            Write-ExportLog "WAARSCHUWING [archief]: $period wacht op een oudere Excel-correctie in de publicatie."
            continue
        }
        $snapshot = [ordered]@{
            format = 1
            periode = $period
            afgeslotenOp = $stamp
            bronRevisie = $version.dataRevision
            targetsBijAfsluiting = @($config['targets'] | Where-Object { (Get-ArchiveRowPeriod $_) -ceq $period })
            wijzigingen = @()
            resultaten = $rows
            historiek = @($history | Where-Object { (Get-ArchiveRowPeriod $_) -ceq $period })
            details = @($details | Where-Object { (Get-ArchiveRowPeriod $_) -ceq $period })
        }
        $months.Add($period, $snapshot)
        [IO.File]::WriteAllText((Join-Path $archiveDir "$period.json"), (ConvertTo-Json -InputObject $snapshot -Depth 30 -Compress) + "`n", $utf8)
        $files.Add("archief/$period.json")
    }
    if (!$files.Count) { return }
    $projection['versie'] = $stamp
    $config['archiefVersie'] = $stamp
    $config['version'] = $stamp
    $destination = Join-Path $SitePath 'assets'
    [IO.File]::WriteAllText((Join-Path $destination 'config-data.js'),
        'window.DIESTROYERS_CONFIG_DATA = ' + (ConvertTo-Json -InputObject $config -Depth 30 -Compress) + ";`n", $utf8)
    [IO.File]::WriteAllText((Join-Path $destination 'archief-data.js'),
        'window.DIESTROYERS_ARCHIEF = ' + (ConvertTo-Json -InputObject $projection -Depth 30 -Compress) + ";`nwindow.ScorebladArchief.apply(window);`n", $utf8)
    $files.Add('assets/config-data.js')
    $files.Add('assets/archief-data.js')
    $files
}
