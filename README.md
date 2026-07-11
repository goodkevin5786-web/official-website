# GoodSon Studio 官方網站

乖娛樂工作室的品牌形象網站 —— 純靜態、支援中／英雙語,展示長＆短開箱、遊戲評測、靜態圖文、合作廠商與聯絡資訊。

## 專案結構

```
GoodSonStudio/
├─ index.html               # 首頁(Home)
├─ videos/index.html        # 長&短開箱(Videos)
├─ games/index.html         # 遊戲評測(Games)
├─ photography/index.html   # 靜態圖文(Photography)
├─ partners/index.html      # 合作廠商(Partners)
├─ contact/index.html       # 聯絡我們(Contact)
├─ main.js                  # 全站邏輯:內容渲染、導航、語言切換、彈窗
├─ style.css                # 全站樣式
├─ setting.json             # ★ 所有內容設定(文字／影片ID／圖片路徑／社群連結…)
└─ assets/                  # 靜態資源
   ├─ media/                # 影片相關素材
   ├─ page-heroes/          # 各分頁的主視覺背景
   ├─ partners/             # 合作廠商 logo
   ├─ philosophy/           # 理念區塊圖片
   ├─ photos/               # 圖文素材
   └─ social/               # 社群平台圖示
```

## 修改網站內容

大多數內容都在 [`setting.json`] 調整,無須改動程式碼:

- **文字**:多為 `{ "zh": "中文", "en": "English" }` 的雙語物件。
- **影片**:填入 YouTube 的 `youtube_id` 或 Instagram 的 `permalink`。
- **圖片／logo**:設定 `assets/…` 底下的相對路徑(記得先把檔案放進對應資料夾)。
- **導航列、頁首標題、頁尾**:在 `site_config` 區塊。

> 修改 `setting.json` 後,重新整理瀏覽器即可看到變化。
