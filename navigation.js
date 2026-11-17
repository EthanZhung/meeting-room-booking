document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.site-header nav ul').forEach(menu => {
        const links = [...menu.querySelectorAll('a')];
        const current = links.find(link => link.getAttribute('aria-current') === 'page');
        if (!current) return;

        let highlighted = current;
        const moveTo = link => {
            highlighted = link;
            menu.style.setProperty('--nav-x', `${link.offsetLeft}px`);
            menu.style.setProperty('--nav-y', `${link.offsetTop}px`);
            menu.style.setProperty('--nav-width', `${link.offsetWidth}px`);
            menu.style.setProperty('--nav-height', `${link.offsetHeight}px`);
            links.forEach(item => item.toggleAttribute('data-highlighted', item === link));
        };

        moveTo(current);
        menu.classList.add('has-sliding-highlight');
        requestAnimationFrame(() => menu.classList.add('highlight-ready'));

        links.forEach(link => {
            link.addEventListener('pointerenter', event => {
                if (event.pointerType !== 'touch') moveTo(link);
            });
            link.addEventListener('focus', () => moveTo(link));
        });
        menu.addEventListener('pointerleave', () => moveTo(current));
        menu.addEventListener('focusout', () => {
            queueMicrotask(() => {
                if (!menu.contains(document.activeElement)) moveTo(current);
            });
        });

        if ('ResizeObserver' in window) {
            const observer = new ResizeObserver(() => moveTo(highlighted));
            observer.observe(menu);
            links.forEach(link => observer.observe(link));
        } else {
            window.addEventListener('resize', () => moveTo(highlighted));
        }
        document.fonts?.ready.then(() => moveTo(highlighted));
    });
});
