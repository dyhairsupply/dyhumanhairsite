# -*- coding: utf-8 -*-
"""
DY Deyu - sample catalogue generator.

Creates content/products.json: 6 collections x 60 items = 360 display-only
products. Every record is fully editable from Decap CMS (Products collection).
Replace the sample names, images and copy with your real catalogue over time.

Run:  python tools/gen_catalog.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "products.json"

TEXTURES = [
    ("Straight", "直发"), ("Body Wave", "大波浪"), ("Deep Wave", "深卷"),
    ("Loose Wave", "松散波浪"), ("Water Wave", "水波纹"), ("Natural Wave", "自然波"),
    ("Curly", "卷发"), ("Kinky Curly", "非洲小卷"), ("Burmese Curly", "缅甸卷"),
    ("Yaki Straight", "雅琪直"),
]
LENGTHS = ['12″', '14″', '16″', '18″', '20″', '22″', '24″', '26″', '28″', '30″']
COLOURS = [
    ("Natural Black 1B", "自然黑 1B"), ("Off Black 1B", "乌黑 1B"),
    ("Dark Brown #2", "深棕 #2"), ("Chocolate Brown #4", "巧克力棕 #4"),
    ("613 Blonde", "613 浅金"), ("Piano Highlight", "钢琴挑染"),
]
MATERIALS = [
    ("burmese", "Burmese Hair", "缅甸发"),
    ("yunnan", "Yunnan Hair", "云南发"),
    ("vietnamese", "Vietnamese Hair", "越南发"),
]

WIGS = [
    ("13x4 Lace Front Wig", "13×4 蕾丝前额头套"),
    ("13x6 HD Lace Front Wig", "13×6 HD 蕾丝前额头套"),
    ("5x5 Glueless Lace Wig", "5×5 免胶蕾丝头套"),
    ("Full Lace Wig", "全蕾丝头套"),
    ("360 Lace Wig", "360 蕾丝头套"),
    ("Bob Lace Wig", "蕾丝波波头套"),
    ("4x4 Closure Wig", "4×4 发块头套"),
    ("U-Part Wig", "U 型开口头套"),
    ("V-Part Wig", "V 型开口头套"),
    ("Headband Wig", "发带头套"),
]
CLOSURES = [
    ("4x4 Transparent Lace Closure", "4×4 透明蕾丝发块"),
    ("5x5 HD Lace Closure", "5×5 HD 蕾丝发块"),
    ("6x6 HD Lace Closure", "6×6 HD 蕾丝发块"),
    ("2x6 Lace Closure", "2×6 蕾丝发块"),
    ("7x7 Lace Closure", "7×7 蕾丝发块"),
    ("4x4 Silk Base Closure", "4×4 丝网底发块"),
    ("5x5 Free Part Closure", "5×5 自由分发块"),
    ("4x4 Middle Part Closure", "4×4 中分发块"),
    ("4x4 Three Part Closure", "4×4 三七分发块"),
    ("9x6 Lace Closure", "9×6 蕾丝发块"),
]
FRONTALS = [
    ("13x4 HD Lace Frontal", "13×4 HD 蕾丝发套"),
    ("13x6 Transparent Lace Frontal", "13×6 透明蕾丝发套"),
    ("13x4 Ear-to-Ear Frontal", "13×4 耳到耳蕾丝发套"),
    ("360 Lace Frontal", "360 蕾丝发套"),
    ("13x6 HD Lace Frontal", "13×6 HD 蕾丝发套"),
    ("Full Lace Frontal", "全蕾丝发套"),
    ("13x4 Pre-Plucked Frontal", "13×4 预拔发际线发套"),
    ("13x4 Frontal with Baby Hair", "13×4 带胎毛发套"),
    ("13x6 Deep Part Frontal", "13×6 深分缝发套"),
    ("13x4 Swiss Lace Frontal", "13×4 瑞士蕾丝发套"),
]
EXTENSIONS = [
    ("Tape-In Hair Extensions", "无痕胶带接发"),
    ("I-Tip Keratin Bond Extensions", "I 型角质蛋白接发"),
    ("U-Tip Keratin Bond Extensions", "U 型角质蛋白接发"),
    ("Flat-Tip Keratin Bond Extensions", "扁平头角质蛋白接发"),
    ("Clip-In Extensions Set", "卡扣接发套装"),
    ("Nano Ring Hair Extensions", "纳米环接发"),
    ("Micro Loop Hair Extensions", "微环接发"),
    ("Halo Hair Extensions", "隐形发圈接发"),
    ("Fusion Bond Hair Extensions", "热熔接发"),
    ("Pre-Bonded Stick Tip Extensions", "预接发束"),
]
WEFTS = [
    ("Machine Weft Hair Bundles", "机制发帘发束"),
    ("Hand-Tied Weft Hair", "手工发帘"),
    ("Genius Weft Hair", "无痕超薄发帘"),
    ("Flat Weft Hair Extensions", "平贴发帘"),
    ("Double Drawn Weft Bundles", "双抽发帘发束"),
    ("Raw Hair Weft Bundles", "原发发帘发束"),
    ("Invisible Weft Hair", "隐形发帘"),
    ("3 Bundle Deal Weft Hair", "三束套装发帘"),
    ("4 Bundle Deal Weft Hair", "四束套装发帘"),
    ("Single Donor Weft Hair", "单人供体发帘"),
]
PONYTAILS = [
    ("Wrap-Around Ponytail", "缠绕式马尾"),
    ("Drawstring Ponytail", "抽绳式马尾"),
    ("Claw Clip Ponytail", "抓夹马尾"),
    ("Ponytail with Combs", "梳齿固定马尾"),
    ("Afro Puff Ponytail", "蓬松卷马尾"),
    ("Braided Ponytail", "编发马尾"),
    ("Long Wave Ponytail", "长波浪马尾"),
    ("Curly Ponytail", "卷发马尾"),
    ("Straight Ponytail", "直发马尾"),
    ("Short Bob Ponytail", "短波波马尾"),
]

CATALOG = [
    {
        "slug": "wigs", "code": "WG", "types": WIGS,
        "construction": ("{}, 150% density, adjustable straps", "{}，150% 密度，可调松紧带"),
        "weight": ("180-260 g / unit", "180-260 g / 顶"),
        "focus_en": "The cap is finished with adjustable straps and combs, and the hairline can be parted and styled freely.",
        "focus_zh": "内网配调节带与梳齿，佩戴稳固；发际线可分缝、可自由造型。",
    },
    {
        "slug": "closures", "code": "CL", "types": CLOSURES,
        "construction": ("{}, free part, hand-ventilated", "{}，自由分缝，手工钩织"),
        "weight": ("35-60 g / piece", "35-60 g / 片"),
        "focus_en": "The parting stays natural and the lace lies flat, so it disappears against the scalp once installed.",
        "focus_zh": "分缝自然、网底服帖，安装后与头皮过渡几乎看不出接缝。",
    },
    {
        "slug": "frontals", "code": "FR", "types": FRONTALS,
        "construction": ("{}, ear-to-ear, pre-plucked hairline", "{}，耳到耳，发际线预拔"),
        "weight": ("70-110 g / piece", "70-110 g / 片"),
        "focus_en": "An ear-to-ear hairline with pre-plucked edges gives stylists room for ponytails and updos.",
        "focus_zh": "耳到耳发际线配合预拔边缘，可扎马尾、可盘发。",
    },
    {
        "slug": "extensions", "code": "EX", "types": EXTENSIONS,
        "construction": ("{}, 1 g per strand, 20 strands per pack", "{}，单束 1 g，每包 20 束"),
        "weight": ("100 g / pack", "100 g / 包"),
        "focus_en": "Grams per piece and bond quality are kept consistent, so salon reorders match the first pack exactly.",
        "focus_zh": "单束克重与接头质量稳定，沙龙返单与首批完全一致。",
    },
    {
        "slug": "wefts", "code": "WF", "types": WEFTS,
        "construction": ("{}, double drawn, reinforced seam", "{}，双抽工艺，加固锁边"),
        "weight": ("100 g / bundle", "100 g / 束"),
        "focus_en": "Double-drawn hair means full ends, very few short strands and minimal shedding after washing.",
        "focus_zh": "双抽工艺发尾饱满、短发少，水洗后掉发量极低。",
    },
    {
        "slug": "ponytails", "code": "PT", "types": PONYTAILS,
        "construction": ("{}, inner combs, secure wrap fastening", "{}，内置梳齿，缠绕固定"),
        "weight": ("120-160 g / piece", "120-160 g / 件"),
        "focus_en": "The attachment is discreet and secure, with the weight balanced so the piece stays comfortable all day.",
        "focus_zh": "固定结构隐形牢靠，配重均衡，长时间佩戴也不压头皮。",
    },
]


def description_en(cat, mat_en, tex, type_en, variant):
    t = tex.lower()
    if variant == 0:
        return (f"Made from 100% {mat_en} human hair with intact, aligned cuticles, this {t} {type_en.lower()} "
                f"is graded, washed and finished in our own workshop. {cat['focus_en']} "
                "The hair keeps its pattern after washing and takes heat styling and colour well.")
    if variant == 1:
        return (f"We build this {t} {type_en.lower()} from a single graded batch of {mat_en} human hair - "
                f"no synthetic blend, no mixed cuticles. {cat['focus_en']} "
                "Every piece is inspected under daylight lamps for texture hold, shade and net weight before packing.")
    return (f"A {t} {type_en.lower()} for professional buyers: 100% {mat_en} human hair, cuticles kept in one "
            f"direction, and the specification recorded against the batch. {cat['focus_en']} "
            "Suitable for repeated professional use, heat styling and custom colouring.")


def description_zh(cat, mat_zh, tex_zh, type_zh, variant):
    if variant == 0:
        return (f"选用 100% {mat_zh}，毛鳞片完整顺向，{tex_zh}{type_zh}在自有车间完成分级、洗护与后整。"
                f"{cat['focus_zh']}洗后卷度稳定，可烫可染，适合长期重复使用。")
    if variant == 1:
        return (f"同一等级、同一批次的{mat_zh}真人发制作{tex_zh}{type_zh}，不掺化纤、不混逆向发。"
                f"{cat['focus_zh']}标准光源下逐件核对卷度、色号与净重后包装。")
    return (f"面向专业采购的{tex_zh}{type_zh}：100% {mat_zh}真人发，毛鳞片顺向，批次规格留档。"
            f"{cat['focus_zh']}可烫染、可复购，返单与确认样保持一致。")


def build():
    products = []
    seen = set()
    for ci, cat in enumerate(CATALOG):
        types = cat["types"]
        for i in range(60):
            ti = i % len(types)
            xi = (i * 3 + i // len(types) + ci) % len(TEXTURES)
            li = (i * 7 + ci * 2) % len(LENGTHS)
            coli = (i // 2 + ci) % len(COLOURS)
            mi = (i * 2 + ci) % len(MATERIALS)
            type_en, type_zh = types[ti]
            tex_en, tex_zh = TEXTURES[xi]
            length = LENGTHS[li]
            col_en, col_zh = COLOURS[coli]
            mat_key, mat_en, mat_zh = MATERIALS[mi]
            mat_adj = mat_en.replace(" Hair", "")  # "Burmese human hair" reads better in prose

            # guarantee a unique display name even when combinations repeat
            tries = 0
            key = (cat["slug"], type_en, tex_en, length, col_en)
            while key in seen and tries < 12:
                tries += 1
                coli = (coli + 1) % len(COLOURS)
                col_en, col_zh = COLOURS[coli]
                key = (cat["slug"], type_en, tex_en, length, col_en)
            seen.add(key)

            num = i + 1
            code = f"DY-{cat['code']}-{num:03d}"
            variant = (i + ci) % 3
            images = [f"/images/placeholder-product-{((i + k + ci) % 6) + 1}.svg" for k in range(4)]

            products.append({
                "id": code,
                "category": cat["slug"],
                "name_en": f"{type_en}, {tex_en}, {length}, {col_en}",
                "name_zh": f"{type_zh}｜{tex_zh} {length} {col_zh}",
                "material": mat_key,
                "summary_en": f"{tex_en} {type_en} in {length} {col_en}, made from 100% {mat_adj} human hair.",
                "summary_zh": f"{mat_zh} {tex_zh}{type_zh}，{length} {col_zh}，100% 真人发。",
                "description_en": description_en(cat, mat_adj, tex_en, type_en, variant),
                "description_zh": description_zh(cat, mat_zh, tex_zh, type_zh, variant),
                "texture_en": tex_en,
                "texture_zh": tex_zh,
                "length": length,
                "colour_en": col_en,
                "colour_zh": col_zh,
                "construction_en": cat["construction"][0].format(type_en),
                "construction_zh": cat["construction"][1].format(type_zh),
                "weight_en": cat["weight"][0],
                "weight_zh": cat["weight"][1],
                "grade_en": "12A - cuticle aligned, double drawn",
                "grade_zh": "12A · 毛鳞片顺向，双抽工艺",
                "images": images,
                "video": "",
                "video_poster": "",
            })
    return {"items": products}


if __name__ == "__main__":
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB), {len(data['items'])} products")
    for c in CATALOG:
        n = sum(1 for p in data["items"] if p["category"] == c["slug"])
        print(f"  {c['slug']:<12} {n} products")
