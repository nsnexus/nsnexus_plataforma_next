@echo off
title Iniciar Servidor de Desenvolvimento NSNexus Next.js
echo =======================================================
echo   NSNEXUS - INICIANDO AMBIENTE NEXT.JS LOCAL
echo =======================================================
echo.
set "PATH=C:\Users\01543230\AppData\Local\nodejs\node-v20.15.1-win-x64;%PATH%"
echo Servidor rodando em: http://localhost:3000/
echo Pressione Ctrl + C para encerrar o servidor.
echo.
call npm run dev
pause
