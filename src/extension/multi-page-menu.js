const pageMap = {};

const nMultiPageMenu = document.querySelector('#multi-page-menu');

let nPageActive = nMultiPageMenu.querySelector('.page[active]');

let animating = false;

nPageActive.removeAttribute('active');
nPageActive.dataset.state = 'active';

for (const link of nMultiPageMenu.querySelectorAll('[data-link]')) {
    link.addEventListener('click', transitionTo);
}

function transitionTo(event) {
    if (animating) return;

    animating = true;

    const selector = event.currentTarget.dataset.link;
    const nPage = pageMap[selector] || (pageMap[selector] = nMultiPageMenu.querySelector(`[data-id="${selector}"]`));

    const multiPageMenuHeight = nMultiPageMenu.offsetHeight;
    const pageActiveHeight = nPageActive.offsetHeight;
    const extraPageHeight = multiPageMenuHeight - pageActiveHeight;

    nPageActive.addEventListener(
        'animationend',
        (event) => {
            event.currentTarget.style.display = 'none';
            animating = false;
        },
        { once: true }
    );

    if (!nPage.dataset.state || nPage.dataset.state === 'cold') {
        nPageActive.dataset.state = 'warm';
        nPageActive.style.animation = 'slide-out-left 0.5s ease both';
        nPage.style.animation = `slide-in-right 0.5s ease both`;
    } else if (nPage.dataset.state === 'warm') {
        nPageActive.dataset.state = 'cold';
        nPageActive.style.animation = 'slide-out-right 0.5s ease both';
        nPage.style.animation = `slide-in-left 0.5s ease both`;
    }

    nPage.dataset.state = 'active';
    nPage.style.display = '';

    nMultiPageMenu.animate([{ height: `${pageActiveHeight + extraPageHeight}px` }, { height: `${nPage.offsetHeight + extraPageHeight}px` }], {
        duration: 400,
        fill: 'both',
    });

    nPageActive = nPage;

    nMultiPageMenu.dispatchEvent(
        new CustomEvent('pageChange', {
            detail: {
                pageId: selector,
            },
        })
    );
}
