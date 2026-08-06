@echo off
cd /d "%~dp0"
echo.
echo Cia do Caldinho - instalando dependencias...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nao foi encontrado. Instale a versao LTS em nodejs.org e execute este arquivo novamente.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo.
  echo Nao foi possivel instalar as dependencias.
  pause
  exit /b 1
)
echo.
echo Abrindo o projeto...
call npm run dev
pause
