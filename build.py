"""Builds site/index.html from the parts in src/ (concatenated in file-name order).

Edit the files in src/, then run:  python3 build.py
"""
from pathlib import Path

root = Path(__file__).parent
parts = sorted(p for p in (root / "src").iterdir() if p.suffix in {".html", ".js"})
(root / "site" / "index.html").write_text("".join(p.read_text(encoding="utf-8") for p in parts), encoding="utf-8")
print(f"site/index.html built from {len(parts)} parts")
