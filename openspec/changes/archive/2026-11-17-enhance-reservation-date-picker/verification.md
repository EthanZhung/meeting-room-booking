# 日期選擇器變更驗證

驗證日期：2026-11-17。目標：enhance-reservation-date-picker。依 Spectra verify 流程核對現行實作、設計、任務與情境斷言。

## 結果

| 面向 | 結果 |
| --- | --- |
| 完整性 | 7／7 任務完成，5／5 規格需求找到實作 |
| 文件一致性 | analyze 的 5 個面向皆 Clean，0 項建議、警告或重大問題；validate 通過 |
| 情境追蹤 | coverage：13 annotated、0 missing、0 excluded；已閱讀對應斷言，非只依註記判定 |
| 執行結果 | 4 項 Node 測試與 8 項真實 DOM 瀏覽器情境全部 passed-current |
| 設計相符 | 保留原生日期介面、無新增依賴、單日預設、可選區間及減少動態效果處理均相符 |

在已檢查的現行檔案範圍內，未發現阻擋歸檔的規格偏離。此結論不宣稱完整歷史差異覆蓋，也不代表已通過未執行的裝置或輔助技術測試。

## 需求對照

| Requirement | 實作位置 | 情境與範例斷言 | 執行證據 |
| --- | --- | --- | --- |
| Preserve the native date interface | date-picker.js 的 build、sync、select、reset 事件；script.js 的 datePicker 初始化與 generateCalendar | 單日 ISO／顯示值、change 次數、自動收合；2026-12-25 外部更新及重設至 2026-11-18、change=0 | tests/date-picker.browser.js，passed-current；預約側欄與摘要整合另由主程式靜態核對，未寫入真實預約 |
| Provide navigable date and month views | date-picker.js 的 render、navigate 與 panel click | 2026-05 的 42 格切至 2026-06 的 35 格；November 2026 總覽選 month 12 返回 December、35 格 | tests/date-picker.browser.js，passed-current |
| Reject unavailable dates with an explanation | date-picker.js 的 unavailable、select、invalid；script.js 的 getUnavailableReason | 2026-11-20 callback 拒絕，原值仍為 2026-11-18，顯示外部原因；Node min/max 邊界 | 瀏覽器及 Node 均 passed-current；完全訂滿的 adapter 邏輯靜態核對，沒有對真實後端造資料 |
| Support optional range selection | date-picker.js 的 select、preview、paintRange、nights | 11/21–11/24 連續預覽、3 晚事件；11/18–11/21 包含禁用 11/20 時 end=null 且提示；閏日、跨年、同日範例每列皆使用原值 | 瀏覽器及 Node 均 passed-current |
| Support keyboard access and reduced motion | date-picker.js 的 onKeyDown、animate、close；date-picker.css 的 reduced-motion 規則 | ArrowRight 的焦點、選取回填及返回 trigger、Escape；縮放／震動／高度轉為 130ms opacity-only | DOM 情境及 Node 均 passed-current；另以瀏覽器控制工具實際按 ArrowRight、Enter，回填 2026-12-19、顯示 2026/12/19，自動收合後焦點回到 trigger |

## 修正的 4 項建議

1. 外部更新／重設補入具體日期與事件計數的 Example。
2. 月份總覽補入 November 2026→month 12→2026-12、35 格的 Example。
3. 禁用區間補入 2026-11-18、禁用 2026-11-20、終點 2026-11-21 的 Example。
4. May 為英文月份，被分析器誤認成模糊用語；改寫為 2026-05→2026-06，行為不變。

## 本輪執行

- node --test tests/date-picker.test.cjs：4 passed、0 failed，current output。
- node --check date-picker.js、script.js、tests/date-picker.browser.js：通過，current output。
- git diff --check：通過；僅有既有 LF／CRLF 提醒。
- Brave 開啟 /tests/date-picker.html，按「執行規格情境測試」：8／8 passed，DOM 的 data-passed=true。
- 初版情境測試以固定 450ms 判定收合，曾出現 2 項時間相關失敗；改為等待實際 hidden 狀態、上限 4 秒後重跑全數通過。未為此修改產品程式。
- spectra analyze、spectra coverage、spectra validate：結果如上，current output。
- 繁中規格對照已由 new translation 驗證 source_hash、段落與數值相符。

瀏覽器結果檔：C:/Users/User/.codex/visualizations/2026/11/17/01a1e825-f654-7a12-b6b6-f3165f57f246/date-picker-browser-results.json。

## 範圍與限制

最終 scope snapshot 記於工作階段輸出目錄的 datepicker-scope.json，於本報告寫入後擷取。精確範圍為 date-picker.css、date-picker.js、docs/DATE_PICKER.md、reservation405.html、script.js、tests/date-picker.browser.js、tests/date-picker.html、tests/date-picker.test.cjs。

本案於實作後補登，沒有經驗證的實作前基準，CLI scope 因 missing_comparison_base 回報 insufficient。可檢查目前上述檔案與行為，但不能據此保證整份歷史差異皆已歸屬本案；本次沒有猜測基準或將其他髒檔納入。檔案雜湊記於同目錄 verification-files.json，歸檔前另檢查 scope snapshot 未變。

實體手機觸控拖曳、OS 減少動態效果切換、螢幕閱讀器與各裝置 60fps 均為 not-run。Node 已執行減少動態效果的純透明度分支，但不等同實機 OS 測試。375px 響應式觀察沿用本次對話先前紀錄，非本輪重新量測。沒有送出、取消或更改真實預約。
