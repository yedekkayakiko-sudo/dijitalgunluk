@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Once Node.js kurman gerekiyor. Tarayicida indirme sayfasi aciliyor...
  echo Kurduktan sonra bilgisayari yeniden baslatip bu dosyaya tekrar cift tikla.
  start https://nodejs.org
  pause
  exit /b
)
node scripts\dene.mjs
pause
