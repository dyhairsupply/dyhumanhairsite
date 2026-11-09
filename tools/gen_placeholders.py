# -*- coding: utf-8 -*-
"""
DY Deyu - placeholder artwork generator.

All images shipped with the source are lightweight, self-contained SVG
placeholders. They are meant to be replaced from the Decap CMS media library
(Media -> Upload), no code changes required.

Run from anywhere:  python tools/gen_placeholders.py
"""
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "images"
(IMG / "uploads").mkdir(parents=True, exist_ok=True)

COFFEE = "#2A1E18"
COFFEE_2 = "#3C2A20"
COFFEE_3 = "#5A4031"
GOLD = "#B89150"
GOLD_SOFT = "#C9A96A"
CREAM = "#F8F4ED"
SAND = "#EFE7DA"
LINE = "#DCCDB6"
INK = "#6B5747"


def bezier_strands(w, h, seed, count, stroke, opacity, width_range=(1, 2.4), sway=0.16):
    """Flowing hair-strand line art."""
    rnd = random.Random(seed)
    out = []
    pad = w * 0.06
    for i in range(count):
        x = pad + (w - 2 * pad) * (i + 0.5) / count
        x += rnd.uniform(-w * 0.025, w * 0.025)
        c1 = x + w * sway * rnd.uniform(-1, 1)
        c2 = x + w * sway * rnd.uniform(-1, 1)
        x3 = x + w * sway * rnd.uniform(-1, 1) * 0.6
        d = (f"M {x:.1f} {-h * 0.08:.1f} "
             f"C {c1:.1f} {h * 0.28:.1f}, {c2:.1f} {h * 0.66:.1f}, {x3:.1f} {h * 1.08:.1f}")
        out.append(f'<path d="{d}" fill="none" stroke="{stroke}" '
                   f'stroke-width="{rnd.uniform(*width_range):.2f}" '
                   f'opacity="{opacity * rnd.uniform(0.55, 1):.2f}" stroke-linecap="round"/>')
    return "\n".join(out)


def factory_lines(w, h, seed, stroke, opacity):
    """Quiet architectural line drawing for factory/workshop placeholders."""
    rnd = random.Random(seed)
    out = []
    # window / partition frames
    for i in range(5):
        x = w * (0.07 + i * 0.185)
        bw = w * 0.13
        by = h * (0.22 + rnd.uniform(-0.03, 0.05))
        bh = h * 0.34
        out.append(f'<rect x="{x:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" '
                   f'fill="none" stroke="{stroke}" stroke-width="1.1" opacity="{opacity:.2f}"/>')
        out.append(f'<line x1="{x + bw / 2:.1f}" y1="{by:.1f}" x2="{x + bw / 2:.1f}" '
                   f'y2="{by + bh:.1f}" stroke="{stroke}" stroke-width="0.8" opacity="{opacity * 0.7:.2f}"/>')
    # worktable lines
    for j in range(3):
        y = h * (0.66 + j * 0.095)
        out.append(f'<line x1="{w * 0.06:.1f}" y1="{y:.1f}" x2="{w * 0.94:.1f}" y2="{y:.1f}" '
                   f'stroke="{stroke}" stroke-width="{1.2 if j == 0 else 0.8:.1f}" '
                   f'opacity="{opacity * (0.9 if j == 0 else 0.55):.2f}"/>')
    return "\n".join(out)


def label(text, x, y, size, color, anchor="middle", spacing=3, weight=400, family="Arial, Helvetica, sans-serif"):
    return (f'<text x="{x}" y="{y}" fill="{color}" font-family="{family}" '
            f'font-size="{size}" font-weight="{weight}" letter-spacing="{spacing}" '
            f'text-anchor="{anchor}">{text}</text>')


def svg(w, h, body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" role="img">\n'
            f'<defs>\n{defs}\n</defs>\n{body}\n</svg>\n')


def write(name, content):
    (IMG / name).write_text(content, encoding="utf-8")


# ---------------------------------------------------------------- brand marks
logo_body = f'''
<rect x="8" y="8" width="184" height="184" fill="none" stroke="{GOLD}" stroke-width="1.6"/>
<rect x="18" y="18" width="164" height="164" fill="none" stroke="{GOLD}" stroke-width="0.6" opacity="0.55"/>
{label("DY", 100, 128, 82, GOLD, spacing=2, weight=400, family="Georgia, 'Times New Roman', serif")}
'''
write("logo-dy.svg", svg(200, 200, logo_body))

fav_body = f'''
<rect width="64" height="64" rx="6" fill="{COFFEE}"/>
<rect x="6" y="6" width="52" height="52" rx="3" fill="none" stroke="{GOLD}" stroke-width="1.2"/>
{label("DY", 32, 42, 27, GOLD, spacing=1, family="Georgia, 'Times New Roman', serif")}
'''
write("favicon.svg", svg(64, 64, fav_body))

# ---------------------------------------------------------------------- hero
hero_defs = f'''
<linearGradient id="hb" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#20150F"/>
  <stop offset="0.52" stop-color="{COFFEE}"/>
  <stop offset="1" stop-color="#4A3325"/>
</linearGradient>
<radialGradient id="hg" cx="0.74" cy="0.34" r="0.72">
  <stop offset="0" stop-color="#8A6338" stop-opacity="0.46"/>
  <stop offset="1" stop-color="#8A6338" stop-opacity="0"/>
</radialGradient>
'''
hero_body = f'''
<rect width="1600" height="900" fill="url(#hb)"/>
<rect width="1600" height="900" fill="url(#hg)"/>
{bezier_strands(1600, 900, 11, 34, GOLD_SOFT, 0.20, (0.7, 1.9), 0.20)}
<rect x="46" y="46" width="1508" height="808" fill="none" stroke="{GOLD}" stroke-width="1" opacity="0.28"/>
{label("DEYU", 1480, 838, 74, GOLD, anchor="end", spacing=13, family="Georgia, 'Times New Roman', serif")}
{label("SHANDONG  ·  CHINA", 1480, 866, 13, GOLD_SOFT, anchor="end", spacing=5)}
'''
hero_body = hero_body.replace('</svg>', '')
write("placeholder-hero.svg", svg(1600, 900, hero_body, hero_defs))

