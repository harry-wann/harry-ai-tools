"""List raw materials that still need attention, including renamed duplicates."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    inventory = ROOT / ".local" / "inventory.json"
    records = json.loads(inventory.read_text()) if inventory.exists() else []
    by_hash = {item["sha256"]: item for item in records}
    waiting = 0
    for path in sorted((ROOT / "raw").rglob("*")):
        if not path.is_file() or path.is_symlink() or path.name == ".DS_Store":
            continue
        with path.open("rb") as source:
            digest = hashlib.sha256()
            for chunk in iter(lambda: source.read(1048576), b""):
                digest.update(chunk)
        item = by_hash.get(digest.hexdigest())
        if item and item["status"] == "processed":
            continue
        label = "待補" if item else "新增"
        print(f"{label}  {path.relative_to(ROOT)}")
        waiting += 1
    print(f"共有 {waiting} 份素材待整理。")


if __name__ == "__main__":
    main()
