# docs/scripts/generate-config.ps1
$ErrorActionPreference = 'Stop'

# --- 受け取り ---
$envMap = [ordered]@{
  'LIFF_IDS_JSON'        = $env:LIFF_IDS_JSON
  'LIFF_IDS'             = $env:LIFF_IDS
  'UNIVAPAY_APP_JWT'     = $env:UNIVAPAY_APP_JWT
  'UNIVAPAY_FORM_ID'     = $env:UNIVAPAY_FORM_ID
  'SITE_BASE_URL'        = $env:SITE_BASE_URL
  'CHECKOUT_RETURN_PATH' = $env:CHECKOUT_RETURN_PATH
  'BACKEND_ENDPOINT'     = $env:BACKEND_ENDPOINT
}
$envMap.Keys | ForEach-Object { if ($envMap[$_] -ne $null) { $envMap[$_] = $envMap[$_].Trim() } }

# --- フォールバック（単一LIFF ID→JSON配列へ）---
if ([string]::IsNullOrWhiteSpace($envMap.LIFF_IDS_JSON) -and
    -not [string]::IsNullOrWhiteSpace($envMap.LIFF_IDS)) {
  $envMap.LIFF_IDS_JSON = '["' + $envMap.LIFF_IDS + '"]'
}

# --- 必須チェック ---
$required = @('LIFF_IDS_JSON','UNIVAPAY_APP_JWT','UNIVAPAY_FORM_ID','SITE_BASE_URL')
$missing = @()
foreach ($k in $required) {
  if ([string]::IsNullOrWhiteSpace($envMap[$k])) { $missing += $k }
}
if ($missing.Count -gt 0) {
  Write-Host "::error::Missing or empty envs -> $($missing -join ', ')"
  exit 1
}

# --- デフォルト ---
if ([string]::IsNullOrWhiteSpace($envMap.CHECKOUT_RETURN_PATH)) { $envMap.CHECKOUT_RETURN_PATH = '/checkout/return.html' }
if ($envMap.BACKEND_ENDPOINT -eq $null) { $envMap.BACKEND_ENDPOINT = '' }

# --- 出力先を堅牢に作成（docs/src）---
$docsDir = Split-Path -Parent $PSScriptRoot      # docs/scripts -> docs
$dstDir  = Join-Path $docsDir 'src'              # docs/src
[System.IO.Directory]::CreateDirectory($dstDir) | Out-Null
$dst = Join-Path $dstDir 'config.js'

# --- 文字列を安全に埋め込む（JWTが壊れない）---
$js = @"
export const liffIds            = @'${($envMap.LIFF_IDS_JSON)}'@;
export const univapayAppId      = @'${($envMap.UNIVAPAY_APP_JWT)}'@;
export const univapayFormId     = @'${($envMap.UNIVAPAY_FORM_ID)}'@;
export const siteBaseUrl        = @'${($envMap.SITE_BASE_URL)}'@;
export const checkoutReturnPath = @'${($envMap.CHECKOUT_RETURN_PATH)}'@;
export const backendEndpoint    = @'${($envMap.BACKEND_ENDPOINT)}'@;
export const appEnv             = "production";
"@

Set-Content -LiteralPath $dst -Value $js -Encoding UTF8

# --- ダイジェスト（機微は出さない）---
$fid = $envMap.UNIVAPAY_FORM_ID
$fidShort = if ($fid.Length -ge 8) { $fid.Substring(0,8) } else { $fid }
Write-Host "✅ wrote $dst"
Write-Host "CONFIG summary: liffIdsLen=$(($envMap.LIFF_IDS_JSON).Length), formId=${fidShort}..., site=$($envMap.SITE_BASE_URL)"