# ------------------------------------------------------- category placeholders
category_defs = f'''
<linearGradient id="cb" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="{CREAM}"/>
  <stop offset="1" stop-color="{SAND}"/>
</linearGradient>
'''
for i, name in enumerate(["wigs", "closures", "frontals", "extensions", "wefts", "ponytails"], start=1):
    body = f'''
<rect width="800" height="1000" fill="url(#cb)"/>
<rect x="34" y="34" width="732" height="932" fill="none" stroke="{LINE}" stroke-width="1"/>
<rect x="44" y="44" width="712" height="912" fill="none" stroke="{GOLD}" stroke-width="0.7" opacity="0.45"/>
{bezier_strands(800, 1000, 100 + i, 22, COFFEE_3, 0.30, (0.8, 2.1), 0.14)}
{label(f"0{i}", 400, 470, 128, COFFEE, spacing=6, family="Georgia, 'Times New Roman', serif")}
<line x1="330" y1="510" x2="470" y2="510" stroke="{GOLD}" stroke-width="1"/>
{label("COLLECTION", 400, 552, 15, INK, spacing=7)}
{label("PRODUCT IMAGE  /  REPLACE IN CMS", 400, 922, 12, INK, spacing=3)}
'''
    write(f"placeholder-category-{name}.svg", svg(800, 1000, body, category_defs))

# --------------------------------------------------------- product placeholders
product_defs = f'''
<linearGradient id="pb" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="{CREAM}"/>
  <stop offset="1" stop-color="{SAND}"/>
</linearGradient>
'''
tones = ["#4A352A", "#3C2A20", "#5A4031", "#433024", "#523A2B", "#3A271D"]
for i in range(1, 7):
    body = f'''
<rect width="800" height="1000" fill="url(#pb)"/>
<rect x="30" y="30" width="740" height="940" fill="none" stroke="{LINE}" stroke-width="1"/>
{bezier_strands(800, 1000, 300 + i * 7, 26, tones[i - 1], 0.34, (0.8, 2.3), 0.17)}
<circle cx="400" cy="460" r="66" fill="{CREAM}" opacity="0.86"/>
<circle cx="400" cy="460" r="66" fill="none" stroke="{GOLD}" stroke-width="1.2"/>
{label("DY", 400, 480, 40, COFFEE, spacing=2, family="Georgia, 'Times New Roman', serif")}
{label(f"PRODUCT PHOTO  0{i}", 400, 860, 17, COFFEE, spacing=5, family="Georgia, 'Times New Roman', serif")}
<line x1="336" y1="884" x2="464" y2="884" stroke="{GOLD}" stroke-width="1"/>
{label("REPLACE IN CMS", 400, 916, 12, INK, spacing=4)}
'''
    write(f"placeholder-product-{i}.svg", svg(800, 1000, body, product_defs))

# --------------------------------------------------------- factory placeholders
factory_defs = f'''
<linearGradient id="fb" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#F5EFE5"/>
  <stop offset="1" stop-color="#E7DCCA"/>
</linearGradient>
'''
for i in range(1, 9):
    body = f'''
<rect width="1200" height="800" fill="url(#fb)"/>
<rect x="26" y="26" width="1148" height="748" fill="none" stroke="{LINE}" stroke-width="1"/>
<rect x="36" y="36" width="1128" height="728" fill="none" stroke="{GOLD}" stroke-width="0.7" opacity="0.4"/>
{factory_lines(1200, 800, 500 + i * 13, COFFEE_3, 0.36)}
{bezier_strands(1200, 800, 700 + i, 9, GOLD, 0.20, (0.7, 1.4), 0.06)}
<rect x="480" y="330" width="240" height="140" fill="{CREAM}" opacity="0.9"/>
<rect x="480" y="330" width="240" height="140" fill="none" stroke="{GOLD}" stroke-width="1.2"/>
{label("DY", 600, 405, 44, COFFEE, spacing=2, family="Georgia, 'Times New Roman', serif")}
{label("FACTORY / WORKSHOP PHOTO", 600, 440, 12, INK, spacing=4)}
{label(f"0{i}   ·   REPLACE IN CMS", 600, 736, 13, INK, spacing=4)}
'''
    write(f"placeholder-factory-{i}.svg", svg(1200, 800, body, factory_defs))

# -------------------------------------------------------- material placeholders
for i in range(1, 4):
    body = f'''
<rect width="800" height="800" fill="{CREAM}"/>
<rect x="30" y="30" width="740" height="740" fill="none" stroke="{LINE}" stroke-width="1"/>
{bezier_strands(800, 800, 900 + i * 21, 34, COFFEE_3, 0.38, (0.9, 2.6), 0.12)}
{label(f"0{i}", 400, 430, 96, COFFEE, spacing=6, family="Georgia, 'Times New Roman', serif")}
{label("RAW HAIR  /  REPLACE IN CMS", 400, 736, 12, INK, spacing=4)}
'''
    write(f"placeholder-material-{i}.svg", svg(800, 800, body))

print("placeholders written to", IMG)
print("files:", len(list(IMG.glob("*.svg"))))
