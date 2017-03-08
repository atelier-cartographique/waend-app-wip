

export default class Loader {
    constructor(text) {
        this.text = text || 'loading';
        this.init();
    }

    init() {
        const element = document.createElement('div');
        const textElement = document.createElement('div');
        const itemsElement = document.createElement('div');
        textElement.innerHTML = this.text;
        this.items = [];
        for (let i = 0; i < 100; i++) {
            const item = document.createElement('div');
            addClass(item, 'wc-loader-item');
            itemsElement.appendChild(item);
            this.items.push(item);
        }
        element.appendChild(textElement);
        element.appendChild(itemsElement);
        addClass(element, 'wc-loader');
        addClass(textElement, 'wc-loader-text');
        addClass(itemsElement, 'wc-loader-items');
        this.element = element;
        return this;
    }

    start() {
        const self = this;
        self.running = true;
        let start = null;
        let idx = 0;
        const r = 100;
        let dir = true;
        function step(ts) {
            if (self.running) {
                const offset = start ? ts - start : r;
                if (offset < r) {
                    return window.requestAnimationFrame(step);
                }
                start = ts;
                if (dir) {
                    for (var i = 0; i < idx; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'grey';
                    }
                    for (var i = idx + 1; i < self.items.length; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'transparent';
                    }
                    self.items[idx].style.backgroundColor = 'black';
                    idx += 1;
                    if (idx === self.items.length) {
                        dir = false;
                    }
                }
                else {
                    idx -= 1;
                    for (var i = 0; i < idx; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'transparent';
                    }
                    for (var i = idx + 1; i < self.items.length; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'grey';
                    }
                    self.items[idx].style.backgroundColor = 'black';
                    if (0 === idx) {
                        dir = true;
                    }
                }
                window.requestAnimationFrame(step);
            }
        }
        window.requestAnimationFrame(step);
    }

    stop() {
        this.running = false;
    }
}