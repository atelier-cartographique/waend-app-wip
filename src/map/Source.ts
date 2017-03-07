import * as _ from 'lodash';
import { get as getBinder } from '../lib/Bind';
import { Layer, Feature, ModelData } from '../lib/Model';
import BaseSource from '../lib/BaseSource';
import * as debug from 'debug';
const logger = debug('waend:Source');


const binder = getBinder();



class Source extends BaseSource<Feature> {
    readonly id: string;
    readonly layer: Layer;
    private uid: string;
    private gid: string;

    constructor(uid: string, gid: string, layer: Layer) {
        super();
        this.uid = uid;
        this.gid = gid;
        this.id = layer.id;
        this.layer = layer;

        // listen to the layer to update features if some are created
        layer.on('change', () => this.update());
        layer.on('set', (key: string) => {
            const prefix = _.first(key.split('.'));
            if (('style' === prefix) || ('params' === prefix)) {
                this.emit('update');
            }
        });
    }


    update() {
        const updateWithFeatures: (a: Feature[]) => void =
            (features) => {
                this.clear();
                const emitUpdate =
                    (f: Feature) => {
                        return (() => {
                            this.emit('update:feature', f);
                        });
                    };

                for (const feature of features) {
                    this.addFeature(feature, true);
                    feature.on('set', emitUpdate(feature));
                    feature.on('set:data', emitUpdate(feature));
                }

                this.buildTree();
                this.emit('update');
            };

        binder.getFeatures(this.uid, this.gid, this.id)
            .then(updateWithFeatures)
            .catch(err => {
                logger('Source.update', err);
            });
    }

    toJSON(features = this.getFeatures()) {
        const a: ModelData[] = new Array(features.length);
        const layerData = this.layer.getData();
        const layerStyle = layerData.style || {};
        const layerParams = layerData.params || {};

        for (let i = 0; i < features.length; i++) {
            const f = features[i].cloneData();
            const props = f.properties;
            if ('style' in props) {
                _.defaults(props.style, layerStyle);
            }
            else {
                props.style = layerStyle;
            }
            if ('params' in props) {
                _.defaults(props.params, layerParams);
            }
            else {
                props.params = layerParams;
            }
            a[i] = f;
        }
        return a;
    }

}


//
// function str2ab(str) {
//   var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
//   var bufView = new Uint16Array(buf);
//   for (var i=0, strLen=str.length; i < strLen; i++) {
//     bufView[i] = str.charCodeAt(i);
//   }
//   return buf;
// }



export default Source;
