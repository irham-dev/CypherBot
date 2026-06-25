@echo off
echo ===================================================
echo  Start/Run CypherBot...
echo ===================================================

echo Masuk main foldernya...
cd CypherBot

echo 1. Instal module backend...
cd backend
call npm install

echo 2. Start/Run Server backend...
start cmd /k "title Backend Server && node src/server.js"

echo 3. Instal module frontend...
cd ../client
call npm install

echo 4. Start/run server frontend...
start cmd /k "title Frontend Client && npm start"
