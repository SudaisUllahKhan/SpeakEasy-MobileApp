param([string]$Out = "$PSScriptRoot\..\assets\icon.png")

Add-Type -AssemblyName System.Drawing

$W = 1024; $H = 1024
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$purple = [System.Drawing.Color]::FromArgb(124, 58, 237)   # #7C3AED

# White canvas
$g.Clear([System.Drawing.Color]::White)

function Fill-RoundedRect($g, $brush, $x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc($x,          $y,          $r*2, $r*2, 180, 90)
    $p.AddArc($x+$w-$r*2,  $y,          $r*2, $r*2, 270, 90)
    $p.AddArc($x+$w-$r*2,  $y+$h-$r*2, $r*2, $r*2,   0, 90)
    $p.AddArc($x,          $y+$h-$r*2, $r*2, $r*2,  90, 90)
    $p.CloseAllFigures()
    $g.FillPath($brush, $p)
    $p.Dispose()
}

# Purple rounded rectangle — 864x864 centered, r=200 (Teams-style card shape)
$purpleBrush = New-Object System.Drawing.SolidBrush($purple)
Fill-RoundedRect $g $purpleBrush 80 80 864 864 200
$purpleBrush.Dispose()

# White "SE" — Bold Italic for a stylish slanted monogram
$path   = New-Object System.Drawing.Drawing2D.GraphicsPath
$family = New-Object System.Drawing.FontFamily("Segoe UI")
$style  = [int]([System.Drawing.FontStyle]::Bold -bor [System.Drawing.FontStyle]::Italic)
$format = [System.Drawing.StringFormat]::GenericTypographic

$path.AddString("SE", $family, $style, 600.0, [System.Drawing.PointF]::new(0, 0), $format)

# Scale to 62% of purple box, center inside it
$b       = $path.GetBounds()
$boxW = 864; $boxH = 864; $boxX = 80; $boxY = 80
$scale   = [Math]::Min(($boxW * 0.62) / $b.Width, ($boxH * 0.62) / $b.Height)
$offsetX = $boxX + ($boxW - $b.Width  * $scale) / 2.0 - $b.X * $scale
$offsetY = $boxY + ($boxH - $b.Height * $scale) / 2.0 - $b.Y * $scale

$xform = New-Object System.Drawing.Drawing2D.Matrix($scale, 0.0, 0.0, $scale, $offsetX, $offsetY)
$path.Transform($xform)

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillPath($whiteBrush, $path)
$whiteBrush.Dispose()
$path.Dispose()
$family.Dispose()

$g.Dispose()
$dir = Split-Path $Out -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Icon saved to $Out"
