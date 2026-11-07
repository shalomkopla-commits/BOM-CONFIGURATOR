Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\images\assemblies"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$items = @(
    @{ sku = "OPT-MOD-100"; title = "מכלול ראש אופטי מרכזי"; cat = "אופטיקה ולייזר"; type = "optics_main"; accent = "#0284c7"; accent2 = "#38bdf8"; bg1 = "#0f172a"; bg2 = "#1e293b" },
    @{ sku = "SUB-OPT-LENS"; title = "תת-מכלול עדשת מיקוד אופטית"; cat = "אופטיקה ולייזר"; type = "optics_lens"; accent = "#0ea5e9"; accent2 = "#7dd3fc"; bg1 = "#0c4a6e"; bg2 = "#0f172a" },
    @{ sku = "SUB-OPT-CLM"; title = "תת-מכלול קולימטור ומייצב קרן"; cat = "אופטיקה ולייזר"; type = "optics_collimator"; accent = "#06b6d4"; accent2 = "#67e8f9"; bg1 = "#164e63"; bg2 = "#0f172a" },

    @{ sku = "PSU-MOD-100"; title = "מכלול ספק כוח סדרה A"; cat = "ספקי כוח והזנה"; type = "psu_main_a"; accent = "#d97706"; accent2 = "#fbbf24"; bg1 = "#1e293b"; bg2 = "#0f172a" },
    @{ sku = "SUB-PSU1-EMI"; title = "תת-מכלול פילטר EMI לספק A"; cat = "ספקי כוח והזנה"; type = "psu_emi"; accent = "#eab308"; accent2 = "#fde047"; bg1 = "#1e293b"; bg2 = "#0f172a" },
    @{ sku = "SUB-PSU1-REG"; title = "תת-מכלול כרטיס ייצוב מתח A"; cat = "ספקי כוח והזנה"; type = "psu_reg"; accent = "#f59e0b"; accent2 = "#fcd34d"; bg1 = "#1e293b"; bg2 = "#0f172a" },

    @{ sku = "PSU-MOD-200"; title = "מכלול ספק כוח סדרה B"; cat = "ספקי כוח והזנה"; type = "psu_main_b"; accent = "#ea580c"; accent2 = "#fb923c"; bg1 = "#1e293b"; bg2 = "#0f172a" },
    @{ sku = "SUB-PSU2-PFC"; title = "תת-מכלול תיקון מקדם הספק PFC"; cat = "ספקי כוח והזנה"; type = "psu_pfc"; accent = "#f97316"; accent2 = "#fdba74"; bg1 = "#1e293b"; bg2 = "#0f172a" },
    @{ sku = "SUB-PSU2-SURG"; title = "תת-מכלול הגנת נחשולי מתח B"; cat = "ספקי כוח והזנה"; type = "psu_surge"; accent = "#ef4444"; accent2 = "#fca5a5"; bg1 = "#1e293b"; bg2 = "#0f172a" },

    @{ sku = "ENC-MOD-100"; title = "מכלול מארז מערכת ומיגון סביבתי"; cat = "מארז ומיגון סביבתי"; type = "enc_main"; accent = "#4f46e5"; accent2 = "#818cf8"; bg1 = "#1e1b4b"; bg2 = "#0f172a" },
    @{ sku = "SUB-ENC-SEAL"; title = "תת-מכלול אטמים ומיגון אבק/מים"; cat = "מארז ומיגון סביבתי"; type = "enc_seal"; accent = "#6366f1"; accent2 = "#a5b4fc"; bg1 = "#1e1b4b"; bg2 = "#0f172a" },
    @{ sku = "SUB-ENC-FAN"; title = "תת-מכלול יחידת אוורור ופיזור חום"; cat = "מארז ומיגון סביבתי"; type = "enc_fan"; accent = "#3b82f6"; accent2 = "#93c5fd"; bg1 = "#172554"; bg2 = "#0f172a" },

    @{ sku = "CTL-MOD-100"; title = "מכלול בקר מערכת מרכזי"; cat = "בקרה ותקשורת"; type = "ctl_main"; accent = "#10b981"; accent2 = "#6ee7b7"; bg1 = "#064e3b"; bg2 = "#0f172a" },
    @{ sku = "SUB-CTL-CPU"; title = "תת-מכלול כרטיס עיבוד ובקרה מהיר"; cat = "בקרה ותקשורת"; type = "ctl_cpu"; accent = "#059669"; accent2 = "#34d399"; bg1 = "#064e3b"; bg2 = "#0f172a" },
    @{ sku = "SUB-CTL-COM"; title = "תת-מכלול מודול תקשורת אופטית ו-Ethernet"; cat = "בקרה ותקשורת"; type = "ctl_com"; accent = "#14b8a6"; accent2 = "#5eead4"; bg1 = "#134e4a"; bg2 = "#0f172a" },

    @{ sku = "SYS-STD-100"; title = "מערכת אופטית LSR-100 Standard"; cat = "מערכת ראשית"; type = "sys_std"; accent = "#2563eb"; accent2 = "#60a5fa"; bg1 = "#0f172a"; bg2 = "#1e3a8a" },
    @{ sku = "SYS-PRO-200"; title = "מערכת תצפית ולייזר LSR-200 Pro"; cat = "מערכת ראשית"; type = "sys_pro"; accent = "#7c3aed"; accent2 = "#c084fc"; bg1 = "#0f172a"; bg2 = "#3b0764" },
    @{ sku = "SYS-HD-400"; title = "מערכת מוקשחת לטווח ארוך LSR-400 HD"; cat = "מערכת ראשית"; type = "sys_hd"; accent = "#0d9488"; accent2 = "#2dd4bf"; bg1 = "#0f172a"; bg2 = "#115e59" },
    @{ sku = "CUSTOM-DEV"; title = "דרישת פיתוח הנדסי מיוחדת (Custom)"; cat = "פיתוח מיוחד"; type = "custom"; accent = "#f97316"; accent2 = "#fdba74"; bg1 = "#431407"; bg2 = "#7c2d12" }
)

