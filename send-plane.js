document.addEventListener('DOMContentLoaded', () => {
    const definitions = [
        { selector: '#reservationForm button[type="submit"]', label: '確認預約', announcement: '預約已送出。' },
        { selector: '#cancelForm button[type="submit"]', label: '查詢預約', announcement: '查詢已完成。' },
    ];

    definitions.forEach(definition => {
        const button = document.querySelector(definition.selector);
        const sourceLabel = button?.querySelector('.button__label');
        if (!sourceLabel) return;

        const plane = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        plane.setAttribute('viewBox', '0 0 24 24');
        plane.setAttribute('fill', 'none');
        plane.setAttribute('stroke', 'currentColor');
        plane.setAttribute('stroke-width', '1.7');
        plane.setAttribute('stroke-linecap', 'round');
        plane.setAttribute('stroke-linejoin', 'round');
        plane.setAttribute('aria-hidden', 'true');
        plane.classList.add('send-plane__icon');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M22 2 9 15M22 2l-8 20-5-7-7-5 20-8Z');
        plane.append(path);

        const visualLabel = document.createElement('span');
        visualLabel.className = 'send-plane__text';
        visualLabel.setAttribute('aria-hidden', 'true');
        visualLabel.textContent = sourceLabel.textContent;
        const status = document.createElement('span');
        status.className = 'visually-hidden';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        button.after(status);
        button.prepend(plane);
        sourceLabel.after(visualLabel);
        button.classList.add('send-plane');

        const state = { phase: 'idle', result: null, timer: null };
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
        const setPhase = phase => {
            state.phase = phase;
            button.dataset.planePhase = phase;
        };
        const schedule = (callback, delay) => {
            clearTimeout(state.timer);
            state.timer = window.setTimeout(callback, delay);
        };
        const idle = () => {
            setPhase('idle');
            state.result = null;
            visualLabel.textContent = sourceLabel.textContent || definition.label;
            button.removeAttribute('aria-label');
            status.textContent = '';
        };
        const returnPlane = () => {
            visualLabel.textContent = button.disabled ? sourceLabel.textContent : definition.label;
            button.removeAttribute('aria-label');
            setPhase('returning');
            schedule(idle, reducedMotion.matches ? 0 : 400);
        };
        const showSuccess = () => {
            visualLabel.textContent = '已送出';
            button.setAttribute('aria-label', '已送出');
            status.textContent = definition.announcement;
            setPhase('success');
            schedule(returnPlane, 1000);
        };
        const finishFlight = () => {
            if (state.result === 'success') showSuccess();
            else {
                visualLabel.textContent = sourceLabel.textContent;
                setPhase('pending');
            }
        };

        button.addEventListener('plane:start', () => {
            if (state.phase === 'flying' || state.phase === 'pending') return;
            clearTimeout(state.timer);
            button.removeAttribute('aria-label');
            status.textContent = '';
            visualLabel.textContent = definition.label;
            state.result = null;
            setPhase('flying');
            schedule(finishFlight, reducedMotion.matches ? 0 : 650);
        });
        button.addEventListener('plane:success', () => {
            if (state.phase !== 'flying' && state.phase !== 'pending') return;
            state.result = 'success';
            if (state.phase === 'pending') showSuccess();
        });
        button.addEventListener('plane:error', () => {
            if (state.phase === 'idle') return;
            state.result = 'error';
            clearTimeout(state.timer);
            setPhase('error');
            visualLabel.textContent = sourceLabel.textContent || definition.label;
            button.removeAttribute('aria-label');
            schedule(idle, 0);
        });
        new MutationObserver(() => {
            if (state.phase === 'idle' || state.phase === 'pending' || state.phase === 'error') {
                visualLabel.textContent = sourceLabel.textContent;
            }
        }).observe(sourceLabel, { childList: true, subtree: true, characterData: true });
        idle();
    });
});
