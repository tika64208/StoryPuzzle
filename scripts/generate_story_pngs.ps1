$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $rootDir 'assets\story'
$manifestPath = Join-Path $rootDir 'data\story-art.js'

$width = 1024
$height = 1024

$scenes = @(
  @{ Id = 'ch01-lv01'; Name = 'Old Hallway'; Colors = @('#08131d', '#173045', '#3a5c72', '#e6d3b2') },
  @{ Id = 'ch01-lv02'; Name = 'Mirror Hall'; Colors = @('#071019', '#13293c', '#365b77', '#d7f0ff') },
  @{ Id = 'ch01-lv03'; Name = 'Basement Stairs'; Colors = @('#0a1018', '#263341', '#596a7b', '#d8ae7b') },
  @{ Id = 'ch01-lv04'; Name = 'Window Note'; Colors = @('#07111a', '#1f3347', '#86614a', '#f4dec5') },
  @{ Id = 'ch02-lv01'; Name = 'Abandoned Stage'; Colors = @('#140d17', '#31192a', '#8a2337', '#ffd8a8') },
  @{ Id = 'ch02-lv02'; Name = 'Empty Seats'; Colors = @('#101522', '#2b3341', '#6a2834', '#f0c697') },
  @{ Id = 'ch02-lv03'; Name = 'Light Console'; Colors = @('#061019', '#132638', '#20566f', '#8eeeff') },
  @{ Id = 'ch02-lv04'; Name = 'Backstage Trunk'; Colors = @('#11151b', '#2c3440', '#734a2f', '#ffcc98') },
  @{ Id = 'ch03-lv01'; Name = 'Rainy Dock'; Colors = @('#071120', '#18344d', '#2d647d', '#88ddff') },
  @{ Id = 'ch03-lv02'; Name = 'Container Yard'; Colors = @('#081320', '#243548', '#a86041', '#ffd3a4') },
  @{ Id = 'ch03-lv03'; Name = 'Deck Watermark'; Colors = @('#0a1522', '#17364f', '#2d6a7b', '#b3f0ff') },
  @{ Id = 'ch03-lv04'; Name = 'Signal Lighthouse'; Colors = @('#08111d', '#14253f', '#314662', '#f5d07b') }
)

function New-ArgbColor {
  param(
    [Parameter(Mandatory = $true)][string]$Hex,
    [int]$Alpha = 255
  )

  $safeHex = $Hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($safeHex.Substring(0, 2), 16),
    [Convert]::ToInt32($safeHex.Substring(2, 2), 16),
    [Convert]::ToInt32($safeHex.Substring(4, 2), 16)
  )
}

function Get-Seed {
  param([string]$Value)

  $hash = 2166136261L
  foreach ($char in $Value.ToCharArray()) {
    $hash = $hash -bxor [int][char]$char
    $hash = ($hash + (($hash -shl 1) + ($hash -shl 4) + ($hash -shl 7) + ($hash -shl 8) + ($hash -shl 24))) -band 0xffffffffL
  }
  return [int]($hash -band 0x7fffffff)
}

function Use-Disposable {
  param(
    [Parameter(Mandatory = $true)]$Disposable,
    [Parameter(Mandatory = $true)][scriptblock]$Script
  )

  try {
    & $Script $Disposable
  } finally {
    if ($null -ne $Disposable) {
      $Disposable.Dispose()
    }
  }
}

function Fill-Background {
  param(
    [System.Drawing.Graphics]$Graphics,
    [hashtable]$Scene
  )

  $rect = [System.Drawing.Rectangle]::FromLTRB(0, 0, $width, $height)
  Use-Disposable ([System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.PointF]::new(0, 0),
        [System.Drawing.PointF]::new(0, $height),
        (New-ArgbColor $Scene.Colors[2]),
        (New-ArgbColor $Scene.Colors[0])
      )) {
    param($brush)
    $blend = [System.Drawing.Drawing2D.ColorBlend]::new()
    $blend.Colors = [System.Drawing.Color[]]@(
      (New-ArgbColor $Scene.Colors[2]),
      (New-ArgbColor $Scene.Colors[1]),
      (New-ArgbColor $Scene.Colors[0])
    )
    $blend.Positions = [single[]]@(0.0, 0.52, 1.0)
    $brush.InterpolationColors = $blend
    $Graphics.FillRectangle($brush, $rect)
  }

  Add-Glow -Graphics $Graphics -X 512 -Y 150 -Width 520 -Height 170 -Color $Scene.Colors[3] -Alpha 42
  Add-Particles -Graphics $Graphics -Scene $Scene
}

