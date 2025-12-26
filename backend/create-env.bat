@echo off
REM Batch script to create .env file for backend

echo Creating .env file...

(
echo MONGO_URI=mongodb://localhost:27017/xpertkarate
echo PORT=5000
echo NODE_ENV=development
echo JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
echo JWT_EXPIRE=7d
echo FRONTEND_URL=http://localhost:3000
) > .env

if exist .env (
    echo.
    echo ✅ .env file created successfully!
    echo.
    echo 📝 File contents:
    type .env
    echo.
    echo 🚀 You can now start the backend server with: npm run dev
) else (
    echo ❌ Error: Failed to create .env file
    exit /b 1
)

