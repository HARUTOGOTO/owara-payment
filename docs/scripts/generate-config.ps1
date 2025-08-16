<#
  docs/scripts/generate-config.ps1
  環境変数から docs/src/config.js を生成 (Win/Linux 共通)
#>

#try {
#    $liffIds         = $env:LIFF_IDS
#    $univapayAppId   = $env:UNIVAPAY_APP_ID
#    $backendEndpoint = $env:BACKEND_ENDPOINT

#    if (!$liffIds -or !$univapayAppId -or !$backendEndpoint) {
#        throw "One or more env vars are empty."
#    }

    # 出力先 docs/src/config.js
#    $outPath = Join-Path $PSScriptRoot '../src/config.js'
#    New-Item -ItemType Directory -Force -Path (Split-Path $outPath) | Out-Null

#    @"
#// Auto-generated – DO NOT COMMIT
#export const liffIds         = '$liffIds';
#export const univapayAppId   = '$univapayAppId';
#export const backendEndpoint = '$backendEndpoint';
#"@ | Out-File -Encoding UTF8 -FilePath $outPath -Force

#    Write-Host "✅ generated $outPath"
#    Get-Item $outPath | Format-List FullName,Length,LastWriteTime
#}
#catch {
#    Write-Error "❌ generate-config.ps1 failed: $_"
#    exit 1
#}
