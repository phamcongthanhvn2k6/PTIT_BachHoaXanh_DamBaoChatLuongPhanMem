@echo off
echo =================================================================
echo        NAP DU LIEU MAU (SEED DATABASE) - BACH HOA XANH
echo =================================================================
echo.
echo Dang thuc hien nap du lieu vao MongoDB (Mongoose)...
call npm run seed --prefix backend
echo.
echo =================================================================
echo [Hoan thanh] Nap du lieu mau hoan tat!
echo Tai khoan Admin mac dinh:
echo - Email: admin@lottemart.vn
echo - Mat khau: Admin@123
echo =================================================================
echo.
pause
