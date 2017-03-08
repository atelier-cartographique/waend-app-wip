


export default class Dock {
    constructor(options) {
        this.container = options.container;
    }

    detachPage(pageWrapper) {
        removeElement(pageWrapper);
    }

    addPage(page) {
        const wrapper = document.createElement('div');
        const buttons = document.createElement('div');
        const closeBtn = document.createElement('div');
        const collapseBtn = document.createElement('div');

        closeBtn.innerHTML = 'close';
        collapseBtn.innerHTML = 'collapse';
        addClass(wrapper, 'wc-dock-page');
        addClass(buttons, 'wc-dock-buttons');
        addClass(collapseBtn, 'wc-collapse icon-collapse');
        addClass(closeBtn, 'wc-close icon-close');


        const detacher = function () {
            this.detachPage(wrapper);
        };

        const collapser = () => {
            if (hasClass(page, 'wc-collapsed')) {
                collapseBtn.innerHTML = 'collapse';
                collapseBtn.className = 'wc-collapse icon-collapse';
            }
            else {
                collapseBtn.innerHTML = 'expand';
                collapseBtn.className = 'wc-expand icon-expand';

            }
            toggleClass(page, 'wc-collapsed');
        };

        closeBtn.addEventListener('click', _.bind(detacher, this), false);
        collapseBtn.addEventListener('click', collapser, false);

        buttons.appendChild(collapseBtn);
        buttons.appendChild(closeBtn);
        wrapper.appendChild(buttons);
        wrapper.appendChild(page);
        this.container.appendChild(wrapper);
    }
}