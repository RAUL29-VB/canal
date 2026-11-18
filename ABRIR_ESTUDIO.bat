@echo off
title Estudio Stickman Misterio (Local + Voz IA)
cd /d "%~dp0"
echo Iniciando Estudio Stickman Misterio...
echo No cierres esta ventana mientras grabas o generas tu voz clonada.
"voz\.venv\Scripts\python.exe" "voz\servidor.py"
pause
