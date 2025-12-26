# PowerShell script to create .env file for backend

$envContent = @"
MONGO_URI=mongodb://localhost:27017/xpertkarate
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
"@

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env file already exists at: $envPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Cancelled. .env file not created." -ForegroundColor Red
        exit
    }
}

try {
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    Write-Host "✅ .env file created successfully at: $envPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 File contents:" -ForegroundColor Cyan
    Get-Content $envPath
    Write-Host ""
    Write-Host "🚀 You can now start the backend server with: npm run dev" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating .env file: $_" -ForegroundColor Red
    exit 1
}

