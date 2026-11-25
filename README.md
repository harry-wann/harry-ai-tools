# AI 資源庫

以繁體中文整理工具、提示詞與實作筆記，可用英文名稱或中文用途搜尋。[開啟資源庫](https://harry-wann.github.io/harry-ai-tools/)

## 新增素材

把截圖、連結或筆記放入本機的 `raw/`，需要更新時告訴 Codex「整理 raw」。原始素材與含檔名的處理紀錄僅保留於本機。

1. 執行 `rtk python3 scripts/inbox.py`，用 SHA-256 比對 `.local/inventory.json`，列出新增與待補素材。續圖合併閱讀，清單按可獨立查找的資源拆開。同一工具的新用法可補進原條目。
2. 編輯 `docs/resources.json`。每筆使用穩定的 id，填寫 name、summary、category、tags 與 body。有明確來源時加入 url。核對原圖文字，將未辨識的內容列為待補。
3. 更新本機紀錄中的檔名、雜湊、對應資源 ID 和狀態，核對公開資料沒有原圖、個資或無關通知。
4. 以靜態伺服器預覽 docs，測試搜尋與分類。確認發布目標後推送至 main，GitHub Pages 讀取 /docs。等正式網站驗證通過並取得清理同意，再刪除已整理原圖，保留待補素材。

在專案目錄執行 `rtk python3 -m http.server 8000 --bind 127.0.0.1 --directory docs` 可在本機預覽。
