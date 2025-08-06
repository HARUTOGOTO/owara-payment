@"
// Auto-generated config.js
export const liffIds         = '$liffIds';
export const univapayAppId   = '$univapayAppId';
export const backendEndpoint = '$backendEndpoint';
"@ > (Join-Path $PSScriptRoot '..\src\config.js')   # ← これで常に docs/src に出力
