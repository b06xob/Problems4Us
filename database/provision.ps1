#!/usr/bin/env pwsh
# Provision Problems4UsDB on an existing Azure SQL server.
#
# Usage (Azure AD — recommended):
#   .\database\provision.ps1 -Server prius -ResourceGroup Prius_RG
#
# Usage (SQL login):
#   .\database\provision.ps1 -Server prius -ResourceGroup Prius_RG -User wewon2018 -Password "<password>"

param(
    [Parameter(Mandatory = $true)]
    [string]$Server,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [string]$Database = "Problems4UsDB",
    [string]$User = "",
    [string]$Password = "",
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerFqdn = "$Server.database.windows.net"

function Get-SqlCmdPath {
    $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    Write-Host "sqlcmd not found. Installing Microsoft Sqlcmd Tools..."
    winget install Microsoft.Sqlcmd --accept-source-agreements --accept-package-agreements | Out-Null

    $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw "sqlcmd is required. Install from: winget install Microsoft.Sqlcmd"
    }
    return $cmd.Source
}

function Invoke-SqlFile {
    param(
        [string]$SqlCmd,
        [string]$DatabaseName,
        [string]$InputFile
    )

    $args = @("-S", $ServerFqdn, "-d", $DatabaseName, "-C", "-b", "-i", $InputFile)

    if ($User) {
        $args += @("-U", $User, "-P", $Password)
    } else {
        $args += "-G"
    }

    Write-Host "Running $InputFile against $DatabaseName..."
    & $SqlCmd @args
    if ($LASTEXITCODE -ne 0) {
        throw "sqlcmd failed for $InputFile (exit $LASTEXITCODE)"
    }
}

Write-Host "=== Problems4Us Database Provisioning ==="
Write-Host "Server:   $ServerFqdn"
Write-Host "Database: $Database"
Write-Host ""

# Create database via Azure CLI (idempotent)
Write-Host "Ensuring database exists via Azure CLI..."
$dbExists = az sql db show `
    --resource-group $ResourceGroup `
    --server $Server `
    --name $Database `
    2>$null

if (-not $dbExists) {
    az sql db create `
        --resource-group $ResourceGroup `
        --server $Server `
        --name $Database `
        --edition Basic `
        --capacity 5 `
        --max-size 2GB `
        --output none
    Write-Host "Created database '$Database'."
} else {
    Write-Host "Database '$Database' already exists."
}

$sqlcmd = Get-SqlCmdPath

# Apply schema
Invoke-SqlFile -SqlCmd $sqlcmd -DatabaseName $Database -InputFile (Join-Path $PSScriptRoot "schema.sql")

# Apply seed data
if (-not $SkipSeed) {
    Invoke-SqlFile -SqlCmd $sqlcmd -DatabaseName $Database -InputFile (Join-Path $PSScriptRoot "seed.sql")
}

# Verify tables
Write-Host ""
Write-Host "Verifying tables..."
$verifyQuery = @"
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
"@

$verifyFile = Join-Path $env:TEMP "p4u-verify.sql"
Set-Content -Path $verifyFile -Value $verifyQuery

$verifyArgs = @("-S", $ServerFqdn, "-d", $Database, "-C", "-i", $verifyFile)
if ($User) {
    $verifyArgs += @("-U", $User, "-P", $Password)
} else {
    $verifyArgs += "-G"
}

& $sqlcmd @verifyArgs
Remove-Item $verifyFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done. Update your environment:"
Write-Host "  AZURE_SQL_SERVER=$ServerFqdn"
Write-Host "  AZURE_SQL_DATABASE=$Database"
if ($User) {
    Write-Host "  AZURE_SQL_USER=$User"
    Write-Host "  AZURE_SQL_CONNECTION_STRING=Server=tcp:$ServerFqdn,1433;Database=$Database;User ID=$User;Password=<password>;Encrypt=true;"
} else {
    Write-Host "  (Use Azure AD or SQL auth in AZURE_SQL_CONNECTION_STRING)"
}
