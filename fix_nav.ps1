$files = @('search.html','dashboard.html','analytics.html','saved.html','history.html','about.html','pricing.html','settings.html')
$dir = 'c:\ffffff\hfghgf\jobhub-ksa'
$oldLine = '      <a href="engines-interactive.html" class="nav-item"><span class="nav-ic">⚙️</span><span>المحركات</span></a>'
$newLines = '      <a href="engines-interactive.html" class="nav-item"><span class="nav-ic">⚙️</span><span>المحركات</span></a>' + "`n" + '      <a href="users.html"               class="nav-item"><span class="nav-ic">👥</span><span>إدارة المستخدمين</span></a>'

foreach ($f in $files) {
    $path = Join-Path $dir $f
    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        if ($content.Contains($oldLine)) {
            $newContent = $content.Replace($oldLine, $newLines)
            [System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
            Write-Host "SUCCESS: $f"
        } else {
            Write-Host "NOT FOUND (pattern missing): $f"
        }
    } else {
        Write-Host "MISSING FILE: $f"
    }
}
