@echo off
rem J35 M4-3: start game via local http (L1 Ollama direct-connect requires http origin, file:// is CORS-blocked)
cd /d %~dp0
start "longlife-http-server" /min cmd /c "python -m http.server 8000"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8000/index.html"
echo Game served at http://127.0.0.1:8000 (L1 AI-gen enabled if Ollama is running)
echo Close this window to stop.
pause >nul
