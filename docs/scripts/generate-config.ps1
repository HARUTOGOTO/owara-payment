# docs/scripts/generate-config.ps1
$ErrorActionPreference = 'Stop'

# 1) 受け取り（空白トリム）
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

# 2) LIFF_IDS_JSON が無ければ LIFF_IDS（単一）から生成
if ([string]::IsNullOrWhiteSpace($envMap.LIFF_IDS_JSON) -and
    -not [string]::IsNullOrWhiteSpace($envMap.LIFF_IDS)) {
  $envMap.LIFF_IDS_JSON = '["' + $envMap.LIFF_IDS + '"]'
}

# 3) 必須の空チェック（どれが欠けてるかを明示）
$required = @('LIFF_IDS_JSON','UNIVAPAY_APP_JWT','UNIVAPAY_FORM_ID','SITE_BASE_URL')
$missing = @()
foreach ($k in $required) {
  if ([string]::IsNullOrWhiteSpace($envMap[$k])) { $missing += $k }
}
if ($missing.Count -gt 0) {
  Write-Error "generate-config.ps1 failed: missing or empty envs -> $($missing -join ', ')"
}

# 4) デフォルト値
if ([string]::IsNullOrWhiteSpace($envMap.CHECKOUT_RETURN_PATH)) { $envMap.CHECKOUT_RETURN_PATH = '/checkout/return.html' }
if ($envMap.BACKEND_ENDPOINT -eq $null) { $envMap.BACKEND_ENDPOINT = '' }

# 5) 出力先を作成
$dstDir = Join-Path $PSScriptRoot '..' | Join-Path -ChildPath 'src'
New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
$dst = Join-Path $dstDir 'config.js'

# 6) ここで “文字列として” 安全に埋め込む（JWT などを壊さない）
#    liffIds は既存コードに合わせて「JSON文字列」をエクスポートする
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
Write-Host "✅ wrote $dst"
# 機密を出さない形でダイジェストを出力
Write-Host "CONFIG summary: liffIds length=$(($envMap.LIFF_IDS_JSON).Length), formId=$($envMap.UNIVAPAY_FORM_ID.Substring(0,8))..., site=$($envMap.SITE_BASE_URL)"
