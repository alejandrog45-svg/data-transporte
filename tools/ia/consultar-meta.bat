@echo off
REM Consulta a Meta AI (sin CLI ni API publica: abre la web con la pregunta copiada).
set IA=meta
set "TITULO=Meta AI"
goto comun

:comun
chcp 65001 >nul
set "PATH=W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\nodejs-portable;E:\nodejs-portable;%PATH%"
cd /d "%~dp0..\.."
if not "%~1"=="" (
  node tools\ia\consultar-ia.js %IA% %*
  goto fin
)
set VACIOS=0
:preguntar
set "PREGUNTA="
set /p PREGUNTA="Pregunta para %TITULO% (o 'salir'): " || goto fin
if /i "%PREGUNTA%"=="salir" goto fin
if "%PREGUNTA%"=="" (
  set /a VACIOS+=1
  if %VACIOS% GEQ 3 goto fin
  goto preguntar
)
set VACIOS=0
node tools\ia\consultar-ia.js %IA% %PREGUNTA%
echo.
goto preguntar
:fin
