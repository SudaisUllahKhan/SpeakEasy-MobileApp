param([string]$Out = "$PSScriptRoot\..\assets\adaptive-icon.png")

Add-Type -AssemblyName System.Drawing

$W = 1024; $H = 1024
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# Fully transparent background (adaptive icon — OS supplies background color #7C3AED)
$g.Clear([System.Drawing.Color]::Transparent)

function Fill-RoundedRect($g, $brush, $x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc($x,           $y,           $r*2, $r*2, 180, 90)
    $p.AddArc($x+$w-$r*2,  $y,           $r*2, $r*2, 270, 90)
    $p.AddArc($x+$w-$r*2,  $y+$h-$r*2,  $r*2, $r*2,   0, 90)
    $p.AddArc($x,           $y+$h-$r*2,  $r*2, $r*2,  90, 90)
    $p.CloseAllFigures()
    $g.FillPath($brush, $p)
    $p.Dispose()
}

function Fill-PillBar($g, $brush, $x, $y, $w, $h) {
    $r = $w / 2
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc($x, $y, $w, $w, 180, 180)
    $p.AddLine([float]($x+$w), [float]($y+$r), [float]($x+$w), [float]($y+$h-$r))
    $p.AddArc($x, $y+$h-$w, $w, $w, 0, 180)
    $p.AddLine([float]$x, [float]($y+$h-$r), [float]$x, [float]($y+$r))
    $p.CloseAllFigures()
    $g.FillPath($brush, $p)
    $p.Dispose()
}

# White speech bubble on transparent background (purple comes from backgroundColor)
$whiteBubble = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

# Bubble body (smaller padding than main icon so it fits adaptive safe zone)
$bx = 170; $by = 195; $bw = 660; $bh = 440; $br = 78
Fill-RoundedRect $g $whiteBubble $bx $by $bw $bh $br

# Tail
$tail = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(250, 635),
    [System.Drawing.PointF]::new(400, 635),
    [System.Drawing.PointF]::new(215, 790)
)
$g.FillPolygon($whiteBubble, $tail)
$whiteBubble.Dispose()

# Purple sound wave bars inside the white bubble
$purpleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(124, 58, 237))
$barW  = 54
$midY  = 415
$bars = @(
    @{ h = 115; xOff =   0 },
    @{ h = 195; xOff =  94 },
    @{ h = 255; xOff = 188 },
    @{ h = 195; xOff = 282 },
    @{ h = 115; xOff = 376 }
)
$startX = 500 - (376 + 54) / 2

foreach ($b in $bars) {
    Fill-PillBar $g $purpleBrush ($startX + $b.xOff) ($midY - $b.h/2) $barW $b.h
}
$purpleBrush.Dispose()

$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Adaptive icon saved to $Out"
