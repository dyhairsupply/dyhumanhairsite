#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DY Deyu | 产品图片批量替换

把真实产品照片放进 images/uploads/products/，按下面任一方式命名，运行一条命令
即可批量写入 content/products.json，不用在后台逐款点开上传。

方式 A（推荐，按产品编号精确对应）
    DY-WG-001.jpg           ->  DY-WG-001 的主图（列表卡片图）
    DY-WG-001_2.jpg         ->  该款第 2 张详情图
    DY-WG-001_3.webp        ->  该款第 3 张详情图
  文件名以产品编号开头即可，同一编号的图片按文件名排序；第一张就是卡片图。
  支持 .jpg .jpeg .png .webp .avif .svg，也支持放进子文件夹。

方式 B（按文件名顺序一一对应，适合整批新拍的照片）
    0001.jpg, 0002.jpg, ...  ->  依次分配给产品目录中第 1、2、3... 款
  需加 --by-order；每款只挂 1 张主图，原有其它图片保留在后面。

用法：
  python tools/batch_images.py                    # 预览将改动什么（不写文件）
  python tools/batch_images.py --yes             # 确认写入
  python tools/batch_images.py --by-order --yes  # 用方式 B
  python tools/batch_images.py --dir images/uploads/photos

注意：只改动匹配到的产品的 images 字段，其它字段与其它产品保持不变。
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "content" / "products.json"
DEFAULT_DIR = ROOT / "images" / "uploads" / "products"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif"}


def natural_key(text):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r"(\d+)", text)]


def find_images(folder):
    if not folder.exists():
        return []
    files = [p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in EXTS]
    return sorted(files, key=lambda p: natural_key(str(p.relative_to(folder))))


def public_path(path):
    return "/" + path.relative_to(ROOT).as_posix()


def main():
    ap = argparse.ArgumentParser(description="批量把真实产品照片挂到产品目录")
    ap.add_argument("--dir", default=str(DEFAULT_DIR), help="照片所在目录")
    ap.add_argument("--by-order", action="store_true", help="按文件名顺序依次分配给产品（方式 B）")
    ap.add_argument("--yes", action="store_true", help="跳过确认直接写入")
    args = ap.parse_args()

    folder = Path(args.dir)
    if not folder.is_absolute():
        folder = ROOT / folder
    files = find_images(folder)
    if not files:
        print(f"目录里没有找到图片：{folder}")
        print("支持格式：" + ", ".join(sorted(EXTS)))
        print("\n方式 A 命名示例：DY-WG-001.jpg、DY-WG-001_2.jpg")
        print("方式 B 命名示例：0001.jpg、0002.jpg（配合 --by-order）")
        return

    data = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    items = data.get("items", [])
    by_id = {p["id"]: p for p in items}
    grouped, unmatched = {}, []

    if args.by_order:
        for i, path in enumerate(files):
            if i >= len(items):
                unmatched.append(path.name)
                continue
            grouped.setdefault(items[i]["id"], []).append(public_path(path))
    else:
        ids_sorted = sorted(by_id.keys(), key=len, reverse=True)
        for path in files:
            stem = path.stem
            hit = next((pid for pid in ids_sorted
                        if stem.lower().startswith(pid.lower())), None)
            if hit:
                grouped.setdefault(hit, []).append(public_path(path))
            else:
                unmatched.append(path.name)

    if not grouped:
        print("没有任何图片能对应到产品编号。")
        print("请确认文件名以产品 ID 开头（如 DY-WG-001.jpg），或改用 --by-order。")
        if unmatched:
            print("未匹配示例：" + ", ".join(unmatched[:8]))
        return

    print(f"\n扫描到 {len(files)} 张图片，可挂到 {len(grouped)} 款产品：")
    print("-" * 62)
    for pid in list(grouped)[:8]:
        print(f"  {pid}: {len(grouped[pid])} 张  ->  {grouped[pid][0]}")
    if len(grouped) > 8:
        print(f"  ... 其余 {len(grouped) - 8} 款省略")
    if unmatched:
        print(f"  未匹配 {len(unmatched)} 张（前几个：{', '.join(unmatched[:5])}）")
    print("-" * 62)

    if not args.yes:
        print("以上是预览，尚未写入。确认请加 --yes 重新运行。")
        return

    changed = 0
    for pid, paths in grouped.items():
        product = by_id[pid]
        if args.by_order:
            old = [u for u in product.get("images", []) if u not in paths]
            product["images"] = paths + old
        else:
            product["images"] = paths
        changed += 1

    with open(PRODUCTS, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"已写入 {changed} 款产品的图片到 content/products.json。")
    print("本地刷新即可看到；线上请 commit & push。若后台正开着，刷新后台页面再编辑。\n")


if __name__ == "__main__":
    main()
