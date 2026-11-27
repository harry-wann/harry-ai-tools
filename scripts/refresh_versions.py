"""Refresh public GitHub repository metadata for the static resource directory."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo
import json
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

CATALOG = Path(__file__).resolve().parents[1] / "docs" / "resources.json"


def repository(item):
    url = urlsplit(item.get("github") or "")
    parts = url.path.strip("/").split("/")
    if url.hostname == "github.com" and len(parts) >= 2:
        return "/".join(parts[:2])
    return None


def api(endpoint, *, allow_missing=False):
    result = subprocess.run(["gh", "api", endpoint], capture_output=True, text=True)
    if result.returncode:
        if allow_missing and "(HTTP 404)" in result.stderr:
            return None
        raise RuntimeError(f"{endpoint}: {result.stderr.strip()}")
    return json.loads(result.stdout)


def metadata(repo):
    info = api(f"repos/{repo}")
    release = api(f"repos/{repo}/releases/latest", allow_missing=True)
    return repo, (release["tag_name"] if release else "無正式 Release", info["pushed_at"][:10])


def main():
    items = json.loads(CATALOG.read_text())
    repos = sorted({repo for item in items if (repo := repository(item))})
    if not repos:
        raise ValueError("找不到 GitHub 專案，已保留原資料。")
    if any(item.get("github") and not repository(item) for item in items):
        raise ValueError("GitHub 專案網址格式錯誤，已保留原資料。")
    with ThreadPoolExecutor(max_workers=6) as pool:
        values = dict(pool.map(metadata, repos))
    today = datetime.now(ZoneInfo("Asia/Taipei")).date().isoformat()
    for item in items:
        repo = repository(item)
        version, updated = values[repo] if repo else ("未提供", "未提供")
        item.update(version=version, updated=updated, checked=today)
    output = CATALOG.with_suffix(".tmp")
    output.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
    output.replace(CATALOG)
    print(f"已核對 {len(repos)} 個 GitHub 專案，更新 {len(items)} 筆資源。")


if __name__ == "__main__":
    main()
