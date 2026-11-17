## Why

原生日期輸入框缺少一致的視覺與操作回饋。Ethan 要求保留既有 Vanilla JS 日期計算、欄位介面與預約連動，加入珊瑚紅日期彈窗及微互動。

## What Changes

- 以漸進增強方式加入單日日期選取，顯示 YYYY/MM/DD，保留原生 YYYY-MM-DD 值、驗證及事件。
- 加入開合定位縮放、方向性月份滑動與高度調整、月份總覽縮放、選取彈跳與禁用提示。
- 提供可選區間模式、連續預覽、晚數及區間事件；預約表單維持單日模式。
- 支援鍵盤、觸控事件、減少動態效果與窄螢幕版面，不新增套件依賴。
- 本案為實作完成後補登；已驗證與未實測項目分開記錄。

## Capabilities

### New Capabilities

- `reservation-date-picker`: 定義日期欄位相容性、動畫、區間選取與無障礙操作。

### Modified Capabilities

無。既有 calendar-reservation-details 的清單內容與隱私要求不變。

## Impact

- Affected specs: reservation-date-picker
- Affected code:
  - Modified: reservation405.html, script.js
  - New: date-picker.js, date-picker.css, docs/DATE_PICKER.md, tests/date-picker.html, tests/date-picker.test.cjs, tests/date-picker.browser.js
  - Removed: none
- 不修改 Google Apps Script、資料格式、時段計算與衝突規則，不新增外部依賴。
