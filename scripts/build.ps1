param(
    [ValidateSet("dev", "build", "test", "vet", "typecheck", "check", "clean")]
    [string]$Task = "check"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName

function Run-Dev {
    Write-Host "==> Starting Wails Dev server..." -ForegroundColor Cyan
    wails dev
}

function Run-Build {
    Write-Host "==> Building fast-ftp production binary..." -ForegroundColor Cyan
    wails build -clean
}

function Run-Test {
    Write-Host "==> Running Go unit tests..." -ForegroundColor Cyan
    go test -v ./...
}

function Run-Vet {
    Write-Host "==> Running Go vet..." -ForegroundColor Cyan
    go vet ./...
}

function Run-Typecheck {
    Write-Host "==> Running TypeScript typecheck..." -ForegroundColor Cyan
    bun run --cwd frontend typecheck
}

function Run-Check {
    Run-Typecheck
    $distPath = Join-Path $ProjectRoot "frontend\dist"
    if (-not (Test-Path $distPath)) {
        Write-Host "==> Building frontend for Go embed..." -ForegroundColor Cyan
        bun run --cwd frontend build
    }
    Run-Vet
    Run-Test
    Write-Host "`nAll checks passed successfully!" -ForegroundColor Green
}

function Run-Clean {
    Write-Host "==> Cleaning build artifacts..." -ForegroundColor Yellow
    $binPath = Join-Path $ProjectRoot "build\bin"
    $distPath = Join-Path $ProjectRoot "frontend\dist"
    if (Test-Path $binPath) { Remove-Item -Recurse -Force $binPath }
    if (Test-Path $distPath) { Remove-Item -Recurse -Force $distPath }
    Write-Host "Clean complete!" -ForegroundColor Green
}

Set-Location $ProjectRoot

if ($Task -eq "dev") { Run-Dev }
elseif ($Task -eq "build") { Run-Build }
elseif ($Task -eq "test") { Run-Test }
elseif ($Task -eq "vet") { Run-Vet }
elseif ($Task -eq "typecheck") { Run-Typecheck }
elseif ($Task -eq "check") { Run-Check }
elseif ($Task -eq "clean") { Run-Clean }
