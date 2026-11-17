(() => {
    'use strict';

    const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const parse = value => new Date(`${value}T12:00:00`);
    const monthOf = date => new Date(date.getFullYear(), date.getMonth(), 1, 12);
    const addDays = (date, count) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count, 12);
    const format = value => value.replaceAll('-', '/');
    let nextId = 0;

    class ReservationDatePicker {
        constructor(input, options = {}) {
            if (!input || input.type !== 'date') throw new TypeError('Date Picker 需要原生日期欄位。');
            this.input = input;
            this.options = { mode: 'single', getUnavailableReason: () => '', ...options };
            if (!['single', 'range'].includes(this.options.mode)) throw new TypeError('不支援的日期選取模式。');
            this.state = { open: false, view: 'days', month: monthOf(input.value ? parse(input.value) : new Date()), focus: input.value || iso(new Date()), start: null, end: null, preview: null };
            this.motion = matchMedia('(prefers-reduced-motion: reduce)');
            this.sequence = 0;
            this.animations = [];
            this.id = `reservation-picker-${++nextId}`;
            this.build();
            this.bind();
            this.sync();
        }

        build() {
            const label = document.querySelector(`label[for="${this.input.id}"]`);
            if (label && !label.id) label.id = `${this.id}-label`;
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'date-picker';
            this.input.before(this.wrapper);
            this.wrapper.append(this.input);
            this.trigger = document.createElement('input');
            this.trigger.type = 'text';
            this.trigger.readOnly = true;
            this.trigger.id = `${this.id}-display`;
            this.trigger.className = 'date-picker__trigger';
            this.trigger.placeholder = 'YYYY/MM/DD';
            this.trigger.setAttribute('role', 'combobox');
            this.trigger.setAttribute('aria-haspopup', 'dialog');
            this.trigger.setAttribute('aria-controls', this.id);
            this.trigger.setAttribute('aria-expanded', 'false');
            this.trigger.setAttribute('aria-autocomplete', 'none');
            if (label) this.trigger.setAttribute('aria-labelledby', label.id);
            else this.trigger.setAttribute('aria-label', this.input.getAttribute('aria-label') || '選擇日期');
            this.wrapper.append(this.trigger);
            const icon = document.createElement('span');
            icon.className = 'date-picker__icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01"/></svg>';
            this.wrapper.append(icon);
            this.panel = document.createElement('div');
            this.panel.id = this.id;
            this.panel.className = 'date-picker__panel';
            this.panel.hidden = true;
            this.panel.setAttribute('role', 'dialog');
            this.panel.setAttribute('aria-label', '選擇預約日期');
            this.panel.setAttribute('popover', 'manual');
            this.panel.innerHTML = `<div class="date-picker__eyebrow">${this.options.mode === 'range' ? '選擇起訖日期' : '選擇預約日期'}</div><div class="date-picker__header"><button type="button" class="date-picker__nav" data-action="previous" aria-label="上一個月">‹</button><button type="button" class="date-picker__title" data-action="zoom" aria-expanded="false"></button><button type="button" class="date-picker__nav" data-action="next" aria-label="下一個月">›</button></div><div class="date-picker__viewport"></div><div class="date-picker__footer"><button type="button" data-action="today">今天</button><span class="date-picker__summary"></span><button type="button" data-action="close" aria-label="關閉日期選擇器">完成</button></div><div class="date-picker__tooltip" role="status" aria-live="polite" hidden></div><p class="date-picker__sr" aria-live="polite" aria-atomic="true"></p>`;
            document.body.append(this.panel);
            this.viewport = this.panel.querySelector('.date-picker__viewport');
            this.title = this.panel.querySelector('.date-picker__title');
            this.summary = this.panel.querySelector('.date-picker__summary');
            this.live = this.panel.querySelector('.date-picker__sr');
            this.tooltip = this.panel.querySelector('.date-picker__tooltip');
            this.input.classList.add('date-picker__native');
            this.originalTabIndex = this.input.getAttribute('tabindex');
            this.input.tabIndex = -1;
            this.input.setAttribute('aria-hidden', 'true');
        }

        bind() {
            this.trigger.addEventListener('click', event => this.state.open ? this.close() : this.open(event));
            this.trigger.addEventListener('keydown', event => {
                if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
                    event.preventDefault();
                    this.open();
                } else if (event.key === 'Escape') this.close();
            });
            this.input.addEventListener('focus', () => this.trigger.focus());
            this.input.addEventListener('click', event => {
                event.preventDefault();
                this.open();
            });
            this.input.addEventListener('change', () => this.sync());
            this.input.addEventListener('input', () => this.sync());
            this.input.form?.addEventListener('reset', () => setTimeout(() => {
                this.state.start = this.state.end = this.state.preview = null;
                this.close(false);
                this.sync();
            }, 0));
            this.observer = new MutationObserver(() => this.sync());
            this.observer.observe(this.input, { attributes: true, attributeFilter: ['min', 'max', 'disabled', 'aria-invalid', 'aria-describedby', 'required'] });
            this.panel.addEventListener('click', event => {
                const button = event.target.closest('button');
                if (!button) return;
                if (button.dataset.date) this.select(button.dataset.date, button);
                else if (button.dataset.month) {
                    this.state.month = new Date(this.state.month.getFullYear(), Number(button.dataset.month) - 1, 1, 12);
                    this.state.view = 'days';
                    this.render('zoom-in', true);
                } else {
                    const actions = {
                        previous: () => this.navigate(-1), next: () => this.navigate(1),
                        zoom: () => {
                            this.state.view = this.state.view === 'days' ? 'months' : 'days';
                            this.render(this.state.view === 'months' ? 'zoom-out' : 'zoom-in', true);
                        },
                        today: () => {
                            const today = iso(new Date());
                            this.state.focus = today;
                            this.state.month = monthOf(new Date());
                            this.state.view = 'days';
                            this.render('', true);
                            this.select(today, this.viewport.querySelector(`[data-date="${today}"]`));
                        },
                        close: () => this.close()
                    };
                    actions[button.dataset.action]?.();
                }
            });
            this.panel.addEventListener('keydown', event => this.onKeyDown(event));
            this.panel.addEventListener('focusout', () => setTimeout(() => {
                if (this.state.open && !this.panel.contains(document.activeElement) && document.activeElement !== this.trigger) this.close(false);
            }, 0));
            document.addEventListener('pointerdown', event => {
                if (this.state.open && !this.panel.contains(event.target) && !this.wrapper.contains(event.target)) this.close(false);
            });
            this.panel.addEventListener('pointermove', event => {
                if (this.options.mode !== 'range' || !this.state.start || this.state.end) return;
                const button = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-date]');
                if (button && this.panel.contains(button)) this.preview(button.dataset.date);
            });
            this.viewport.addEventListener('pointerdown', event => {
                if (event.pointerType === 'touch' && this.options.mode === 'range' && this.state.start && !this.state.end) {
                    this.dragging = true;
                    this.dragMoved = false;
                }
            });
            this.viewport.addEventListener('pointermove', event => {
                if (this.dragging) {
                    this.dragMoved = true;
                    event.preventDefault();
                }
            });
            this.viewport.addEventListener('pointerup', event => {
                if (!this.dragging) return;
                this.dragging = false;
                if (!this.dragMoved) return;
                const button = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-date]');
                if (button && this.panel.contains(button)) {
                    this.select(button.dataset.date, button);
                    this.ignoreClick = true;
                    setTimeout(() => { this.ignoreClick = false; }, 0);
                }
            });
            this.viewport.addEventListener('pointercancel', () => { this.dragging = false; });
            this.reposition = () => { if (this.state.open) this.position(); };
            window.addEventListener('resize', this.reposition);
            window.addEventListener('scroll', this.reposition, true);
            this.motion.addEventListener('change', () => {
                this.animations.forEach(animation => animation.cancel());
                this.animations = [];
                if (this.state.open) this.render();
            });
        }

        unavailable(value) {
            if (this.input.min && value < this.input.min) return '此日期早於可預約日期。';
            if (this.input.max && value > this.input.max) return '此日期超出可預約範圍。';
            return this.options.getUnavailableReason(value) || '';
        }

        sync() {
            const value = this.input.value;
            if (this.options.mode === 'range' && this.state.start && value !== this.state.start) {
                this.state.start = value || null;
                this.state.end = this.state.preview = null;
            }
            this.trigger.value = value ? format(value) : '';
            if (this.options.mode === 'range' && this.state.end && value === this.state.start) this.trigger.value += ` – ${format(this.state.end)}`;
            this.trigger.disabled = this.input.disabled;
            this.trigger.setAttribute('aria-required', String(this.input.required));
            for (const attribute of ['aria-invalid', 'aria-describedby']) {
                if (this.input.hasAttribute(attribute)) this.trigger.setAttribute(attribute, this.input.getAttribute(attribute));
                else this.trigger.removeAttribute(attribute);
            }
            if (this.input.disabled) this.close(false);
            if (value && !this.state.open) {
                this.state.focus = value;
                this.state.month = monthOf(parse(value));
            }
            if (this.state.open) this.render();
        }

        position() {
            const bounds = this.trigger.getBoundingClientRect();
            const width = Math.min(352, window.innerWidth - 24);
            const left = Math.min(Math.max(12, bounds.left), window.innerWidth - width - 12);
            this.panel.style.width = `${width}px`;
            this.panel.style.left = `${left}px`;
            const height = this.panel.offsetHeight;
            const below = bounds.bottom + 10;
            const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, bounds.top - height - 10);
            this.panel.style.top = `${top}px`;
            this.panel.style.maxHeight = `${window.innerHeight - 24}px`;
            this.panel.style.transformOrigin = `${this.origin * 100}% ${top < bounds.top ? 'bottom' : 'top'}`;
        }

        animate(element, frames, duration, easing = 'cubic-bezier(0.4, 0, 0.2, 1)') {
            if (this.motion.matches) {
                frames = frames.map(frame => ({ opacity: frame.opacity ?? 1 }));
                duration = 130;
                easing = 'ease';
            }
            const animation = element.animate(frames, { duration, easing, fill: 'both' });
            this.animations.push(animation);
            animation.finished.catch(() => {}).finally(() => {
                this.animations = this.animations.filter(item => item !== animation);
                animation.cancel();
            });
            return animation;
        }

        open(event) {
            if (this.input.disabled || this.state.open) return;
            clearTimeout(this.closeTimer);
            this.sequence++;
            this.state.open = true;
            this.state.view = 'days';
            const bounds = this.trigger.getBoundingClientRect();
            this.origin = event ? Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) : 0.5;
            if (this.input.value) {
                this.state.focus = this.input.value;
                this.state.month = monthOf(parse(this.input.value));
            }
            this.panel.hidden = false;
            this.panel.inert = false;
            this.trigger.setAttribute('aria-expanded', 'true');
            if (this.panel.showPopover && !this.panel.matches(':popover-open')) this.panel.showPopover();
            this.render();
            this.position();
            this.animate(this.panel, [{ transform: 'scale(0.94) translateY(-8px)', opacity: 0 }, { transform: 'scale(1) translateY(0)', opacity: 1 }], 180, 'cubic-bezier(0.16, 1, 0.3, 1)');
            this.focusDate();
        }

        close(restoreFocus = true) {
            if (!this.state.open) return;
            this.sequence++;
            const sequence = this.sequence;
            this.state.open = false;
            this.trigger.setAttribute('aria-expanded', 'false');
            this.panel.inert = true;
            clearTimeout(this.selectionTimer);
            clearTimeout(this.tooltipTimer);
            this.tooltip.hidden = true;
            if (restoreFocus) this.trigger.focus({ preventScroll: true });
            const animation = this.animate(this.panel, [{ transform: 'scale(1) translateY(0)', opacity: 1 }, { transform: 'scale(0.94) translateY(-8px)', opacity: 0 }], 180, 'cubic-bezier(0.16, 1, 0.3, 1)');
            animation.finished.catch(() => {}).then(() => {
                if (sequence !== this.sequence || this.state.open) return;
                if (this.panel.hidePopover && this.panel.matches(':popover-open')) this.panel.hidePopover();
                this.panel.hidden = true;
            });
        }

        navigate(direction) {
            this.state.month = new Date(this.state.month.getFullYear() + (this.state.view === 'months' ? direction : 0), this.state.month.getMonth() + (this.state.view === 'days' ? direction : 0), 1, 12);
            this.state.focus = iso(this.state.month);
            this.render(direction > 0 ? 'next' : 'previous');
        }

        render(transition = '', focus = false) {
            const activeDate = this.panel.contains(document.activeElement) ? document.activeElement.dataset.date : null;
            const activeMonth = this.panel.contains(document.activeElement) ? document.activeElement.dataset.month : null;
            this.tooltip.hidden = true;
            this.viewport.querySelectorAll('.date-picker__outgoing').forEach(node => node.remove());
            const old = this.viewport.firstElementChild;
            const oldHeight = this.viewport.getBoundingClientRect().height;
            const { month, view } = this.state;
            this.title.textContent = view === 'days' ? `${month.getFullYear()} 年 ${month.getMonth() + 1} 月` : `${month.getFullYear()} 年`;
            this.title.setAttribute('aria-expanded', String(view === 'months'));
            this.title.setAttribute('aria-label', view === 'days' ? `${this.title.textContent}，切換月份總覽` : `${this.title.textContent}，返回日期`);
            this.panel.querySelector('[data-action="previous"]').setAttribute('aria-label', view === 'days' ? '上一個月' : '上一年');
            this.panel.querySelector('[data-action="next"]').setAttribute('aria-label', view === 'days' ? '下一個月' : '下一年');
            const content = document.createElement('div');
            content.className = 'date-picker__content';
            if (view === 'months') {
                content.classList.add('date-picker__months');
                for (let index = 0; index < 12; index++) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.dataset.month = index + 1;
                    button.textContent = `${index + 1} 月`;
                    button.tabIndex = index === month.getMonth() ? 0 : -1;
                    button.setAttribute('aria-pressed', String(index === month.getMonth()));
                    content.append(button);
                }
            } else {
                const weekdays = document.createElement('div');
                weekdays.className = 'date-picker__weekdays';
                weekdays.setAttribute('aria-hidden', 'true');
                weekdays.innerHTML = ['日', '一', '二', '三', '四', '五', '六'].map(day => `<span>${day}</span>`).join('');
                content.append(weekdays);
                const grid = document.createElement('div');
                grid.className = 'date-picker__days';
                grid.setAttribute('role', 'group');
                grid.setAttribute('aria-label', this.title.textContent);
                const first = addDays(month, -month.getDay());
                const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
                const cells = Math.max(35, Math.ceil((month.getDay() + days) / 7) * 7);
                const selected = this.input.value;
                const today = iso(new Date());
                let focusFound = false;
                for (let index = 0; index < cells; index++) {
                    const date = addDays(first, index);
                    const value = iso(date);
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'date-picker__day';
                    button.dataset.date = value;
                    button.innerHTML = `<span>${date.getDate()}</span>`;
                    button.tabIndex = value === this.state.focus ? 0 : -1;
                    focusFound ||= button.tabIndex === 0;
                    button.classList.toggle('is-outside', date.getMonth() !== month.getMonth());
                    button.classList.toggle('is-selected', value === selected || value === this.state.end);
                    button.setAttribute('aria-pressed', String(value === selected || value === this.state.end));
                    const reason = this.unavailable(value);
                    if (reason) button.setAttribute('aria-disabled', 'true');
                    if (value === today) button.setAttribute('aria-current', 'date');
                    button.setAttribute('aria-label', `${format(value)}，星期${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}${reason ? `，${reason}` : ''}`);
                    grid.append(button);
                }
                if (!focusFound) grid.querySelector(`[data-date="${selected}"]`)?.setAttribute('tabindex', '0');
                if (!grid.querySelector('[tabindex="0"]')) grid.querySelector(`[data-date="${iso(month)}"]`).tabIndex = 0;
                content.append(grid);
            }
            if (old && transition) {
                old.classList.add('date-picker__outgoing');
                old.inert = true;
                old.setAttribute('aria-hidden', 'true');
            } else old?.remove();
            this.viewport.append(content);
            this.paintRange();
            const newHeight = content.getBoundingClientRect().height;
            this.viewport.style.height = `${newHeight}px`;
            if (old && transition) {
                const forward = transition === 'next' ? 1 : -1;
                const zoom = transition.startsWith('zoom');
                const incoming = zoom ? `scale(${transition === 'zoom-out' ? 1.09 : 0.91})` : `translateX(${forward * 32}px)`;
                const outgoing = zoom ? `scale(${transition === 'zoom-out' ? 0.91 : 1.09})` : `translateX(${-forward * 32}px)`;
                this.animate(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: outgoing }], 230).finished.catch(() => {}).then(() => old.remove());
                this.animate(content, [{ opacity: 0, transform: incoming }, { opacity: 1, transform: 'none' }], 230);
                if (!this.motion.matches && oldHeight !== newHeight) this.animate(this.viewport, [{ height: `${oldHeight}px` }, { height: `${newHeight}px` }], 230);
            }
            this.live.textContent = this.title.textContent;
            if (this.state.open) this.position();
            if (focus) {
                if (view === 'months') content.querySelector('[tabindex="0"]').focus({ preventScroll: true });
                else this.focusDate();
            } else if (activeDate || activeMonth) {
                const target = activeDate ? content.querySelector(`[data-date="${activeDate}"]`) : content.querySelector(`[data-month="${activeMonth}"]`);
                target?.focus({ preventScroll: true });
            }
        }

        focusDate() {
            this.viewport.querySelector('.date-picker__content:not(.date-picker__outgoing) [tabindex="0"]')?.focus({ preventScroll: true });
        }

        select(value, button) {
            if (this.ignoreClick) return;
            clearTimeout(this.selectionTimer);
            const reason = this.unavailable(value);
            if (reason) return this.invalid(button, reason);
            if (this.options.mode === 'range') {
                if (!this.state.start || this.state.end) {
                    this.state.start = value;
                    this.state.end = null;
                    this.state.preview = value;
                } else {
                    const [start, end] = [this.state.start, value].sort();
                    for (let date = parse(start); iso(date) <= end; date = addDays(date, 1)) {
                        if (this.unavailable(iso(date))) return this.invalid(button, '選取區間包含不可預約的日期。');
                    }
                    this.state.start = start;
                    this.state.end = end;
                    this.state.preview = null;
                }
            }
            this.state.focus = value;
            this.input.value = this.options.mode === 'range' ? this.state.start : value;
            this.input.dispatchEvent(new Event('input', { bubbles: true }));
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            this.sync();
            const selected = this.viewport.querySelector(`.date-picker__content:not(.date-picker__outgoing) [data-date="${value}"]`);
            selected?.focus({ preventScroll: true });
            if (selected) {
                this.animate(selected.querySelector('span'), [{ transform: 'scale(0.72)', opacity: 0.6 }, { transform: 'scale(1.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], 200, 'cubic-bezier(0.22, 1.65, 0.36, 1)');
            }
            if (this.options.mode === 'range') {
                const nights = this.nights();
                this.input.dispatchEvent(new CustomEvent('date-range-change', { bubbles: true, detail: { start: this.state.start, end: this.state.end, nights } }));
            }
            if (this.options.mode === 'single' || this.state.end) this.selectionTimer = setTimeout(() => this.close(), this.motion.matches ? 130 : 200);
        }

        nights() {
            if (!this.state.start || !this.state.end) return 0;
            const parts = value => value.split('-').map(Number);
            const [sy, sm, sd] = parts(this.state.start);
            const [ey, em, ed] = parts(this.state.end);
            return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000);
        }

        preview(value) {
            if (value === this.state.preview) return;
            this.state.preview = value;
            this.paintRange();
        }

        paintRange() {
            if (this.options.mode !== 'range') return;
            const last = this.state.end || this.state.preview;
            const [start, end] = [this.state.start, last].sort();
            this.viewport.querySelectorAll('.date-picker__content:not(.date-picker__outgoing) [data-date]').forEach(button => {
                const date = button.dataset.date;
                const inside = Boolean(start && end && date >= start && date <= end);
                button.classList.toggle('is-range', inside);
                button.classList.toggle('is-preview', inside && !this.state.end);
                button.classList.toggle('is-range-start', inside && date === start);
                button.classList.toggle('is-range-end', inside && date === end);
            });
            this.summary.textContent = this.state.end ? `共 ${this.nights()} 晚` : this.state.start ? '請選擇結束日期' : '';
        }

        invalid(button, reason) {
            if (!button) return;
            clearTimeout(this.tooltipTimer);
            button.getAnimations().forEach(animation => animation.cancel());
            this.animate(button, [0, -4.5, 4.5, -3, 3, -1.5, 1.5, 0].map(x => ({ transform: `translateX(${x}px)`, opacity: 1 })), 280, 'ease-in-out');
            this.tooltip.textContent = reason;
            this.tooltip.hidden = false;
            const bounds = button.getBoundingClientRect();
            const panel = this.panel.getBoundingClientRect();
            this.tooltip.style.left = `${Math.max(10, Math.min(bounds.left - panel.left + bounds.width / 2 - 100, panel.width - 210))}px`;
            this.tooltip.style.top = `${Math.max(4, bounds.top - panel.top - 42 + this.panel.scrollTop)}px`;
            this.animate(this.tooltip, [{ opacity: 0 }, { opacity: 1 }], 130);
            this.tooltipTimer = setTimeout(() => { this.tooltip.hidden = true; }, 2600);
        }

        onKeyDown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                this.close();
                return;
            }
            if (event.key === 'Tab') {
                const controls = [...this.panel.querySelectorAll('button:not([tabindex="-1"])')].filter(control => !control.closest('.date-picker__outgoing'));
                if (event.shiftKey && event.target === controls[0]) {
                    event.preventDefault();
                    this.close();
                } else if (!event.shiftKey && event.target === controls.at(-1)) {
                    event.preventDefault();
                    const candidates = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].filter(control => control.tabIndex >= 0 && !control.disabled && !this.panel.contains(control) && control.getClientRects().length);
                    const next = candidates[candidates.indexOf(this.trigger) + 1] || this.trigger;
                    this.close(false);
                    next.focus();
                }
                return;
            }
            const button = event.target.closest('button');
            if (!button) return;
            if (button.dataset.month) {
                const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
                if (event.key in offsets) {
                    event.preventDefault();
                    const index = (Number(button.dataset.month) - 1 + offsets[event.key] + 12) % 12;
                    const content = this.viewport.querySelector('.date-picker__content:not(.date-picker__outgoing)');
                    content.querySelectorAll('[data-month]').forEach(item => { item.tabIndex = -1; });
                    const target = content.querySelector(`[data-month="${index + 1}"]`);
                    target.tabIndex = 0;
                    target.focus({ preventScroll: true });
                }
                return;
            }
            if (!button.dataset.date) return;
            const date = parse(button.dataset.date);
            let target;
            const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6 - date.getDay() };
            if (event.key in offsets) target = addDays(date, offsets[event.key]);
            else if (event.key === 'PageUp' || event.key === 'PageDown') {
                const delta = event.key === 'PageDown' ? 1 : -1;
                const month = new Date(date.getFullYear() + (event.shiftKey ? delta : 0), date.getMonth() + (event.shiftKey ? 0 : delta), 1, 12);
                target = new Date(month.getFullYear(), month.getMonth(), Math.min(date.getDate(), new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()), 12);
            }
            if (!target) return;
            event.preventDefault();
            const before = this.state.month.getTime();
            this.state.focus = iso(target);
            this.state.month = monthOf(target);
            const after = this.state.month.getTime();
            this.render(after === before ? '' : after > before ? 'next' : 'previous', true);
            if (this.state.start && !this.state.end) this.preview(this.state.focus);
        }
    }

    window.ReservationDatePicker = ReservationDatePicker;
})();