function ConvertFrom-Hex([string]$hex, [int]$alpha = 255) {
    $h = $hex.TrimStart('#')
    $r = [Convert]::ToInt32($h.Substring(0,2), 16)
    $g = [Convert]::ToInt32($h.Substring(2,2), 16)
    $b = [Convert]::ToInt32($h.Substring(4,2), 16)
    return [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b)
}

foreach ($item in $items) {
    $w = 640
    $h = 440
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $cBg1 = ConvertFrom-Hex $item.bg1
    $cBg2 = ConvertFrom-Hex $item.bg2
    $cAcc = ConvertFrom-Hex $item.accent
    $cAcc2 = ConvertFrom-Hex $item.accent2
    $cAccGlow = ConvertFrom-Hex $item.accent 55
    $cWhite = [System.Drawing.Color]::FromArgb(245, 248, 252)
    $cMuted = [System.Drawing.Color]::FromArgb(165, 180, 202)
    $cMetalDark = [System.Drawing.Color]::FromArgb(42, 52, 68)
    $cMetalMid = [System.Drawing.Color]::FromArgb(71, 85, 105)
    $cMetalLight = [System.Drawing.Color]::FromArgb(148, 163, 184)

    # Background Gradient
    $rectBg = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rectBg, $cBg1, $cBg2, 45.0)
    $g.FillRectangle($brushBg, $rectBg)

    # Subtle CAD Grid
    $penGrid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(22, 255, 255, 255), 1)
    for ($x = 0; $x -lt $w; $x += 32) { $g.DrawLine($penGrid, $x, 0, $x, $h) }
    for ($y = 0; $y -lt $h; $y += 32) { $g.DrawLine($penGrid, 0, $y, $w, $y) }

    # Glow circle in center
    $brushGlow = New-Object System.Drawing.SolidBrush($cAccGlow)
    $g.FillEllipse($brushGlow, 150, 50, 340, 260)

    # Outer technical border frame
    $penBorder = New-Object System.Drawing.Pen((ConvertFrom-Hex $item.accent 120), 2)
    $g.DrawRectangle($penBorder, 14, 14, $w - 28, $h - 28)

    # Draw specific hardware illustration in center (y: 75..310)
    $penAcc = New-Object System.Drawing.Pen($cAcc, 3)
    $penAcc2 = New-Object System.Drawing.Pen($cAcc2, 2)
    $penMetal = New-Object System.Drawing.Pen($cMetalLight, 2)
    $brushMetalDark = New-Object System.Drawing.SolidBrush($cMetalDark)
    $brushMetalMid = New-Object System.Drawing.SolidBrush($cMetalMid)
    $brushAcc = New-Object System.Drawing.SolidBrush($cAcc)
    $brushAcc2 = New-Object System.Drawing.SolidBrush($cAcc2)

    switch -Wildcard ($item.type) {
        "optics_*" {
            # Cylindrical Optical Housing + Multi-Lens Barrel
            $g.FillRectangle($brushMetalDark, 150, 130, 220, 120)
            $g.DrawRectangle($penMetal, 150, 130, 220, 120)
            # Cooling fins on optical body
            for ($fx = 165; $fx -le 350; $fx += 18) {
                $g.DrawLine($penMetal, $fx, 130, $fx, 250)
            }
            # Lens Barrel Step 1
            $g.FillRectangle($brushMetalMid, 370, 145, 70, 90)
            $g.DrawRectangle($penAcc2, 370, 145, 70, 90)
            # Glowing Optical Lens Element
            $rectLens = New-Object System.Drawing.Rectangle(420, 135, 75, 110)
            $brushLens = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rectLens, $cAcc2, $cAcc, 90.0)
            $g.FillEllipse($brushLens, $rectLens)
            $g.DrawEllipse($penAcc2, $rectLens)
            # Laser beam / optical axis line
            $penLaser = New-Object System.Drawing.Pen($cAcc2, 3)
            $penLaser.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
            $g.DrawLine($penLaser, 95, 190, 555, 190)
            if ($item.type -eq "optics_lens") {
                $g.FillEllipse($brushLens, 240, 115, 150, 150)
                $g.DrawEllipse($penAcc2, 240, 115, 150, 150)
                $g.DrawEllipse($penMetal, 225, 100, 180, 180)
            }
        }
        "psu_*" {
            # Industrial Power Supply / PCB / Coils
            $g.FillRectangle($brushMetalDark, 140, 110, 360, 165)
            $g.DrawRectangle($penMetal, 140, 110, 360, 165)
            # Heatsink fins on left
            for ($fy = 120; $fy -le 265; $fy += 14) {
                $g.FillRectangle($brushMetalMid, 150, $fy, 75, 8)
            }
            # Dual Toroidal Coils / Capacitors
            $g.FillEllipse($brushAcc, 250, 135, 85, 85)
            $g.FillEllipse($brushMetalDark, 272, 157, 41, 41)
            $g.DrawEllipse($penAcc2, 250, 135, 85, 85)

            $g.FillEllipse($brushAcc2, 355, 135, 85, 85)
            $g.FillEllipse($brushMetalDark, 377, 157, 41, 41)
            $g.DrawEllipse($penAcc, 355, 135, 85, 85)

            # High-voltage terminal block
            for ($tx = 255; $tx -le 455; $tx += 32) {
                $g.FillRectangle($brushMetalMid, $tx, 232, 22, 28)
                $g.DrawRectangle($penAcc2, $tx, 232, 22, 28)
            }
        }
        "enc_*" {
            # Ruggedized Enclosure / Fan / Seals
            $g.FillRectangle($brushMetalDark, 145, 105, 350, 175)
            $g.DrawRectangle($penAcc2, 145, 105, 350, 175)
            $g.DrawRectangle($penMetal, 155, 115, 330, 155)
            if ($item.type -eq "enc_fan") {
                # Dual cooling fans
                $g.DrawEllipse($penAcc2, 185, 125, 125, 125)
                $g.FillEllipse($brushAcc, 230, 170, 35, 35)
                $g.DrawEllipse($penAcc2, 330, 125, 125, 125)
                $g.FillEllipse($brushAcc, 375, 170, 35, 35)
            } else {
                # Rugged ribs & MIL-spec circular connectors
                for ($rx = 180; $rx -le 360; $rx += 30) {
                    $g.FillRectangle($brushMetalMid, $rx, 130, 14, 125)
                }
                $g.FillEllipse($brushMetalMid, 395, 135, 65, 65)
                $g.DrawEllipse($penAcc2, 395, 135, 65, 65)
                $g.FillEllipse($brushAcc, 415, 155, 25, 25)
            }
        }
        "ctl_*" {
            # Green/Teal High-Speed Control PCB & FPGA / Optical Ports
            $brushPcb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 78, 62))
            $g.FillRectangle($brushPcb, 140, 110, 360, 165)
            $g.DrawRectangle($penAcc2, 140, 110, 360, 165)
            # Central Processor / FPGA BGA chip
            $g.FillRectangle($brushMetalDark, 265, 140, 105, 105)
            $g.DrawRectangle($penAcc2, 265, 140, 105, 105)
            # Gold pins around FPGA
            for ($i = 273; $i -le 362; $i += 9) {
                $g.DrawLine($penAcc2, $i, 132, $i, 140)
                $g.DrawLine($penAcc2, $i, 245, $i, 253)
            }
            # SFP / Ethernet ports on left & right
            $g.FillRectangle($brushMetalMid, 155, 135, 75, 45)
            $g.DrawRectangle($penMetal, 155, 135, 75, 45)
            $g.FillRectangle($brushMetalMid, 155, 195, 75, 45)
            $g.DrawRectangle($penMetal, 155, 195, 75, 45)
            # High-speed memory modules on right
            for ($my = 135; $my -le 225; $my += 28) {
                $g.FillRectangle($brushMetalDark, 395, $my, 80, 20)
                $g.DrawRectangle($penAcc, 395, $my, 80, 20)
            }
        }
        "sys_*" {
            # Complete Integrated System Turret / Rack
            $g.FillRectangle($brushMetalDark, 125, 100, 390, 180)
            $g.DrawRectangle($penAcc2, 125, 100, 390, 180)
            # Upper Optical Head Unit
            $g.FillRectangle($brushMetalMid, 160, 118, 200, 68)
            $g.DrawRectangle($penAcc, 160, 118, 200, 68)
            $g.FillEllipse($brushAcc2, 365, 115, 75, 75)
            # Lower Power & Control Rack
            $g.FillRectangle($brushMetalMid, 160, 200, 320, 62)
            $g.DrawRectangle($penMetal, 160, 200, 320, 62)
            for ($led = 180; $led -le 280; $led += 25) {
                $g.FillEllipse($brushAcc2, $led, 222, 14, 14)
            }
        }
        "custom" {
            # Custom R&D Engineering Blueprint Icon
            $g.FillRectangle($brushMetalDark, 155, 105, 330, 170)
            $g.DrawRectangle($penAcc2, 155, 105, 330, 170)
            $g.DrawEllipse($penAcc2, 260, 130, 120, 120)
            $g.FillEllipse($brushAcc, 295, 165, 50, 50)
        }
    }

    # Top-left SKU Badge
    $g.FillRectangle($brushAcc, 28, 28, 210, 40)
    $fontSku = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $brushWhite = New-Object System.Drawing.SolidBrush($cWhite)
    $g.DrawString($item.sku, $fontSku, $brushWhite, 40, 34)

    # Top-right Category Badge
    $fontCat = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
    $sfRight = New-Object System.Drawing.StringFormat
    $sfRight.Alignment = [System.Drawing.StringAlignment]::Far
    $g.DrawString($item.cat, $fontCat, $brushAcc2, ($w - 34), 38, $sfRight)

    # Bottom Title Bar
    $brushBottom = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225, 15, 23, 42))
    $g.FillRectangle($brushBottom, 16, 325, ($w - 32), 98)
    $g.DrawLine($penAcc, 16, 325, ($w - 16), 325)

    $fontTitle = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
    $sfCenter = New-Object System.Drawing.StringFormat
    $sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($item.title, $fontTitle, $brushWhite, ($w / 2), 342, $sfCenter)

    $fontSub = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)
    $brushMuted = New-Object System.Drawing.SolidBrush($cMuted)
    $g.DrawString("SKU: $($item.sku)  |  Rev A  |  BOM Configurator CAD Render", $fontSub, $brushMuted, ($w / 2), 382, $sfCenter)

    $pngPath = Join-Path $outDir "$($item.sku).png"
    $bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Write-Output "Generated $($items.Count) PNG images in $outDir"

