# Runs CarMaint locally on Windows (without Docker).
# Downloads PocketBase into .\bin on first start and reads .env.
#
#   powershell -ExecutionPolicy Bypass -File .\dev.ps1

$ErrorActionPreference = 'Stop'
$PbVersion = '0.40.5'
$Root = $PSScriptRoot
$Exe = Join-Path $Root 'bin\pocketbase.exe'

if (-not (Test-Path $Exe)) {
    Write-Host "Downloading PocketBase $PbVersion ..."
    New-Item -ItemType Directory -Force (Join-Path $Root 'bin') | Out-Null
    $zip = Join-Path $env:TEMP "pocketbase_$PbVersion.zip"
    $url = "https://github.com/pocketbase/pocketbase/releases/download/v$PbVersion/pocketbase_${PbVersion}_windows_amd64.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath (Join-Path $Root 'bin') -Force
    Remove-Item $zip
}

# Load .env (KEY=VALUE, comments start with #)
$envFile = Join-Path $Root '.env'
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile -Encoding UTF8) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $value = $Matches[2].Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($Matches[1], $value, 'Process')
        }
    }
} else {
    Write-Warning '.env is missing - copy .env.example to .env and adjust it.'
}

$port = if ($env:PORT) { $env:PORT } else { '8090' }
Write-Host "CarMaint is running at http://localhost:$port  (stop with Ctrl+C)"

& $Exe serve "--http=127.0.0.1:$port" `
    "--dir=$Root\pb_data" `
    "--publicDir=$Root\pb_public" `
    "--hooksDir=$Root\pb_hooks" `
    "--migrationsDir=$Root\pb_migrations" `
    '--encryptionEnv=PB_ENCRYPTION_KEY'