function Add-Glow {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [string]$Color,
    [int]$Alpha
  )

  Use-Disposable ([System.Drawing.SolidBrush]::new((New-ArgbColor $Color $Alpha))) {
    param($brush)
    $Graphics.FillEllipse($brush, $X - ($Width / 2), $Y - ($Height / 2), $Width, $Height)
  }
}

function Add-Particles {
  param(
    [System.Drawing.Graphics]$Graphics,
    [hashtable]$Scene
  )

  $rand = [System.Random]::new((Get-Seed $Scene.Id))
  for ($index = 0; $index -lt 42; $index += 1) {
    $x = $rand.Next(0, $width)
    $y = $rand.Next(0, $height)
    $size = $rand.Next(4, 14)
    $alpha = $rand.Next(10, 24)
    Use-Disposable ([System.Drawing.SolidBrush]::new((New-ArgbColor $Scene.Colors[3] $alpha))) {
      param($brush)
      $Graphics.FillEllipse($brush, $x, $y, $size, $size)
    }
  }
}

function Fill-Polygon {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Color,
    [int]$Alpha,
    [object[]]$Points
  )

  $drawingPoints = $Points | ForEach-Object {
    [System.Drawing.PointF]::new([float]$_.X, [float]$_.Y)
  }

  Use-Disposable ([System.Drawing.SolidBrush]::new((New-ArgbColor $Color $Alpha))) {
    param($brush)
    $Graphics.FillPolygon($brush, [System.Drawing.PointF[]]$drawingPoints)
  }
}

function Fill-Rect {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [string]$Color,
    [int]$Alpha = 255
  )

  Use-Disposable ([System.Drawing.SolidBrush]::new((New-ArgbColor $Color $Alpha))) {
    param($brush)
    $Graphics.FillRectangle($brush, $X, $Y, $Width, $Height)
  }
}

function Fill-Ellipse {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [string]$Color,
    [int]$Alpha = 255
  )

  Use-Disposable ([System.Drawing.SolidBrush]::new((New-ArgbColor $Color $Alpha))) {
    param($brush)
    $Graphics.FillEllipse($brush, $X, $Y, $Width, $Height)
  }
}

function Draw-Line {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X1,
    [float]$Y1,
    [float]$X2,
    [float]$Y2,
    [string]$Color,
    [int]$Alpha = 255,
    [float]$Width = 8
  )

  Use-Disposable ([System.Drawing.Pen]::new((New-ArgbColor $Color $Alpha), $Width)) {
    param($pen)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $Graphics.DrawLine($pen, $X1, $Y1, $X2, $Y2)
  }
}

function Draw-HallwayFootprints {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Polygon $Graphics '#4f6e82' 54 @(
    @{ X = 170; Y = 120 }, @{ X = 854; Y = 120 }, @{ X = 728; Y = 1024 }, @{ X = 296; Y = 1024 }
  )
  Fill-Polygon $Graphics '#0f1823' 156 @(
    @{ X = 318; Y = 208 }, @{ X = 706; Y = 208 }, @{ X = 644; Y = 840 }, @{ X = 380; Y = 840 }
  )
  Fill-Rect $Graphics 410 268 204 466 '#2b2018'
  Fill-Ellipse $Graphics 502 490 20 20 $Scene.Colors[3] 255
  Add-Glow -Graphics $Graphics -X 512 -Y 168 -Width 190 -Height 64 -Color $Scene.Colors[3] -Alpha 70

  for ($index = 0; $index -lt 10; $index += 1) {
    $x = 180 + ($index * 58) + ($(if ($index % 2 -eq 0) { 10 } else { -8 }))
    $y = 720 + ($index * 18)
    Fill-Ellipse $Graphics ($x - 18) ($y - 32) 36 64 '#05070a' 124
    Fill-Ellipse $Graphics ($x - 18) ($y - 58) 10 10 '#05070a' 114
    Fill-Ellipse $Graphics ($x - 4) ($y - 64) 8 8 '#05070a' 114
  }
}

