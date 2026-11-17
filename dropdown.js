document.addEventListener('DOMContentLoaded', () => {
    let openWidget = null;

    document.querySelectorAll('select:not([multiple])').forEach(select => {
        const wrapper = document.createElement('div');
        wrapper.className = 'reveal-select';
        select.before(wrapper);
        wrapper.append(select);

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'reveal-select__trigger';
        trigger.id = `${select.id}-trigger`;
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        const value = document.createElement('span');
        value.className = 'reveal-select__value';
        value.id = `${select.id}-value`;
        const arrow = document.createElement('span');
        arrow.className = 'reveal-select__arrow';
        arrow.setAttribute('aria-hidden', 'true');
        trigger.append(value, arrow);
        wrapper.append(trigger);

        const panel = document.createElement('div');
        panel.className = 'reveal-select__panel';
        panel.id = `${select.id}-listbox`;
        panel.setAttribute('role', 'listbox');
        panel.setAttribute('aria-hidden', 'true');
        const usePopover = typeof panel.showPopover === 'function';
        if (usePopover) panel.setAttribute('popover', 'manual');
        document.body.append(panel);
        trigger.setAttribute('aria-controls', panel.id);

        const labels = [...select.labels];
        labels.forEach((label, index) => {
            if (!label.id) label.id = `${select.id}-label-${index}`;
            label.addEventListener('click', event => {
                event.preventDefault();
                trigger.focus();
            });
        });
        if (labels.length) {
            const ids = labels.map(label => label.id).join(' ');
            trigger.setAttribute('aria-labelledby', `${ids} ${value.id}`);
            panel.setAttribute('aria-labelledby', ids);
        } else {
            trigger.setAttribute('aria-label', select.getAttribute('aria-label') || select.name || '選擇選項');
        }

        const widget = { select, trigger, panel, options: [], activeIndex: -1, open: false, close };
        let hideTimer;
        let search = '';
        let searchTimer;

        function position() {
            const rect = trigger.getBoundingClientRect();
            const gutter = 12;
            const width = Math.min(rect.width, window.innerWidth - gutter * 2);
            const below = window.innerHeight - rect.bottom - gutter - 6;
            const above = rect.top - gutter - 6;
            const upwards = below < 180 && above > below;
            const available = Math.max(44, upwards ? above : below);
            panel.style.width = `${width}px`;
            panel.style.maxHeight = `${Math.min(300, available)}px`;
            panel.style.left = `${Math.max(gutter, Math.min(rect.left, window.innerWidth - width - gutter))}px`;
            panel.style.top = upwards ? 'auto' : `${rect.bottom + 6}px`;
            panel.style.bottom = upwards ? `${window.innerHeight - rect.top + 6}px` : 'auto';
            panel.classList.toggle('opens-up', upwards);
        }

        function setActive(index, scroll = true) {
            widget.activeIndex = index;
            widget.options.forEach((option, i) => option.classList.toggle('is-active', i === index));
            const active = widget.options[index];
            if (active && widget.open) {
                trigger.setAttribute('aria-activedescendant', active.id);
                if (scroll) active.scrollIntoView({ block: 'nearest' });
            } else trigger.removeAttribute('aria-activedescendant');
        }

        function rebuild() {
            panel.replaceChildren();
            widget.options = [...select.options].map((option, index) => {
                const row = document.createElement('div');
                row.id = `${select.id}-option-${index}`;
                row.className = 'reveal-select__option';
                row.setAttribute('role', 'option');
                row.setAttribute('aria-disabled', String(option.disabled));
                row.style.setProperty('--i', index);
                row.textContent = option.textContent;
                row.addEventListener('pointerenter', () => {
                    if (!option.disabled) setActive(index, false);
                });
                row.addEventListener('pointerdown', event => {
                    if (event.pointerType === 'mouse') event.preventDefault();
                });
                row.addEventListener('click', () => choose(index));
                panel.append(row);
                return row;
            });
            sync();
        }

        function sync() {
            value.textContent = select.options[select.selectedIndex]?.textContent || '請選擇';
            trigger.disabled = select.disabled;
            ['aria-invalid', 'aria-describedby', 'aria-required'].forEach(name => {
                const attribute = select.getAttribute(name);
                if (attribute !== null) trigger.setAttribute(name, attribute);
                else trigger.removeAttribute(name);
            });
            if (select.required) trigger.setAttribute('aria-required', 'true');
            widget.options.forEach((row, index) => row.setAttribute('aria-selected', String(index === select.selectedIndex)));
            if (select.disabled && widget.open) close();
            if (!widget.open) setActive(select.selectedIndex, false);
        }

        function close() {
            if (!widget.open) return;
            widget.open = false;
            trigger.setAttribute('aria-expanded', 'false');
            trigger.removeAttribute('aria-activedescendant');
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            if (openWidget === widget) openWidget = null;
            hideTimer = window.setTimeout(() => {
                if (usePopover && panel.matches(':popover-open')) panel.hidePopover();
                panel.classList.remove('is-visible');
            }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200);
        }

        function open() {
            if (select.disabled || widget.open) return;
            openWidget?.close();
            clearTimeout(hideTimer);
            widget.open = true;
            openWidget = widget;
            sync();
            panel.classList.add('is-visible');
            if (usePopover && !panel.matches(':popover-open')) panel.showPopover();
            position();
            panel.setAttribute('aria-hidden', 'false');
            trigger.setAttribute('aria-expanded', 'true');
            setActive(select.selectedIndex, false);
            panel.getBoundingClientRect();
            requestAnimationFrame(() => {
                if (widget.open) {
                    panel.classList.add('is-open');
                    widget.options[widget.activeIndex]?.scrollIntoView({ block: 'nearest' });
                }
            });
        }

        function choose(index) {
            if (select.disabled || !select.options[index] || select.options[index].disabled) return;
            select.selectedIndex = index;
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
            sync();
            close();
            trigger.focus();
        }

        trigger.addEventListener('click', () => widget.open ? close() : open());
        trigger.addEventListener('keydown', event => {
            const enabled = [...select.options].map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const wasOpen = widget.open;
                open();
                let index;
                if (event.key === 'Home') index = enabled[0];
                else if (event.key === 'End') index = enabled.at(-1);
                else if (!wasOpen) index = enabled.includes(select.selectedIndex) ? select.selectedIndex : enabled[0];
                else {
                    const delta = event.key === 'ArrowDown' ? 1 : -1;
                    const next = Math.max(0, Math.min(enabled.length - 1, enabled.indexOf(widget.activeIndex) + delta));
                    index = enabled[next];
                }
                if (index !== undefined) setActive(index);
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (widget.open) choose(widget.activeIndex);
                else open();
            } else if (event.key === 'Escape') {
                if (widget.open) event.preventDefault();
                close();
            } else if (event.key === 'Tab') close();
            else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                clearTimeout(searchTimer);
                search += event.key.toLocaleLowerCase();
                searchTimer = window.setTimeout(() => { search = ''; }, 700);
                const match = enabled.find(index => select.options[index].textContent.trim().toLocaleLowerCase().startsWith(search));
                if (match !== undefined) {
                    event.preventDefault();
                    if (!widget.open) open();
                    setActive(match);
                }
            }
        });
        trigger.addEventListener('blur', event => {
            if (event.relatedTarget && !panel.contains(event.relatedTarget)) close();
        });
        select.addEventListener('change', sync);
        select.addEventListener('selectsync', sync);
        select.addEventListener('focus', () => trigger.focus());
        select.form?.addEventListener('reset', () => window.setTimeout(() => { close(); sync(); }, 0));
        new MutationObserver(records => {
            if (records.some(record => record.type !== 'attributes' || record.target !== select)) rebuild();
            else sync();
        }).observe(select, { attributes: true, childList: true, subtree: true, characterData: true });
        document.addEventListener('pointerdown', event => {
            if (widget.open && !wrapper.contains(event.target) && !panel.contains(event.target)) close();
        });
        window.addEventListener('resize', () => { if (widget.open) position(); });
        document.addEventListener('scroll', event => {
            if (widget.open && !panel.contains(event.target)) position();
        }, true);

        rebuild();
        select.classList.add('reveal-select__native');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
    });
});
