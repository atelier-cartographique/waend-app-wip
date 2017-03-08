
export default class Display {
    constructor(container) {
        const id = _.uniqueId('wc-display-');
        this._root = container;
        this.node = document.createElement('div');
        this.node.setAttribute('id', id);
        this.node.setAttribute('class', 'wc-display');
        this._root.appendChild(this.node);
    }

    setFinalizer(cb, ctx) {
        this.finalizer = {
            callback: cb,
            context: ctx
        };
        return this;
    }

    end() {
        if (this._ended) {
            throw (new Error('Display Already Ended, check your event handlers :)'));
        }

        const container = this._root;
        const el = this.node;
        removeElement(el);
        this._ended = true;
        if (this.finalizer) {
            this.finalizer.callback.call(this.finalizer.context);
        }
    }
}