function Draw-BrokenMirror {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Rect $Graphics 188 150 648 740 '#15293b' 164
  Fill-Rect $Graphics 250 212 524 616 '#9fdcff' 52
  Fill-Rect $Graphics 412 288 198 284 '#dff5ff' 40
  Fill-Rect $Graphics 452 330 118 198 '#f5fcff' 112
  Draw-Line $Graphics 511 330 511 528 '#95c4d7' 190 10
  Draw-Line $Graphics 452 428 570 428 '#95c4d7' 190 10
  Add-Glow -Graphics $Graphics -X 512 -Y 188 -Width 240 -Height 70 -Color $Scene.Colors[3] -Alpha 74

  $cracks = @(
    @(320, 268, 436, 352, 392, 474, 520, 620, 476, 764),
    @(676, 244, 600, 370, 706, 484, 584, 658, 646, 774),
    @(512, 180, 520, 312, 420, 444, 580, 560, 486, 820)
  )

  foreach ($crack in $cracks) {
    for ($index = 0; $index -lt ($crack.Count - 2); $index += 2) {
      Draw-Line $Graphics $crack[$index] $crack[$index + 1] $crack[$index + 2] $crack[$index + 3] '#eff9ff' 150 7
    }
  }
}

function Draw-StairScratches {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  for ($index = 0; $index -lt 6; $index += 1) {
    $y = 310 + ($index * 98)
    $color = $(if ($index % 2 -eq 0) { '#5f6d78' } else { '#738390' })
    Fill-Polygon $Graphics $color 228 @(
      @{ X = 160; Y = $y + 70 }, @{ X = 882; Y = $y - 10 }, @{ X = 882; Y = $y + 70 }, @{ X = 160; Y = $y + 150 }
    )
  }

  Draw-Line $Graphics 190 230 760 830 '#c89f73' 100 14
  for ($index = 0; $index -lt 7; $index += 1) {
    $x1 = 420 + ($index * 40)
    $y1 = 548 + ($index * 56)
    Draw-Line $Graphics $x1 $y1 ($x1 + 148) ($y1 + 28) '#d7af82' 194 8
  }
  Add-Glow -Graphics $Graphics -X 838 -Y 186 -Width 160 -Height 54 -Color $Scene.Colors[3] -Alpha 60
}

function Draw-WindowNote {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Rect $Graphics 270 144 484 360 '#1b2e3e' 132
  Fill-Rect $Graphics 330 198 364 246 '#e8f7ff' 66
  Draw-Line $Graphics 512 198 512 444 '#aec6d2' 120 12
  Draw-Line $Graphics 330 318 694 318 '#aec6d2' 120 12
  Add-Glow -Graphics $Graphics -X 350 -Y 154 -Width 236 -Height 70 -Color $Scene.Colors[3] -Alpha 60

  $papers = @(
    @{ X = 376; Y = 586 }, @{ X = 528; Y = 610 }, @{ X = 464; Y = 714 }
  )
  foreach ($paper in $papers) {
    Fill-Rect $Graphics ($paper.X - 76) ($paper.Y - 54) 152 108 '#f3e7cf'
    Draw-Line $Graphics ($paper.X - 42) ($paper.Y - 12) ($paper.X + 44) ($paper.Y - 12) '#8b7358' 142 6
    Draw-Line $Graphics ($paper.X - 42) ($paper.Y + 18) ($paper.X + 26) ($paper.Y + 18) '#8b7358' 142 6
  }
}

function Draw-CurtainShadow {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Add-Glow -Graphics $Graphics -X 512 -Y 242 -Width 456 -Height 152 -Color $Scene.Colors[3] -Alpha 54
  Fill-Polygon $Graphics '#7a1f30' 255 @(
    @{ X = 112; Y = 0 }, @{ X = 424; Y = 0 }, @{ X = 388; Y = 212 }, @{ X = 430; Y = 420 }, @{ X = 362; Y = 612 }, @{ X = 420; Y = 1024 }, @{ X = 112; Y = 1024 }
  )
  Fill-Polygon $Graphics '#7a1f30' 255 @(
    @{ X = 912; Y = 0 }, @{ X = 600; Y = 0 }, @{ X = 636; Y = 212 }, @{ X = 594; Y = 420 }, @{ X = 662; Y = 612 }, @{ X = 604; Y = 1024 }, @{ X = 912; Y = 1024 }
  )
  Fill-Rect $Graphics 246 712 532 136 '#241116' 210
  Fill-Ellipse $Graphics 420 406 184 336 '#06070a' 108
  Fill-Rect $Graphics 478 474 68 210 '#06070a' 132
}

