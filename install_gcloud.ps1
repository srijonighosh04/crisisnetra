$ErrorActionPreference = "Stop"
$destPath = "$env:LOCALAPPDATA\Google"
$sdkPath = "$destPath\gcloud-v5" # Use a fresh directory name to avoid lock issues

Write-Host "1/4 Downloading Google Cloud SDK with BUNDLED PYTHON..."
$url = "https://dl.google.com/dl/cloudsdk/channels/rapid/google-cloud-sdk-windows-x86_64-bundled-python.zip"
$zipPath = "$env:TEMP\gcloud-bundled.zip"

if (-Not (Test-Path $zipPath)) {
    Invoke-WebRequest -Uri $url -OutFile $zipPath
}

Write-Host "2/4 Extracting SDK to $sdkPath..."
if (Test-Path $sdkPath) { Remove-Item -Path $sdkPath -Recurse -Force }
if (-Not (Test-Path $destPath)) { New-Item -ItemType Directory -Force -Path $destPath | Out-Null }

# The ZIP contains a 'google-cloud-sdk' folder. We extract and then rename or just use it.
Expand-Archive -Path $zipPath -DestinationPath $destPath -Force
Rename-Item -Path "$destPath\google-cloud-sdk" -NewName "gcloud-v5" -Force

Write-Host "3/4 Initializing SDK..."
Push-Location $sdkPath
cmd.exe /c "install.bat --usage-reporting=false --path-update=true --command-completion=true"
Pop-Location

Write-Host "4/4 Verifying gcloud and Python..."
$binPath = "$sdkPath\bin"
cmd.exe /c "`"$binPath\gcloud.cmd`" version"

Write-Host "Opening login..."
cmd.exe /c "`"$binPath\gcloud.cmd`" auth login --no-launch-browser"
