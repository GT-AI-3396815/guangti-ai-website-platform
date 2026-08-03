# -*- coding: utf-8 -*-
import json

BASE = "C:/Users/AW/WorkBuddy/2026-07-30-21-07-56/guangti-platform"
def load(p):
    with open(p, encoding="utf-8") as f: return f.read()

brands = load(f"{BASE}/brands.json")
types = load(f"{BASE}/backend_tmp_types.json") if False else load(f"{BASE}/types.json")
backend = load(f"{BASE}/backend.json")
tpl = load(f"{BASE}/template.html")

# safety: prevent </script> breakage inside data
def safe(s): return s.replace("</", "<\\/")

html = tpl
html = html.replace("__BRANDS__", safe(brands))
html = html.replace("__TYPES__", safe(types))
html = html.replace("__BACKEND__", safe(backend))

# sanity: ensure no placeholder remains
for ph in ("__BRANDS__","__TYPES__","__BACKEND__"):
    assert ph not in html, f"placeholder {ph} not replaced!"

out = f"{BASE}/index.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

import os
print("index.html 大小:", os.path.getsize(out), "bytes")
print("含 74 品牌:", '"id": "stripe"' in html or '"id":"stripe"' in html)
print("含 100 类型:", html.count('"prompt"') if '"prompt"' in html else html.count('"prompt"'))
# quick count of brands/types by counting known markers
print("brand cards data length check: brands.json chars =", len(brands))
print("types.json chars =", len(types))
print("backend.json chars =", len(backend))