function Draw-TicketSeats {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Add-Glow -Graphics $Graphics -X 790 -Y 182 -Width 280 -Height 92 -Color $Scene.Colors[3] -Alpha 54
  for ($row = 0; $row -lt 5; $row += 1) {
    $y = 390 + ($row * 110)
    $scale = 1 - ($row * 0.09)
    for ($col = 0; $col -lt 6; $col += 1) {
      $x = 140 + ($col * 130)
      $seatWidth = 96 * $scale
      $seatHeight = 80 * $scale
      Fill-Rect $Graphics $x $y $seatWidth $seatHeight '#712b36' (235 - ($row * 18))
      Fill-Rect $Graphics ($x + 10) ($y - (36 * $scale)) ($seatWidth - 20) (50 * $scale) '#8a3240' (235 - ($row * 18))
    }
  }

  $tickets = @(
    @{ X = 336; Y = 678 }, @{ X = 544; Y = 748 }, @{ X = 690; Y = 628 }
  )
  foreach ($ticket in $tickets) {
    Fill-Rect $Graphics ($ticket.X - 60) ($ticket.Y - 32) 120 64 '#f4d4b8'
    Draw-Line $Graphics ($ticket.X - 18) ($ticket.Y - 20) ($ticket.X - 18) ($ticket.Y + 20) '#87584a' 170 4
  }
}

function Draw-ControlPanel {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Rect $Graphics 92 224 840 560 '#0a141f' 194
  Fill-Rect $Graphics 132 264 760 480 '#102230' 228
  Add-Glow -Graphics $Graphics -X 512 -Y 174 -Width 330 -Height 86 -Color $Scene.Colors[3] -Alpha 52
  $buttonColors = @('#7ee0db', '#74cfff', '#ffd878')
  for ($row = 0; $row -lt 5; $row += 1) {
    for ($col = 0; $col -lt 8; $col += 1) {
      $x = 180 + ($col * 84)
      $y = 300 + ($row * 86)
      $color = $buttonColors[($row + $col) % $buttonColors.Count]
      Fill-Ellipse $Graphics ($x - 18) ($y - 18) 36 36 $color 224
    }
  }
  Draw-Line $Graphics 152 774 892 754 '#1d5268' 200 20
}

function Draw-BackstageTrunk {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Rect $Graphics 166 360 692 352 '#6d472c'
  Fill-Rect $Graphics 202 394 620 280 '#9d6940'
  Fill-Rect $Graphics 250 240 524 170 '#7b5236'
  Fill-Rect $Graphics 416 468 210 126 '#e6d8bc'
  Draw-Line $Graphics 436 500 574 500 '#7b6246' 178 6
  Draw-Line $Graphics 452 540 604 540 '#7b6246' 178 6
  Add-Glow -Graphics $Graphics -X 758 -Y 210 -Width 208 -Height 60 -Color $Scene.Colors[3] -Alpha 54
}

function Draw-DockRope {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Rect $Graphics 0 740 1024 284 '#294b61' 156
  Fill-Ellipse $Graphics 132 728 760 124 '#9fd8ef' 32
  Fill-Rect $Graphics 430 490 168 248 '#3b4c55'
  Fill-Ellipse $Graphics 396 456 236 76 '#70818a' 255
  Draw-Line $Graphics 512 522 470 658 '#d7ba8c' 255 30
  Draw-Line $Graphics 470 658 612 594 '#d7ba8c' 255 30
  Draw-Line $Graphics 612 594 512 522 '#d7ba8c' 255 30
  Draw-Line $Graphics 616 594 776 760 '#d7ba8c' 255 24
  foreach ($x in @(140, 230, 880)) {
    Draw-Line $Graphics $x 120 ($x - 60) 980 '#d7f5ff' 48 4
  }
}

function Draw-Containers {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Rect $Graphics 0 690 1024 334 '#213648' 148
  $blocks = @(
    @{ X = 138; Y = 520; W = 228; H = 172; Color = '#bb6b43' },
    @{ X = 382; Y = 452; W = 232; H = 240; Color = '#4f768f' },
    @{ X = 626; Y = 520; W = 258; H = 172; Color = '#7c5a4a' },
    @{ X = 252; Y = 694; W = 304; H = 184; Color = '#2f5e7f' },
    @{ X = 572; Y = 694; W = 278; H = 184; Color = '#a34f3b' }
  )
  foreach ($block in $blocks) {
    Fill-Rect $Graphics $block.X $block.Y $block.W $block.H $block.Color
    Draw-Line $Graphics ($block.X + 36) ($block.Y + 20) ($block.X + 36) ($block.Y + $block.H - 20) '#f6e2c8' 48 8
    Draw-Line $Graphics ($block.X + $block.W - 36) ($block.Y + 20) ($block.X + $block.W - 36) ($block.Y + $block.H - 20) '#f6e2c8' 48 8
  }
}

