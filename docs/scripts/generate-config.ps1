# docs/scripts/generate-config.ps1

# Auto-generated. Do not commit.
$liffIds         = $env:LIFF_IDS
$univapayAppId   = $env:UNIVAPAY_APP_ID
$backendEndpoint = $env:BACKEND_ENDPOINT
@"
    // Auto-generated config.js
    export const liffIds = '$liffIds';
    export const univapayAppId = '$univapayAppId';
    export const backendEndpoint = '$backendEndpoint';
"@> ../src/config.js