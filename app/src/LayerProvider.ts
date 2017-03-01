import _ from 'lodash';
import EventEmitter from 'events';
import Geometry from '../lib/Geometry';
import semaphore from '../lib/Semaphore';
import waendLayerProgram from './Program';



class LayerProvider extends EventEmitter {

    constructor() {
        super();
        this.layers = [];
        semaphore.on('source:change', this.update.bind(this));
    }

    clearLayers() {
        _.each(this.layers, (layer) => {
            semaphore.signal('layer:layer:remove', layer);
        });
        this.layers = [];
    }

    addLayer(layerSource) {
        const programSrc = layerSource.layer.get('program');
        let program;
        if (programSrc) {
            program = new Function('ctx', programSrc);
        }
        else {
            program = waendLayerProgram;
        }
        layerSource.getProgram = () => program;
        this.layers.push(layerSource);
        semaphore.signal('layer:layer:add', layerSource);
    }

    update(sources) {
        semaphore.signal('layer:update:start', this);
        this.clearLayers();
        _.each(sources, (source) => {
            this.addLayer(source);
        });
        semaphore.signal('layer:update:complete', this);
    }


};


export default LayerProvider;
