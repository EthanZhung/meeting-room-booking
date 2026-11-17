## 1. 前端實作

- [x] 1.1 保留原生日期介面（Preserve the native date interface）：保留 ISO 值、驗證、input/change、sync 與側欄同步；驗證：代理內容審查及已記錄的瀏覽器回填結果。
- [x] 1.2 [after: 1.1] 動畫與減少動態效果（Provide navigable date and month views、Support keyboard access and reduced motion）：提供開合、滑動、總覽、彈跳、鍵盤與純淡變；驗證：代理內容審查、node --check date-picker.js 與動畫測試。
- [x] 1.3 [after: 1.2] 單日預設與可選區間模式（Support optional range selection、Reject unavailable dates with an explanation）：提供預覽、晚數與禁用提示，保留原值；驗證：代理內容審查及晚數／禁用邊界測試。

## 2. 驗證與紀錄

- [x] 2.1 [after: 1.3] 程式測試證明 130ms 純透明度、方向動畫、跨閏日／跨年晚數與 min/max/客滿限制；驗證：本次對話 2026-11-17 的 node --test tests/date-picker.test.cjs 結果為 4 項通過，兩個 JS 的 node --check 與 git diff --check 通過。
- [x] 2.2 [after: 1.3] 代理瀏覽器檢查證明回填、總覽、方向鍵、Enter、Escape、收合、重設、客滿提示與區間操作；驗證：本次 Brave 紀錄中 11/21 至 11/24 為 3 晚，網格 42→35 格，375px 視窗熱區約 45×40px 且彈窗未超出畫面。
- [x] 2.3 [after: 2.1, 2.2] 介面文件記錄實際 API 與驗證限制；驗證：讀回 docs/DATE_PICKER.md，實體觸控、OS 偏好切換、螢幕閱讀器、60fps 與真實預約寫入均未標為通過。

## 3. 歸檔前驗證

- [x] 3.1 [after: 2.3] 補齊三項具體規格範例並消除 May 誤判；新增可重跑的瀏覽器行為斷言與正式 spectra-scenario 註記，確認 13 個情境／範例皆有對應斷言；驗證：spectra analyze 零問題、spectra coverage 無缺漏、8 項瀏覽器情境與 4 項 Node 測試通過，詳細證據見 verification.md。

## 補登依據

本案回填本次對話已交付的實作，沿用同一工作階段的內容審查、測試與瀏覽器證據，不代表本輪重新開發或重跑全部操作。使用者實機驗收尚未提供；未實測的裝置與輔助技術列為限制。本輪僅新增 Spectra 文件與任務紀錄。
