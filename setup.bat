@echo off
echo ========================================
echo         Guard Bot - Kurulum
echo ========================================
echo.

echo Node.js surumuyu kontrol ediliyor...
node --version
if %errorlevel% neq 0 (
    echo HATA: Node.js bulunamadi!
    echo Lutfen Node.js yukleyin: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo NVM kullanilarak Node.js 18.20.8 surumune geciliyor...
nvm use 18.20.8
if %errorlevel% neq 0 (
    echo UYARI: NVM bulunamadi veya Node.js 18.20.8 yuklu degil
    echo NVM yuklemek icin: https://github.com/coreybutler/nvm-windows
    echo Veya Node.js 18.20.8 surumunu manuel yukleyin
    echo.
    echo Mevcut Node.js surumuyle devam ediliyor...
)

echo.
echo Bagimliliklari yukleniyor...
npm install
if %errorlevel% neq 0 (
    echo HATA: Bagimliliklari yuklerken hata olustu!
    pause
    exit /b 1
)

echo.
echo ========================================
echo         Kurulum Tamamlandi!
echo ========================================
echo.
echo Sonraki adimlar:
echo 1. .env dosyasini duzenleyin
echo 2. TOKEN, PREFIX ve GUARD_LOG_CHANNEL_ID degerlerini girin
echo 3. Botu baslatmak icin 'baslat.bat' dosyasini calistirin
echo.
echo .env dosyasi ornegi:
echo TOKEN=your_bot_token_here
echo PREFIX=.
echo GUARD_LOG_CHANNEL_ID=your_log_channel_id
echo.
pause