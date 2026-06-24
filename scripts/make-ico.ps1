param(
  [string]$Src = "$PSScriptRoot\..\resources\krypt.png",
  [string]$Dst = "$PSScriptRoot\..\resources\krypt.ico"
)

Add-Type -AssemblyName System.Drawing

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$orig = [System.Drawing.Image]::FromFile((Resolve-Path $Src))

$images = @()
foreach ($sz in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $sz, $sz
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($orig, 0, 0, $sz, $sz)
  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $images += ,([pscustomobject]@{ Size = $sz; Bytes = $ms.ToArray() })
  $ms.Dispose()
  $bmp.Dispose()
}
$orig.Dispose()

$fs = [System.IO.File]::Create($Dst)
$bw = New-Object System.IO.BinaryWriter($fs)

$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$images.Count)

$offset = 6 + (16 * $images.Count)
foreach ($img in $images) {
  $dim = if ($img.Size -ge 256) { 0 } else { $img.Size }
  $bw.Write([byte]$dim)
  $bw.Write([byte]$dim)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]32)
  $bw.Write([uint32]$img.Bytes.Length)
  $bw.Write([uint32]$offset)
  $offset += $img.Bytes.Length
}

foreach ($img in $images) { $bw.Write($img.Bytes) }

$bw.Close()
$fs.Close()

Write-Host "Wrote $Dst ($([Math]::Round((Get-Item $Dst).Length / 1KB, 1)) KB)"
