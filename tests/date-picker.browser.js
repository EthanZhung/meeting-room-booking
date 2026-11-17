(() => {
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const settle = () => new Promise(resolve => setTimeout(resolve, 450));
    const waitClosed = async picker => {
        const deadline = Date.now() + 4000;
        while (!picker.panel.hidden && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
        assert(picker.panel.hidden, '彈窗未在 4 秒內完成收合');
    };
    const clickDate = (picker, date) => picker.panel.querySelector(`.date-picker__content:not(.date-picker__outgoing) [data-date="${date}"]`).click();
    const prepare = async (picker, value) => {
        picker.close(false);
        await settle();
        picker.input.value = value;
        picker.state.start = picker.state.end = picker.state.preview = null;
        picker.sync();
        picker.open();
        await settle();
    };
    document.querySelector('#runTests').addEventListener('click', async event => {
        event.target.disabled = true;
        const results = [];
        const check = async (name, run) => {
            try { await run(); results.push({name, passed:true}); }
            catch (error) { results.push({name, passed:false, error:error.message}); }
            document.querySelector('#testResults').textContent = JSON.stringify(results, null, 2);
        };
        // spectra-scenario: reservation-date-picker / Select a date
        await check('Select a date', async () => {
            await prepare(singlePicker, '2026-11-18');
            let count = 0;
            const changed = () => count++;
            singleInput.addEventListener('change', changed);
            clickDate(singlePicker, '2026-11-19');
            await waitClosed(singlePicker);
            singleInput.removeEventListener('change', changed);
            assert(singleInput.value === '2026-11-19' && singlePicker.trigger.value === '2026/11/19', '日期未回填');
            assert(count === 1 && singlePicker.panel.hidden, '事件或自動收合不符');
        });
        // spectra-scenario: reservation-date-picker / Reset or externally update the field
        // spectra-scenario: reservation-date-picker / Reset or externally update the field / External update and reset
        await check('External update and reset', async () => {
            singlePicker.close(false);
            await settle();
            let count = 0;
            const changed = () => count++;
            singleInput.addEventListener('change', changed);
            singleInput.value = '2026-12-25';
            singlePicker.sync();
            assert(singlePicker.trigger.value === '2026/12/25', '外部更新未顯示');
            document.querySelector('#singleForm').reset();
            await settle();
            singleInput.removeEventListener('change', changed);
            assert(singleInput.value === '2026-11-18' && singlePicker.trigger.value === '2026/11/18' && count === 0, '重設或事件數不符');
        });
        // spectra-scenario: reservation-date-picker / Navigate between calendar densities
        await check('Navigate between calendar densities', async () => {
            await prepare(singlePicker, '2026-05-18');
            const cells = () => singlePicker.panel.querySelector('.date-picker__content:not(.date-picker__outgoing) .date-picker__days').children.length;
            assert(cells() === 42, '2026-05 格數錯誤');
            singlePicker.panel.querySelector('[data-action="next"]').click();
            await settle();
            assert(cells() === 35 && singlePicker.state.month.getMonth() === 5, '2026-06 格數或月份錯誤');
        });
        // spectra-scenario: reservation-date-picker / Select a month from the overview
        // spectra-scenario: reservation-date-picker / Select a month from the overview / December overview selection
        await check('December overview selection', async () => {
            await prepare(singlePicker, '2026-11-18');
            singlePicker.title.click();
            await settle();
            assert(singlePicker.panel.querySelectorAll('[data-month]').length === 12, '月份總覽不足');
            singlePicker.panel.querySelector('[data-month="12"]').click();
            await settle();
            assert(singlePicker.state.view === 'days' && singlePicker.state.month.getMonth() === 11, '未返回十二月');
            assert(singlePicker.panel.querySelector('.date-picker__days').children.length === 35, '十二月日期格數錯誤');
        });
        // spectra-scenario: reservation-date-picker / Reject a fully booked fixture date
        await check('Reject a fully booked fixture date', async () => {
            await prepare(singlePicker, '2026-11-18');
            clickDate(singlePicker, '2026-11-20');
            assert(singleInput.value === '2026-11-18' && !singlePicker.tooltip.hidden, '禁用日改變日期或未顯示提示');
            assert(singlePicker.tooltip.textContent === reason('2026-11-20'), '未傳遞外部禁用原因');
        });
        // spectra-scenario: reservation-date-picker / Commit an available interval
        await check('Commit an available interval', async () => {
            await prepare(rangePicker, '2026-11-18');
            let detail;
            rangeInput.addEventListener('date-range-change', event => {detail = event.detail;}, {once:true});
            clickDate(rangePicker, '2026-11-21');
            assert(detail.start === '2026-11-21' && detail.end === null && detail.nights === 0, '起日事件錯誤');
            rangeInput.addEventListener('date-range-change', event => {detail = event.detail;}, {once:true});
            rangePicker.preview('2026-11-24');
            assert(rangePicker.panel.querySelectorAll('.is-preview').length === 4, '區間預覽未連續');
            clickDate(rangePicker, '2026-11-24');
            assert(rangeInput.value === '2026-11-21' && detail.start === '2026-11-21' && detail.end === '2026-11-24' && detail.nights === 3, '完整區間事件錯誤');
            assert(rangePicker.summary.textContent.includes('3'), '晚數未顯示');
            await settle();
        });
        // spectra-scenario: reservation-date-picker / Reject an unavailable interval
        // spectra-scenario: reservation-date-picker / Reject an unavailable interval / Blocked date inside an interval
        await check('Blocked date inside an interval', async () => {
            await prepare(rangePicker, '2026-11-18');
            clickDate(rangePicker, '2026-11-18');
            clickDate(rangePicker, '2026-11-21');
            assert(rangeInput.value === '2026-11-18' && rangePicker.state.end === null, '提交了含禁用日的區間');
            assert(!rangePicker.tooltip.hidden && rangePicker.tooltip.textContent.length > 0, '缺少拒絕原因');
        });
        // spectra-scenario: reservation-date-picker / Select with the keyboard
        await check('Select with the keyboard', async () => {
            await prepare(singlePicker, '2026-12-18');
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight',bubbles:true}));
            assert(document.activeElement.dataset.date === '2026-12-19', '方向鍵焦點錯誤');
            document.activeElement.click();
            await waitClosed(singlePicker);
            assert(singleInput.value === '2026-12-19' && document.activeElement === singlePicker.trigger, '鍵盤選取後未回填或焦點未返回');
            singlePicker.open();
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
            await waitClosed(singlePicker);
            assert(singlePicker.panel.hidden && document.activeElement === singlePicker.trigger, 'Escape 未關閉');
        });
        rangePicker.close(false);
        singlePicker.close(false);
        await settle();
        event.target.disabled = false;
        document.querySelector('#testResults').dataset.passed = String(results.every(item => item.passed));
    });
})();
