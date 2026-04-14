@echo off
setlocal

REM Epatri: Astro (4321) + Fastify API (5000) + React admin (5173) in Windows Terminal.
REM Requires: wt.exe (Windows Terminal), Node/npm, npx kill-port (npm i -g kill-port optional).

set "EPATRI_ROOT=D:\NEW\epatri"

wt -w new ^
new-tab --title "Epatri FE" cmd /k "title Epatri Astro && cd /d %EPATRI_ROOT%\frontend && doskey runapp=npm install --silent ^&^& npx kill-port 4321 ^&^& cls ^&^& npm run dev -- --port 4321 && npm install --silent && npx kill-port 4321 && cls && npm run dev -- --port 4321" ; ^
new-tab --title "Epatri BE" cmd /k "title Epatri API && cd /d %EPATRI_ROOT%\backend && doskey runapp=npm install --silent ^&^& npx kill-port 5000 ^&^& cls ^&^& set PORT=5000 ^&^& npm run dev && npm install --silent && npx kill-port 5000 && cls && set PORT=5000 && npm run dev" ; ^
new-tab --title "Epatri Admin" cmd /k "title Epatri Admin && cd /d %EPATRI_ROOT%\admin && doskey runapp=npm install --silent ^&^& npx kill-port 5173 ^&^& cls ^&^& npm run dev -- --port 5173 && npm install --silent && npx kill-port 5173 && cls && npm run dev -- --port 5173"

endlocal
