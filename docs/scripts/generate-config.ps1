<#
  PowerShell script
  ──────────────────────────────────────────────────────
  • docs/scripts/generate-config.ps1
  • 環境変数から値を取り docs/src/config.js を生成
  • Windows / Linux どちらのランナーでも動く
#>

try {
    # ---------- 取り込む ----------
    $liffIds         = $env:LIFF_IDS
    $univapayAppId   = $env:UNIVAPAY_APP_ID
    $backendEndpoint = $env:BACKEND_ENDPOINT

    if (!$liffIds -or !$univapayAppId -or !$backendEndpoint) {
        throw "One or more env vars are empty."
    }

    # ---------- 出力先 ----------
    $outPath = Join-Path $PSScriptRoot '..\src\config.js'
    $outDir  = Split-Path $outPath

    # フォルダが無ければ作成
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null

    # ---------- ファイル生成 ----------
    @"
// Auto-generated – DO NOT COMMIT
export const liffIds         = '$liffIds';
export const univapayAppId   = '$univapayAppId';
export const backendEndpoint = '$backendEndpoint';
"@ | Out-File -Encoding UTF8 -FilePath $outPath -Force

    Write-Host "✅  generated  $outPath"
    Get-Item $outPath | Format-List -Property FullName, Length, LastWriteTime

} catch {
    Write-Error "❌  generate-config.ps1 failed: $_"
    exit 1
}
