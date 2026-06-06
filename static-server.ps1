param([int]$Port = 8124, [string]$Bind = "localhost")
$root = "C:\Users\miked\OneDrive\Documents\Claude Cowork\avolt-electrical"
$port = $Port

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://${Bind}:$port/")
$listener.Start()
Write-Host "Avolt Electrical static server running at http://localhost:$port/ serving $root"

$worker = {
  param($ctx, $root)
  $mime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css'; '.js'='application/javascript';
             '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.json'='application/json';
             '.ico'='image/x-icon'; '.woff2'='font/woff2'; '.txt'='text/plain' }
  try {
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
    $file = Join-Path $root $path
    if (Test-Path $file -PathType Container) { $file = Join-Path $file 'index.html' }
    elseif ($path.EndsWith('/')) { $file = Join-Path $root ($path + 'index.html') }
    $ctx.Response.KeepAlive = $false
    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentType = $ct
      $ctx.Response.Headers['Cache-Control'] = 'no-store'
      $ctx.Response.StatusCode = 200
      $ctx.Response.Close($bytes, $true)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $ctx.Response.Close($msg, $true)
    }
  } catch {
    try { $ctx.Response.Abort() } catch {}
  }
}

$pool = [RunspaceFactory]::CreateRunspacePool(2, 24)
$pool.Open()
$jobs = New-Object System.Collections.ArrayList

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $ps = [PowerShell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($worker).AddArgument($ctx).AddArgument($root)
    $handle = $ps.BeginInvoke()
    [void]$jobs.Add([pscustomobject]@{ ps=$ps; handle=$handle })
    for ($i = $jobs.Count - 1; $i -ge 0; $i--) {
      if ($jobs[$i].handle.IsCompleted) {
        try { [void]$jobs[$i].ps.EndInvoke($jobs[$i].handle) } catch {}
        $jobs[$i].ps.Dispose()
        $jobs.RemoveAt($i)
      }
    }
  } catch {
    Write-Host "ACCEPT ERR: $($_.Exception.Message)"
  }
}