function Draw-DeckWater {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  for ($index = 0; $index -lt 8; $index += 1) {
    $y = 370 + ($index * 76)
    $color = $(if ($index % 2 -eq 0) { '#385766' } else { '#2c4552' })
    Fill-Rect $Graphics 112 $y 800 62 $color 235
  }
  for ($index = 0; $index -lt 5; $index += 1) {
    $x = 250 + ($index * 130)
    $y = 520 + ($(if ($index % 2 -eq 0) { 0 } else { 84 }))
    Fill-Ellipse $Graphics ($x - 86) ($y - 32) 172 64 '#b8f1ff' 56
  }
  Draw-Line $Graphics 746 214 604 514 '#161e28' 112 34
  Draw-Line $Graphics 792 248 650 548 '#161e28' 86 12
  Draw-Line $Graphics 442 430 724 724 '#d3edf2' 66 12
}

function Draw-Lighthouse {
  param([System.Drawing.Graphics]$Graphics, [hashtable]$Scene)

  Fill-Rect $Graphics 0 700 1024 324 '#1a2637' 184
  Fill-Rect $Graphics 680 208 108 512 '#d5dfeb'
  Fill-Rect $Graphics 648 166 172 74 '#f1d389'
  Fill-Polygon $Graphics '#43576e' 255 @(
    @{ X = 736; Y = 84 }, @{ X = 826; Y = 166 }, @{ X = 646; Y = 166 }
  )
  Fill-Polygon $Graphics '#f7d97a' 66 @(
    @{ X = 734; Y = 196 }, @{ X = 180; Y = 380 }, @{ X = 180; Y = 470 }, @{ X = 734; Y = 246 }
  )
  Add-Glow -Graphics $Graphics -X 734 -Y 202 -Width 192 -Height 72 -Color $Scene.Colors[3] -Alpha 96
  foreach ($x in @(140, 310, 520, 910)) {
    Draw-Line $Graphics $x 80 ($x - 60) 980 '#d7f5ff' 42 4
  }
}

function Draw-Scene {
  param(
    [System.Drawing.Graphics]$Graphics,
    [hashtable]$Scene
  )

  switch ($Scene.Id) {
    'ch01-lv01' { Draw-HallwayFootprints $Graphics $Scene }
    'ch01-lv02' { Draw-BrokenMirror $Graphics $Scene }
    'ch01-lv03' { Draw-StairScratches $Graphics $Scene }
    'ch01-lv04' { Draw-WindowNote $Graphics $Scene }
    'ch02-lv01' { Draw-CurtainShadow $Graphics $Scene }
    'ch02-lv02' { Draw-TicketSeats $Graphics $Scene }
    'ch02-lv03' { Draw-ControlPanel $Graphics $Scene }
    'ch02-lv04' { Draw-BackstageTrunk $Graphics $Scene }
    'ch03-lv01' { Draw-DockRope $Graphics $Scene }
    'ch03-lv02' { Draw-Containers $Graphics $Scene }
    'ch03-lv03' { Draw-DeckWater $Graphics $Scene }
    'ch03-lv04' { Draw-Lighthouse $Graphics $Scene }
    default { }
  }
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$manifestMap = [ordered]@{}

foreach ($scene in $scenes) {
  $filePath = Join-Path $outputDir "$($scene.Id).png"
  $bitmap = [System.Drawing.Bitmap]::new($width, $height)

  try {
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      Fill-Background -Graphics $graphics -Scene $scene
      Draw-Scene -Graphics $graphics -Scene $scene
      $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
    }
  } finally {
    $bitmap.Dispose()
  }

  $manifestMap[$scene.Id] = @{
    path = "/assets/story/$($scene.Id).png"
    sceneName = $scene.Name
  }
}

$json = $manifestMap | ConvertTo-Json -Depth 4
Set-Content -Path $manifestPath -Value ("module.exports = $json;`n") -Encoding utf8

Write-Output "Generated $($scenes.Count) story png assets in $outputDir"
