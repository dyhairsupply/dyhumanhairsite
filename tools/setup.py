#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DY Deyu | 上线信息一键替换向导

把示例的联系方式、社交链接、地图和域名一次性写进所有相关文件：
  content/site.json      品牌 / 邮箱 / WhatsApp / 电话 / 地址 / 社交 / 地图 / 域名
  admin/config.yml       site_url
  robots.txt             Sitemap 绝对地址
  sitemap.xml            全部页面地址（并按当前分类自动重建）

用法（在 dy-deyu-site 目录下）：
  python tools/setup.py                          # 交互式，逐项问，回车 = 保留原值
  python tools/setup.py --domain https://www.deyuhair.com   # 只换域名
  python tools/setup.py --config my-site-info.json          # 用配置文件批量替换
  python tools/setup.py --template                        # 生成配置模板
  python tools/setup.py --show                            # 查看当前值
  python tools/setup.py --config my-site-info.json --yes   # 不询问直接写入

无需第三方库。写之前会列出改动清单并确认，可用 Git 随时回滚。
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
SITE_FILE = ROOT / "content" / "site.json"
CATS_FILE = ROOT / "content" / "categories.json"
CONFIG_FILE = ROOT / "admin" / "config.yml"
ROBOTS_FILE = ROOT / "robots.txt"
SITEMAP_FILE = ROOT / "sitemap.xml"
TEMPLATE_FILE = ROOT / "my-site-info.json"

# key -> (提示语, 补充说明)
QUESTIONS = [
    ("domain",          "网站域名（带 https://）",        "例：https://www.deyuhair.com  绑定域名后填"),
    ("email",           "联系邮箱",                      "例：sales@deyuhair.com"),
    ("whatsapp_display", "WhatsApp 显示号码",            "例：+86 153 1234 5678"),
    ("whatsapp_number", "WhatsApp 纯数字（wa.me 链接）",  "例：8615312345678，不要 + 或空格"),
    ("telephone",       "座机 / 电话",                   "例：+86 530 123 4567"),
    ("address_en",      "英文地址",                      "外贸客户看到，建议写到省 / 市 / 县"),
    ("address_zh",      "中文地址",                      ""),
    ("hours_en",        "英文工作时间",                  ""),
    ("hours_zh",        "中文工作时间",                  ""),
    ("map_embed_url",   "谷歌地图嵌入链接",              "Google Maps → 分享 → 嵌入地图 → 复制 src，留空则显示占位图"),
    ("social.facebook", "Facebook 主页链接",             "填 remove 可删除该图标，回车保留"),
    ("social.instagram", "Instagram 主页链接",           ""),
    ("social.youtube",  "YouTube 频道链接",              ""),
    ("social.linkedin", "LinkedIn 主页链接",             ""),
    ("social.tiktok",   "TikTok 主页链接",               ""),
]

SITE_KEYS = [
    "email", "whatsapp_display", "whatsapp_number", "telephone",
    "address_en", "address_zh", "hours_en", "hours_zh",
    "map_embed_url", "site_url",
]

