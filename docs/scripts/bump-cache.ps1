# docs/scripts/bump-cache.ps1
$ErrorActionPreference = 'Stop'

$ver  = (Get-Date).ToString('yyyyMMdd-HHmmss')
$path = Join-Path $PSScriptRoot '..\..\docs\index.html' | Resolve-Path

# --- ここがポイント：UTF-8 を強制して読み込み ---
$content = Get-Content -LiteralPath $path -Raw -Encoding utf8

# 参照を main.js?v=YYYYMMDD-HHMMSS に統一
$content = $content -replace 'src="./src/main\.[^"]+\.js"',      "src=""./src/main.js?v=$ver"""
$content = $content -replace 'src="./src/main\.js(\?v=[^"]+)?"', "src=""./src/main.js?v=$ver"""

# --- UTF-8（BOM なし）で安全に書き込み ---
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)

# コンソールの文字化けを避けるため ASCII だけで出力
Write-Host ("Updated index.html -> main.js?v={0}" -f $ver)
