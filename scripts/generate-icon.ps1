param([string]$Out = "$PSScriptRoot\..\assets\icon.png")

Add-Type -AssemblyName System.Drawing

$W = 1024; $H = 1024
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode       = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode   = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode     = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality  = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# ── White background ───────────────────────────────────────────────────────────
$g.Clear([System.Drawing.Color]::White)

# ── Soft lavender glow (bottom-right, like Teams' background gradient) ─────────
$lavenderBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(55, 167, 139, 250))
$g.FillEllipse($lavenderBrush, 480, 430, 680, 680)
$lavenderBrush.Dispose()

# ── Helper: filled rounded rectangle ──────────────────────────────────────────
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

# ── Helper: pill-shaped bar (rounded on both ends) ─────────────────────────────
function Fill-PillBar($g, $brush, $x, $y, $w, $h) {
    $r = $w / 2
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    # top cap: counter-clockwise arc from leftmost to rightmost = upward arc
    $p.AddArc($x, $y, $w, $w, 180, 180)
    # right side
    $p.AddLine([float]($x+$w), [float]($y+$r), [float]($x+$w), [float]($y+$h-$r))
    # bottom cap: clockwise arc from rightmost to leftmost = downward arc
    $p.AddArc($x, $y+$h-$w, $w, $w, 0, 180)
    # left side
    $p.AddLine([float]$x, [float]($y+$h-$r), [float]$x, [float]($y+$r))
    $p.CloseAllFigures()
    $g.FillPath($brush, $p)
    $p.Dispose()
}

# ── Speech bubble (purple) ─────────────────────────────────────────────────────
$purple = [System.Drawing.Color]::FromArgb(124, 58, 237)   # #7C3AED
$purpleBrush = New-Object System.Drawing.SolidBrush($purple)

# Bubble body: 720 × 480, centered around (500, 405)
$bx = 140; $by = 165; $bw = 720; $bh = 480; $br = 85
Fill-RoundedRect $g $purpleBrush $bx $by $bw $bh $br

# Bubble tail: triangle pointing down-left
$tail = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(240, 645),
    [System.Drawing.PointF]::new(410, 645),
    [System.Drawing.PointF]::new(205, 820)
)
$g.FillPolygon($purpleBrush, $tail)
$purpleBrush.Dispose()

# ── Sound wave bars (white, inside bubble) ────────────────────────────────────
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$barW  = 60
$midY  = 405   # vertical center of bubble
# 5 bars: outer short, inner tall, centre tallest
$bars = @(
    @{ h = 130; xOff =   0 },
    @{ h = 215; xOff = 100 },
    @{ h = 285; xOff = 200 },
    @{ h = 215; xOff = 300 },
    @{ h = 130; xOff = 400 }
)
# total span = 4 gaps of 40 + 5 bars of 60 = 460; centre = 500
$startX = 500 - 460/2   # = 270

foreach ($b in $bars) {
    $bx2 = $startX + $b.xOff
    $by2 = $midY - $b.h / 2
    Fill-PillBar $g $whiteBrush $bx2 $by2 $barW $b.h
}
$whiteBrush.Dispose()

# ── Save ──────────────────────────────────────────────────────────────────────
$g.Dispose()
$dir = Split-Path $Out -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Icon saved to $Out"
