@echo off
REM scripts/setup-database.bat
REM Setup MySQL database for Laragon on Windows

echo ====================================
echo School QA + RBM Database Setup
echo ====================================
echo.

REM MySQL paths (adjust if your Laragon MySQL path is different)
set MYSQL_PATH=D:\laragon\bin\mysql\mysql-8.0.30\bin
set MYSQL_USER=root
set MYSQL_PASS=
set DB_NAME=okrsdoitung

echo Creating database: %DB_NAME%
echo.

REM Create database
"%MYSQL_PATH%\mysql.exe" -u %MYSQL_USER% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to create database!
    echo Please check:
    echo 1. MySQL is running in Laragon
    echo 2. MySQL path is correct: %MYSQL_PATH%
    echo 3. MySQL user and password are correct
    echo.
    pause
    exit /b 1
)

echo Database '%DB_NAME%' created successfully!
echo.
echo ====================================
echo Next steps:
echo ====================================
echo 1. Make sure .env file has correct DATABASE_URL
echo 2. Run: npm run db:generate
echo 3. Run: npm run db:migrate
echo 4. Run: npm run db:seed
echo.
pause

