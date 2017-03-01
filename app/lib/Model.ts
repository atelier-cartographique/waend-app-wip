/*
 * app/lib/Model.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import * as _ from 'lodash';
import { EventEmitter } from 'events';
import { GeomOpt, Geometry } from './Geometry';
import * as debug from 'debug';
import { get as getBinder } from './Bind';
const logger = debug('waend:Model');

const binder = getBinder();

function pathKey(objOpt: Object, pathOpt: string, def: any): any {
    const path = pathOpt.split('.');
    let obj: any = objOpt;
    for (let i = 0, len = path.length; i < len; i++) {
        if (!obj || (typeof obj !== 'object')) {
            return def;
        }
        const p = path[i];
        obj = obj[p];
    }
    if (obj === undefined) {
        return def;
    }
    return obj;
}

export interface ModelProperties {
    [propName: string]: any;
}

export interface BaseModelData {
    properties: ModelProperties;
    geom?: GeomOpt;
    [propName: string]: any;
}

export interface ModelData extends BaseModelData {
    id: string,
}


export class Model extends EventEmitter {
    readonly id: string;
    protected data: ModelData;

    constructor(data: ModelData) {
        super();
        this.id = data.id;
        this.data = data;
    }

    getPath() {
        return binder.getComps(this.id);
    }

    has(prop: string) {
        return (prop in this.data.properties);
    }

    get(key: string, def: any): any {
        return pathKey(this.data.properties, key, def);
    }

    getData(): ModelProperties {
        return JSON.parse(JSON.stringify(this.data.properties));
    }

    set(key: string, val: any) {
        const keys = key.split('.');
        const props = this.data.properties;
        if (1 === keys.length) {
            props[key] = val;
        }
        else {
            const kl = keys.length;
            let currentDict = props;
            let k;
            for (let i = 0; i < kl; i++) {
                k = keys[i];
                if ((i + 1) === kl) {
                    currentDict[k] = val;
                }
                else {
                    if (!(k in currentDict)) {
                        currentDict[k] = {};
                    }
                    else if (!_.isObject(currentDict[k])) {
                        currentDict[k] = {};
                    }
                    currentDict = currentDict[k];
                }
            }
        }
        logger('set', this.id, key);
        this.emit('set', key, val);
        return binder.update(this);
    }

    setData(data: ModelProperties) {
        this.data.properties = data;
        this.emit('set:data', data);
        return binder.update(this);
    }

    toJSON() {
        return JSON.stringify(this.data);
    }

    cloneData(): ModelData {
        return JSON.parse(this.toJSON());
    }

    _updateData(data: ModelData, silent: boolean) {
        const props = this.data.properties;
        const newProps = data.properties;
        const changedProps: string[] = [];
        const changedAttrs: string[] = [];
        const changedKeys = _.difference(_.keys(props), _.keys(newProps)).concat(_.difference(_.keys(newProps), _.keys(props)));

        Object.keys(props).forEach((k) => {
            const v = props[k];
            if (!_.isEqual(v, newProps[k])) {
                changedProps.push(k);
            }
        });

        Object.keys(this.data).forEach((k) => {
            if ('properties' !== k) {
                const v = this.data[k];
                if (!_.isEqual(v, data[k])) {
                    changedAttrs.push(k);
                }
            }
        });


        this.data = data;
        if (!silent
            && ((changedAttrs.length > 0)
                || (changedProps.length > 0)
                || (changedKeys.length > 0))) {
            this.emit('set:data', data);

            changedProps.forEach((k) => {
                this.emit('set', k, data.properties[k]);
            }, this);
        }
    }

}


export default Model;

// models

export class User extends Model {
    get type() { return 'user'; }
}

export class Group extends Model {
    get type() { return 'group'; }
}

export class Layer extends Model {
    get type() { return 'layer'; }

    getGroup() {
        const path = this.getPath();
        return binder.getGroup(...path);
    }

    isVisible() {
        const resolver = (yes: () => void, no: () => void) => {
            this.getGroup()
                .then(group => {
                    const visibleList = group.get('params.visible', null);
                    if (null === visibleList) {
                        return yes();
                    }
                    if (_.indexOf(visibleList, this.id) < 0) {
                        return no();
                    }
                    yes();
                })
                .catch(no);
        };
        return (new Promise(resolver));
    }
}


export class Feature extends Model {
    get type() { return 'feature'; }

    getGeometry() {
        const geom = <GeomOpt>this.data.geom;
        return (new Geometry(geom));
    }

    getExtent() {
        const geom = <GeomOpt>this.data.geom;
        return (new Geometry(geom)).getExtent();
    }

    setGeometry(geom: GeomOpt) {
        if (geom instanceof Geometry) {
            this.data.geom = geom.toGeoJSON();
        }
        else {
            this.data.geom = geom;
        }
        this.emit('set', 'geom', this.getGeometry());
        return binder.update(this);
    }
}

// type ModelClass<T> = typeof (T extends Model);

// export function configure(configurator: <T>(a: T) => void) {
//     configurator<User>(User);
//     configurator<Group>(Group);
//     configurator<Layer>(Layer);
//     configurator<Feature>(Feature);
// }