EXAMPLE_TEMPLATE = {
    "_说明": "只填要改的项，其余删掉即可；social 里填 remove 表示删除该图标。填好运行：python tools/setup.py --config my-site-info.json",
    "domain": "https://www.deyuhair.com",
    "email": "sales@deyuhair.com",
    "whatsapp_display": "+86 153 1234 5678",
    "whatsapp_number": "8615312345678",
    "telephone": "+86 530 123 4567",
    "address_en": "Deyu Industrial Park, Juancheng County, Heze, Shandong, P.R. China",
    "address_zh": "中国山东省菏泽市鄄城县德宇发制品产业园",
    "hours_en": "Monday - Saturday, 08:30 - 18:00 (GMT+8)",
    "hours_zh": "周一至周六 08:30 - 18:00（北京时间）",
    "map_embed_url": "",
    "social": {
        "facebook": "https://www.facebook.com/yourpage",
        "instagram": "https://www.instagram.com/yourpage",
        "youtube": "https://www.youtube.com/@yourchannel",
        "linkedin": "remove",
        "tiktok": "https://www.tiktok.com/@yourpage"
    }
}


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_text(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def norm_domain(value):
    value = (value or "").strip().rstrip("/")
    if not value:
        return ""
    if not re.match(r"^https?://", value, re.I):
        value = "https://" + value
    return value


def current_domain(site):
    return norm_domain(site.get("site_url", ""))


def get_social(site, platform):
    for row in site.get("social", []):
        if row.get("platform") == platform:
            return row.get("url", "")
    return ""


def current_values(site):
    vals = {"domain": current_domain(site)}
    for key in SITE_KEYS:
        if key != "site_url":
            vals[key] = site.get(key, "")
    for key, _, _ in QUESTIONS:
        if key.startswith("social."):
            vals[key] = get_social(site, key.split(".", 1)[1])
    return vals


def show(site):
    vals = current_values(site)
    print("\n当前站点信息：")
    print("-" * 62)
    for key, label, _ in QUESTIONS:
        print(f"  {label:<30} {vals.get(key, '') or '(未填写)'}")
    print("-" * 62)
    print("  社交链接会显示在页脚；WhatsApp 图标使用 whatsapp_number 生成 wa.me 链接。\n")


def interactive(site):
    vals = current_values(site)
    print("\n逐项填写，直接回车 = 保持当前值。填 remove = 删除该项。\n")
    answers = {}
    for key, label, hint in QUESTIONS:
        cur = vals.get(key, "")
        suffix = f"  [{cur}]" if cur else "  (当前为空)"
        tip = f"  ({hint})" if hint else ""
        try:
            raw = input(f"{label}{suffix}{tip}\n  > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n已取消，未写入任何文件。")
            sys.exit(0)
        if raw:
            answers[key] = raw
    return answers


def normalize_answers(raw):
    """把扁平的 social.xxx 折叠成 social 字典，并清洗域名 / WhatsApp 数字。"""
    out, social = {}, {}
    for k, v in raw.items():
        if k == "_说明":
            continue
        if k.startswith("social."):
            social[k.split(".", 1)[1]] = v
        elif k == "social" and isinstance(v, dict):
            social.update(v)
        else:
            out[k] = v
    if social:
        out["social"] = social
    if "domain" in out:
        out["domain"] = norm_domain(out["domain"])
    if "whatsapp_number" in out:
        digits = re.sub(r"\D", "", out["whatsapp_number"])
        if digits:
            out["whatsapp_number"] = digits
    return out


def apply_social(site, social):
    rows = list(site.get("social", []))
    by_platform = {r.get("platform"): r for r in rows}
    order = ["facebook", "instagram", "youtube", "linkedin", "tiktok", "whatsapp"]
    for platform, value in social.items():
        platform = platform.strip().lower()
        value = (value or "").strip()
        if not value:
            continue
        if value.lower() == "remove":
            rows = [r for r in rows if r.get("platform") != platform]
            by_platform.pop(platform, None)
            continue
        if platform in by_platform:
            by_platform[platform]["url"] = value
        else:
            row = {"platform": platform, "url": value}
            rows.append(row)
            by_platform[platform] = row
    # 稳定排序，未列出的平台（如 whatsapp）排在后面
    rows.sort(key=lambda r: order.index(r.get("platform")) if r.get("platform") in order else 99)
    site["social"] = rows


def build_sitemap(domain):
    cats = read_json(CATS_FILE).get("items", [])
    cats = sorted(cats, key=lambda c: c.get("order", 99))
    entries = [("/", "monthly", "1.0"), ("/products", "monthly", "0.9")]
    entries += [(f"/products/{c['slug']}", "monthly", "0.8") for c in cats]
    entries += [(p, "monthly", "0.7") for p in ("/factory", "/about", "/contact")]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!-- Generated by tools/setup.py. Run it again after adding a category or changing the domain. -->',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for path, freq, priority in entries:
        lines.append(f"  <url><loc>{domain}{path}</loc><changefreq>{freq}</changefreq><priority>{priority}</priority></url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser(description="DY Deyu 上线信息一键替换向导")
    ap.add_argument("--config", help="读取 JSON 配置文件批量替换")
    ap.add_argument("--domain", help="只替换域名（同时更新 sitemap / robots / CMS / site.json）")
    ap.add_argument("--template", action="store_true", help="生成配置模板 my-site-info.json")
    ap.add_argument("--show", action="store_true", help="显示当前值")
    ap.add_argument("--yes", action="store_true", help="跳过写入确认")
    args = ap.parse_args()

    if args.template:
        if TEMPLATE_FILE.exists():
            print(f"模板已存在：{TEMPLATE_FILE.name}（未覆盖）")
        else:
            write_text(TEMPLATE_FILE, json.dumps(EXAMPLE_TEMPLATE, ensure_ascii=False, indent=2) + "\n")
            print(f"已生成模板：{TEMPLATE_FILE}")
            print(f"用记事本 / VS Code 填好后运行：python tools/setup.py --config {TEMPLATE_FILE.name}")
        return

    site = read_json(SITE_FILE)
    if args.show:
        show(site)
        return

    if args.config:
        p = Path(args.config)
        if not p.is_absolute():
            p = ROOT / p
        if not p.exists():
            print(f"找不到配置文件：{p}")
            sys.exit(1)
        answers = normalize_answers(read_json(p))
    elif args.domain:
        answers = {"domain": norm_domain(args.domain)}
    else:
        show(site)
        answers = normalize_answers(interactive(site))

    if not answers:
        print("没有填写任何改动，文件保持不变。")
        return

    new_site = json.loads(json.dumps(site))  # 深拷贝，保留字段顺序
    changes = []

    for key in SITE_KEYS:
        if key in answers and answers[key] != site.get(key, ""):
            new_site[key] = answers[key]
            changes.append(f"site.json  {key}: {site.get(key, '') or '(空)'}  ->  {answers[key]}")

    if "domain" in answers:
        new_site["site_url"] = answers["domain"]

    if "social" in answers:
        apply_social(new_site, answers["social"])
        changes.append("site.json  social: 已按配置更新社交链接")

    # WhatsApp 图标跟随纯数字号码
    if "whatsapp_number" in answers:
        digits = answers["whatsapp_number"]
        for row in new_site.get("social", []):
            if row.get("platform") == "whatsapp":
                row["url"] = f"https://wa.me/{digits}"
        changes.append(f"site.json  whatsapp 图标链接 -> https://wa.me/{digits}")

    domain = norm_domain(new_site.get("site_url", "")) or "https://your-domain.com"
    if not domain or "your-domain" in domain:
        print("提示：域名仍是示例值，sitemap / robots 会保留示例域名。")

    cfg_text = CONFIG_FILE.read_text(encoding="utf-8")
    robots_text = ROBOTS_FILE.read_text(encoding="utf-8")

    new_cfg = re.sub(r'(?m)^site_url:.*$', f'site_url: "{domain}"', cfg_text)
    if not re.search(r"(?m)^site_url:", new_cfg):
        new_cfg = cfg_text.replace("backend:", f'site_url: "{domain}"\n\nbackend:', 1)
    new_robots = re.sub(r"(?m)^Sitemap:.*$", f"Sitemap: {domain}/sitemap.xml", robots_text)
    if not re.search(r"(?m)^Sitemap:", new_robots):
        new_robots = robots_text.rstrip() + f"\nSitemap: {domain}/sitemap.xml\n"
    new_sitemap = build_sitemap(domain)

    if new_cfg != cfg_text:
        changes.append(f"admin/config.yml  site_url -> {domain}")
    if new_robots != robots_text:
        changes.append(f"robots.txt  Sitemap -> {domain}/sitemap.xml")
    new_sitemap_old = SITEMAP_FILE.read_text(encoding="utf-8")
    if new_sitemap != new_sitemap_old:
        changes.append("sitemap.xml  按当前域名与产品分类重新生成")

    if not changes:
        print("内容与当前文件一致，无需写入。")
        return

    print("\n即将写入以下改动：")
    print("-" * 62)
    for line in changes:
        print("  " + line)
    print("-" * 62)
    print("涉及文件：content/site.json, admin/config.yml, robots.txt, sitemap.xml")
    if not args.yes:
        try:
            ok = input("确认写入？[y/N] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            ok = ""
        if ok not in ("y", "yes"):
            print("已取消，未写入任何文件。")
            return

    write_text(SITE_FILE, json.dumps(new_site, ensure_ascii=False, indent=2) + "\n")
    write_text(CONFIG_FILE, new_cfg)
    write_text(ROBOTS_FILE, new_robots)
    write_text(SITEMAP_FILE, new_sitemap)
    print("\n完成。本地预览刷新即可看到；线上请 git commit && git push，Netlify 会自动发布。")
    print("图片、视频、页面文案和产品仍在后台 /admin/ 里替换，见 README 第五节。\n")


if __name__ == "__main__":
    main()
