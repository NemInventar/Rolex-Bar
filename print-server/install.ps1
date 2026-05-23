# Rolex Bar Print Server - Automatisk installation
$folder = "$env:USERPROFILE\rolex-print"
$base = "https://raw.githubusercontent.com/NemInventar/Rolex-Bar/main/print-server"

Write-Host "Opretter mappe: $folder"
New-Item -ItemType Directory -Force -Path $folder | Out-Null

Write-Host "Downloader filer..."
Invoke-WebRequest "$base/package.json"    -OutFile "$folder\package.json"
Invoke-WebRequest "$base/print-server.js" -OutFile "$folder\print-server.js"
Invoke-WebRequest "$base/start.bat"       -OutFile "$folder\start.bat"

Write-Host "Installerer pakker (npm install)..."
Push-Location $folder
npm install
Pop-Location

Write-Host "Tilfojer til Windows-opstart..."
$startup = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$bat = "$folder\start.bat"
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut("$startup\RolexPrint.lnk")
$shortcut.TargetPath = $bat
$shortcut.WindowStyle = 7
$shortcut.Save()

Write-Host "Starter serveren..."
Start-Process -FilePath $bat -WindowStyle Hidden

Write-Host ""
Write-Host "Faerdig! Print-server koerer nu i baggrunden."
Write-Host "Den starter automatisk naeeste gang computeren taendes."
