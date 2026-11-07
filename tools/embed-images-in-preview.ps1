$imgDir = Join-Path $PSScriptRoot "..\public\images\assemblies"
$htmlPath = Join-Path $PSScriptRoot "..\specs\wireframe-orders.html"
$artifactPath = "C:\Users\Shalom\.gemini\antigravity\brain\9ca4bfb9-149a-4b15-bff8-302b762f917a\orders_wireframe.html"

$entries = @()
Get-ChildItem -Path $imgDir -Filter "*.png" | ForEach-Object {
    $sku = $_.BaseName
    $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($_.FullName))
    $entries += "      '$sku': 'data:image/png;base64,$b64'"
}
$mapJs = "    const GENERATED_PNG_MAP = {`n" + ($entries -join ",`n") + "`n    };`n"

$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)

if ($html -notmatch "GENERATED_PNG_MAP") {
    $target = "    function getSvgIllustration("
    $replacement = $mapJs + @"
    function resolveAssemblyImg(skuOrId, customImg) {
      if (customImg) return customImg;
      if (skuOrId && GENERATED_PNG_MAP[skuOrId]) return GENERATED_PNG_MAP[skuOrId];
      return null;
    }

    function getSvgIllustration(
"@
    $html = $html.Replace($target, $replacement)
    $html = $html.Replace("const customImg = item.customImg || catRule?.customImg;", "const customImg = resolveAssemblyImg(item.sku, item.customImg || catRule?.customImg);")
    $html = $html.Replace("r.customImg ? `<img src=""`${r.customImg}""", "resolveAssemblyImg(r.sku, r.customImg) ? `<img src=""`${resolveAssemblyImg(r.sku, r.customImg)}""")
    $html = $html.Replace("s.customImg ? `<img src=""`${s.customImg}""", "resolveAssemblyImg(s.id, s.customImg) ? `<img src=""`${resolveAssemblyImg(s.id, s.customImg)}""")
    $html = $html.Replace("sysObj?.customImg", "resolveAssemblyImg(sysObj?.id, sysObj?.customImg)")
}

[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($artifactPath, $html, [System.Text.Encoding]::UTF8)
Write-Output "Embedded $($entries.Count) PNG images into wireframe-orders.html and artifact orders_wireframe.html"

