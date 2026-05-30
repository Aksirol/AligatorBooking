@echo off
chcp 65001 >nul
echo ===================================================
echo     Запуск системи "Алігатор.Запис" (Бета-версія)
echo ===================================================
echo.
echo 1. Перевірка та встановлення залежностей...
call npm install --silent

echo.
echo 2. Ініціалізація бази даних...
call node src/db/init.js

echo.
echo 3. Запуск сервера...
start "Aligator Server" cmd /c "node src/server.js"

echo.
echo 4. Відкриття в браузері...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo Готово! Вікно консолі сервера працює у фоні.
pause