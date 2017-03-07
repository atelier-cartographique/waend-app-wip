import * as _ from 'lodash';
import * as rbush from 'rbush';
import { EventEmitter } from 'events';
import { Extent } from './Geometry';
import { GeoModel } from './Model';

interface Index {
    [propName: string]: number;
}

interface RBushItem extends rbush.BBox {
    id: string;
}

export default class BaseSource<T extends GeoModel> extends EventEmitter {
    private tree: rbush.RBush<RBushItem>;
    private index: Index;
    private features: Array<T>

    constructor() {
        super();
        this.tree = rbush<RBushItem>();
        this.index = {};
        this.features = [];
    }

    clear() {
        this.index = {};
        this.features = [];
        this.tree.clear();
    }

    addFeature(f: T, skipSpatialIndex = false) {
        this.features.push(f);
        this.index[f.id] = this.features.length - 1;
        if (!skipSpatialIndex) {
            const geom = f.getGeometry();
            const extent = _.assign({ id: f.id }, geom.getExtent().getDictionary());
            this.tree.insert(extent);
        }
        this.emit('add', f);
    }

    removeFeature(id: string) {
        this.features.splice(this.index[id], 1);
        delete this.index[id];
        this.buildTree();
    }

    buildTree() {
        const features = this.features;
        const flen = features.length;
        const items: RBushItem[] = [];
        this.tree.clear();
        for (let i = 0; i < flen; i++) {
            const feature = features[i];
            items.push({
                id: feature.id,
                ...(feature.getExtent().getDictionary())
            });
        }
        this.tree.load(items);
    }

    getLength() {
        return this.features.length;
    }

    getFeature(id: string) {
        return this.features[this.index[id]];
    }

    getFeatures(opt_extent?: Extent | number[] | rbush.BBox) {
        const features = [];
        if (opt_extent) {
            let extent: rbush.BBox;
            if (opt_extent instanceof Extent) {
                extent = opt_extent.getDictionary();
            }
            else if (_.isArray(opt_extent)) { // we assume [minx, miny, maxx, maxy]
                extent = (new Extent(opt_extent)).getDictionary();
            }
            else { // proper rbush dictionary?
                extent = opt_extent;
            }

            const items = this.tree.search(extent)
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const featureIndex = this.index[item.id];
                features.push(this.features[featureIndex]);
            }
        }
        else {
            return this.features;
        }
        return features;
    }
}




