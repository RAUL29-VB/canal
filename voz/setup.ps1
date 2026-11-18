$ErrorActionPreference = "Stop"

Write-Host "=== Instalando entorno local de clonacion de voz (Python 3.11 + CUDA) ===" -ForegroundColor Cyan

# 1. Instalar uv si no existe (permite tener Python 3.11 aislado sin tocar tu Python 3.14)
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando uv con winget..." -ForegroundColor Yellow
    winget install --id=astral-sh.uv -e --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

$vozDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $vozDir

# 2. Crear entorno virtual aislado con Python 3.11
if (-not (Test-Path ".venv")) {
    uv python install 3.11
    uv venv .venv --python 3.11
}

# 3. Instalar PyTorch con soporte CUDA para tu RTX 4050 + chatterbox-tts
Write-Host "Instalando PyTorch CUDA y chatterbox-tts..." -ForegroundColor Yellow
uv pip install --python .venv\Scripts\python.exe torch torchaudio --index-url https://download.pytorch.org/whl/cu124
uv pip install --python .venv\Scripts\python.exe chatterbox-tts

Write-Host "`nInstalacion lista!" -ForegroundColor Green
Write-Host "Siguiente paso:"
Write-Host "1. Graba 10 segundos de tu voz en voz\mi_voz.wav (o .mp3/.m4a)"
Write-Host "2. Ejecuta: .\.venv\Scripts\python.exe clonar_voz.py --voz mi_voz.wav --guion guion_taured_short.txt --salida narracion_short.wav"
