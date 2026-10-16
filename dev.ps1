# Startet CarMaint lokal unter Windows (ohne Docker).
# Lädt PocketBase beim ersten Start nach .\bin herunter und liest die .env.
#
#   powershell -ExecutionPolicy Bypass -File .\dev.ps1

$ErrorActionPreference = 'Stop'
$PbVersion = '0.40.5'
$Root = $PSScriptRoot
$Exe = Join-Path $Root 'bin\pocketbase.exe'

if (-not (Test-Path $Exe)) {
    Write-Host "PocketBase $PbVersion wird heruntergeladen ..."
    New-Item -ItemType Directory -Force (Join-Path $Root 'bin') | Out-Null
    $zip = Join-Path $env:TEMP "pocketbase_$PbVersion.zip"
    $url = "https://github.com/pocketbase/pocketbase/releases/download/v$PbVersion/pocketbase_${PbVersion}_windows_amd64.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath (Join-Path $Root 'bin') -Force
    Remove-Item $zip
}

# .env laden (KEY=VALUE, Kommentare mit #)
$envFile = Join-Path $Root '.env'
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile -Encoding UTF8) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $value = $Matches[2].Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($Matches[1], $value, 'Process')
        }
    }
} else {
    Write-Warning '.env fehlt - kopiere .env.example nach .env und passe sie an.'
}

$port = if ($env:PORT) { $env:PORT } else { '8090' }
Write-Host "CarMaint laeuft auf http://localhost:$port  (Beenden mit Strg+C)"

& $Exe serve "--http=127.0.0.1:$port" `
    "--dir=$Root\pb_data" `
    "--publicDir=$Root\pb_public" `
    "--hooksDir=$Root\pb_hooks" `
    "--migrationsDir=$Root\pb_migrations" `
    '--encryptionEnv=PB_ENCRYPTION_KEY'
