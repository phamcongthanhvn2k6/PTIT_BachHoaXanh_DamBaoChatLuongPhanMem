@echo off
echo =================================================================
echo        KHOI DONG DU AN BACH HOA XANH (PTIT SQA)
echo =================================================================
echo.

:: Kiem tra va cai dat dependencies tai thu muc goc
if not exist node_modules (
    echo [1/3] Dang cai dat thu vien tai thu muc goc...
    call npm install
) else (
    echo [1/3] Thu muc goc da duoc cai dat thu vien.
)

:: Kiem tra va cai dat dependencies o backend
if not exist backend\node_modules (
    echo [2/3] Dang cai dat thu vien backend...
    call npm install --prefix backend
) else (
    echo [2/3] Backend da duoc cai dat thu vien.
)

:: Kiem tra va cai dat dependencies o frontend
if not exist fontend\node_modules (
    echo [3/3] Dang cai dat thu vien frontend...
    call npm install --prefix fontend
) else (
    echo [3/3] Frontend da duoc cai dat thu vien.
)

echo.
echo =================================================================
echo [OK] Chuan bi hoan tat!
echo.
echo Vui long dam bao rang:
echo 1. MongoDB dang chay (Localhost hoac Atlas).
echo 2. File .env o thu muc backend va fontend da duoc cau hinh dung.
echo.
echo Dang khoi dong dong thoi ca Backend va Frontend...
echo (Bam Ctrl+C trong Terminal de dung chay)
echo =================================================================
echo.

npm run dev
pause
