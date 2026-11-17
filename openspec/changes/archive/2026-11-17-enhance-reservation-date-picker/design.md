## Context

本案於 2026-11-17 補登本次對話已完成的實作，並非重新開發。來源為 Ethan 的日期欄位評論及文字規格；未提供 .dc.html。已讀取 date-picker.js、date-picker.css、script.js、reservation405.html 與 docs/DATE_PICKER.md，驗證證據沿用同一工作階段的測試與瀏覽器操作。

## Goals / Non-Goals

**Goals:** 保留原生欄位與預約計算，提供一致的單日／可選區間操作、動畫、鍵盤及減少動態效果支援。

**Non-Goals:** 不改 API、後端、預約資料格式、既有當日清單隱私規範；不把會議室表單改成跨日預約；不宣稱所有裝置達到 60fps；不部署或提交 Git。

## Decisions

### 保留原生日期介面

保留 #date 的 type=date、name、min、required、validity 與 ISO 值。ReservationDatePicker 使用唯讀文字觸發欄位呈現 YYYY/MM/DD，選取發出原生 input/change，外部更新呼叫 sync。相較直接改成文字輸入，此方式保留原生驗證與現有資料介面。Model the Domain 原則將日期資料集中於原生欄位。

### 動畫與減少動態效果

使用 CSS 與 Web Animations API，不加入第三方依賴。主色 #E11D48、底色 #FFF1F2、邊框 #FDA4AF、文字 #9F1239。以下為使用者指定、程式設定值，不是效能量測：開合 180ms，scale .94 與 translateY(-8px)，緩動 cubic-bezier(0.16,1,0.3,1)；月份滑動 ±32px 與高度過渡 230ms，緩動 cubic-bezier(.4,0,.2,1)；總覽縮放 .91／1.09，230ms；選取 .72→1.1→1，200ms，緩動 cubic-bezier(.22,1.65,.36,1)；區間 170ms；震動 ±4.5／3／1.5px，280ms。prefers-reduced-motion 改為 130ms 純透明度並停用高度動畫。

月份網格使用 35／42 格。高度動畫是需求明定的 layout 例外，其餘動態位移使用 transform／opacity。相較固定六週高度，保留了使用者要求的自適應效果。

### 單日預設與可選區間模式

會議室使用 single；range 僅作為元件選項及獨立測試頁功能。區間預覽連續底色及週界膠囊邊緣，完成後為實心底色並計算曆日晚數。透過 getUnavailableReason 取得禁用原因，原生 min/max 優先；主程式僅在資料載入成功後以既有半小時時段與午休／重疊判斷識別完全訂滿日期，避免把部分有預約誤當客滿。

## Implementation Contract

- 介面：new ReservationDatePicker(input, { mode: 'single' | 'range', getUnavailableReason(dateISO) })，公開 sync()。原生欄位保留 YYYY-MM-DD，顯示 YYYY/MM/DD。
- 單日：選取同步側欄清單與摘要，選取彈跳後自動收合；重設與外部更新同步顯示。
- 區間：date-range-change 的 detail 為 {start,end,nights}，未選終點時 end=null、nights=0；禁止提交含禁用日期的區間；跨閏日及跨年按曆日計算。
- 錯誤：無效日期維持原值並震動／提示原因；未載入元件則保留原生日期輸入；非法 mode 或非 date 輸入擲出 TypeError。
- 操作：方向鍵、Enter、Escape、Home／End、PageUp／PageDown、Tab 邊界；點擊熱區至少 36×36px，375px 視窗已觀察約 45×40px。原生 focus 轉移至可見觸發欄位。
- 驗收：node --test tests/date-picker.test.cjs 的 4 項測試、兩個 JS 的 node --check、git diff --check；Brave 操作月份總覽、月份切換、選取、清空、禁用提示、區間與窄螢幕。
- 歸檔前補充：tests/date-picker.browser.js 在獨立測試頁執行 8 項真實 DOM 情境斷言；正式 spectra-scenario 註記對應 13 個規格情境／範例。詳細結果與檢查範圍記於 verification.md。
- 範圍：只修改前端及測試／文件，不寫入真實預約、不更動其他既有未提交檔案。

## Risks / Trade-offs

- 高度過渡涉及版面計算 → 明確記錄為要求的例外，不做未量測的 60fps 承諾。
- 實體觸控、OS 減少動態效果切換與螢幕閱讀器未實測 → 列為驗證限制，不標為已通過。
- 後端載入失敗 → 不推斷日期客滿，仍由原有送出流程處理資料可用性。
