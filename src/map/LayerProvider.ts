import { EventEmitter } from 'events';
import semaphore from '../lib/Semaphore';
import Source from './Source';


class LayerProvider extends EventEmitter {
    private sources: Source[];

    constructor() {
        super();
        this.sources = [];

        semaphore.observe<Source[]>('source:change',
            this.update.bind(this));
    }

    clearSources() {
        this.sources.forEach((source) => {
            semaphore.signal('layer:layer:remove', source);
        });
        this.sources = [];
    }

    addSource(source: Source) {
        this.sources.push(source);
        semaphore.signal('layer:layer:add', source);
    }

    update(sources: Source[]) {
        semaphore.signal('layer:update:start', this);
        this.clearSources();
        sources.forEach((source) => this.addSource(source));
        semaphore.signal('layer:update:complete', this);
    }


};


let provider: LayerProvider;

export default function (): LayerProvider {
    if (!provider) {
        provider = new LayerProvider();
    }
    return provider;
};

