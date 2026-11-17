const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {}, Date };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../date-picker.js'), 'utf8'), context);
const prototype = context.window.ReservationDatePicker.prototype;

// spectra-scenario: reservation-date-picker / Reduce motion
test('減少動態效果時，縮放、震動及高度動畫均轉成 130ms 透明度', async () => {
    let received;
    const picker = {motion:{matches:true}, animations:[]};
    const element = {animate(frames, options) {
        received = {frames, options};
        return {finished:Promise.resolve(), cancel() {}};
    }};
    for (const frames of [
        [{transform:'scale(.94)', opacity:0}, {transform:'scale(1)', opacity:1}],
        [{transform:'translateX(-4.5px)'}, {transform:'translateX(0)'}],
        [{height:'230px'}, {height:'274px'}],
    ]) {
        prototype.animate.call(picker, element, frames, 280);
        assert.equal(received.options.duration, 130);
        assert.ok(received.frames.every(frame => Object.keys(frame).join() === 'opacity'));
    }
});

test('一般模式保留動畫方向、時長與緩動', () => {
    let received;
    const picker = {motion:{matches:false}, animations:[]};
    const element = {animate(frames, options) {
        received = {frames, options};
        return {finished:Promise.resolve(), cancel() {}};
    }};
    prototype.animate.call(picker, element, [{transform:'translateX(32px)',opacity:0},{transform:'none',opacity:1}],230);
    assert.equal(received.options.duration,230);
    assert.equal(received.frames[0].transform,'translateX(32px)');
    assert.equal(received.options.easing,'cubic-bezier(0.4, 0, 0.2, 1)');
});

// spectra-scenario: reservation-date-picker / Commit an available interval / Calendar-night boundaries
test('區間晚數以曆日計算，涵蓋閏日與跨年', () => {
    for (const [start,end,nights] of [
        ['2026-11-21','2026-11-24',3],
        ['2028-02-28','2028-03-01',2],
        ['2026-12-31','2027-01-01',1],
        ['2026-11-21','2026-11-21',0],
    ]) assert.equal(prototype.nights.call({state:{start,end}}),nights);
    assert.equal(prototype.nights.call({state:{start:'2026-11-21',end:null}}),0);
});

test('原生 min/max 及外部客滿判斷均限制選取', () => {
    const picker = {input:{min:'2026-11-17',max:'2026-12-31'}, options:{getUnavailableReason:value => value === '2026-11-20' ? '客滿' : ''}};
    assert.ok(prototype.unavailable.call(picker,'2026-11-16'));
    assert.equal(prototype.unavailable.call(picker,'2026-11-17'),'');
    assert.equal(prototype.unavailable.call(picker,'2026-11-20'),'客滿');
    assert.ok(prototype.unavailable.call(picker,'2027-01-01'));
});
