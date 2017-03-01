import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as EventEmitter from 'events';
import * as debug from 'debug';
import Transport from './Transport';
import config from '../config';
import { subscribe } from './Sync';
import semaphore from './Semaphore';
import {
    Model,
    BaseModelData,
    ModelData,
    User,
    Group,
    Layer,
    Feature
} from './Model';
const logger = debug('waend:Bind');


const API_URL = config.public.apiUrl;



interface IRecord {
    readonly model: Model;
    readonly comps: string[];
    readonly parent: string;
}

interface IDBStore {
    [propName: string]: IRecord;
}

interface IParser<T> {
    (response: any): T;
}


const db_store: IDBStore = {};

class DB extends EventEmitter {
    private transport: Transport;

    constructor(t: Transport) {
        super();
        this.transport = t;
    }

    get _db() { return db_store; }

    makePath(comps: string[]) {
        const cl = comps.length;
        if (1 === cl) {
            return `/user/${comps[0]}`;
        }
        else if (2 === cl) {
            return `/user/${comps[0]}/group/${comps[1]}`;
        }
        else if (3 === cl) {
            return `/user/${comps[0]}/group/${comps[1]}/layer/${comps[2]}`;
        }
        else if (4 === cl) {
            return `/user/${comps[0]}/group/${comps[1]}/layer/${comps[2]}/feature/${comps[3]}`;
        }
        throw (new Error('wrong number of comps'));
    }

    getParent(comps: string[]) {
        if (comps.length > 1) {
            return comps[comps.length - 2];
        }
        return null;
    }

    record(comps: string[], model: Model): IRecord | null {
        const id = model.id;
        const parent = this.getParent(comps);
        if (parent) {
            let rec;
            if (id in this._db) {
                const oldRec = this._db[id];
                oldRec.model._updateData(model.cloneData(), false);
                rec = {
                    model: oldRec.model,
                    comps: oldRec.comps,
                    parent: parent,
                }
            }
            else {
                rec = {
                    model: model,
                    comps: comps,
                    parent: parent,
                };
            }
            this._db[id] = rec;
            return rec;
        }
        return null;
    }

    update(model: Model) {
        const self = this;
        const db = this._db;
        const record = db[model.id];
        const path = this.makePath(record.comps);

        const resolver: (a: (b: Model) => void, b: (c: Error) => void) => void =
            (resolve, reject) => {
                self.transport
                    .put(API_URL + path, { 'body': model })
                    .then(() => {
                        db[model.id] = {
                            model: model,
                            comps: record.comps,
                            parent: record.parent,
                        };
                        resolve(model);
                    })
                    .catch(reject);
            };
        return (new Promise(resolver));
    }

    has(id: string) {
        return (id in this._db);
    }

    get(id: string) {
        return this._db[id].model;
    }

    del(id: string) {
        delete this._db[id];
    }

    getComps(id: string) {
        return _.clone(this._db[id].comps);
    }

    lookupKey(prefix: string) {
        const pat = new RegExp(`^${prefix}.*`);
        const keys = Object.keys(this._db);
        return keys.reduce<Array<Model>>((acc, key) => {
            if (key.match(pat)) {
                return acc.concat([this.get(key)]);
            }
            return acc;
        }, []);
    }

    lookup(predicate: (a: IRecord, b: string) => boolean) {
        const filtered = _.filter(this._db, predicate);
        const result = _.map(filtered, (rec) => rec['model']);
        return result;
    }
}


function objectifyResponse(response: any) {
    if ('string' === typeof response) {
        try {
            return JSON.parse(response);
        }
        catch (err) {
            console.error(err);
            throw (err);
        }
    }
    return response;
}

class Bind extends EventEmitter {
    private transport: Transport;
    private db: DB;
    private featurePages: any;
    private _groupCache: any;

    constructor() {
        super();
        this.transport = new Transport();
        this.db = new DB(this.transport);
        this.featurePages = {};
        this._groupCache = {};

        semaphore.on('sync', (chan, cmd, data: ModelData) => {
            if ('update' === cmd) {
                if (this.db.has(data.id)) {
                    const model = this.db.get(data.id);
                    model._updateData(data, false);
                }
            }
            else if ('create' === cmd) {
                var ctx = chan.type;
                if ('layer' === ctx) {
                    if (!this.db.has(data.id)) {
                        var layerId = chan.id;
                        const feature = new Feature(data);
                        const comps = this.getComps(layerId);
                        comps.push(<string>feature.id);
                        this.db.record(comps, feature);
                        this.changeParent(layerId);
                    }
                }
            }
            else if ('delete' === cmd) {
                var ctx = chan.type;
                if ('layer' === ctx) {
                    const fid = data.id;
                    if (this.db.has(fid)) {
                        var layerId = chan.id;
                        this.db.del(fid);
                        this.changeParent(layerId);
                    }
                }
            }
        });
    }

    update(model: Model) {
        return this.db.update(model);
    }

    changeParent(parentId: string) {
        if (this.db.has(parentId)) {
            const parent = this.db.get(parentId);
            logger('binder.changeParent', parent.id);
            parent.emit('change');
        }
    }

    getMe() {
        const db = this.db;
        const pr: IParser<User> =
            (response) => {
                const u = new User(objectifyResponse(response));
                db.record([u.id], u);
                return u;
            };

        const url = `${API_URL}/auth`;
        return this.transport.get(url, { parse: pr });
    }

    getComps(id: string) {
        return this.db.getComps(id);
    }

    getUser(userId: string) {
        const db = this.db;
        const path = `/user/${userId}`;

        if (db.has(userId)) {
            return Promise.resolve(db.get(userId));
        }
        const pr: IParser<User> =
            (response) => {
                const u = new User(objectifyResponse(response));
                db.record([userId], u);
                return u;
            };
        const url = API_URL + path;
        return this.transport.get(url, { parse: pr });
    }

    getGroup(userId: string, groupId: string) {
        const db = this.db;
        const path = `/user/${userId}/group/${groupId}`;
        if (db.has(groupId)) {
            return Promise.resolve(db.get(groupId));
        }
        const pr: IParser<Group> =
            (response) => {
                const groupData = objectifyResponse(response);
                const g = new Group(_.omit(groupData.group, 'layers'));
                const layers = groupData.group.layers;

                db.record([userId, groupId], g);

                for (const layer of layers) {
                    const l = new Layer(_.omit(layer, 'features'));
                    db.record([userId, groupId, layer.id], l);

                    for (const feature of layer.features) {
                        const f = new Feature(feature);
                        db.record([userId, groupId, layer.id, feature.id], f);
                    }

                    subscribe('layer', layer.id);
                }

                semaphore.signal('stop:loader');
                subscribe('group', groupId);
                return g;
            };
        const url = API_URL + path;
        semaphore.signal('start:loader', 'downloading map data');
        return this.transport.get(url, { parse: pr });
    }


    getGroups(userId: string) {
        const db = this.db;
        const path = `/user/${userId}/group/`;
        const gc = this._groupCache;

        const pr: IParser<Array<Group>> =
            (response) => {
                const data = objectifyResponse(response);

                const ret = [];

                for (const groupData of data.results) {
                    if (db.has(groupData.id)) {
                        ret.push(db.get(groupData.id));
                    }
                    else if (groupData.id in gc) {
                        ret.push(gc[groupData.id]);
                    }
                    else {
                        const g = new Group(groupData);
                        // we do not record here, it would prevent deep loading a group
                        // db.record(path+g.id, g);
                        gc[groupData.id] = g;
                        ret.push(g);
                    }
                }

                return ret;
            };
        const url = API_URL + path;
        return this.transport.get(url, { parse: pr });
    }

    getLayer(userId: string, groupId: string, layerId: string) {
        const db = this.db;
        const path = `/user/${userId}/group/${groupId}/layer/${layerId}`;
        if (db.has(layerId)) {
            return Promise.resolve(db.get(layerId));
        }
        const pr: IParser<Layer> =
            (response) => {
                const l = new Layer(objectifyResponse(response));
                db.record([userId, groupId, layerId], l);
                return l;
            };
        const url = API_URL + path;
        return this.transport.get(url, { parse: pr });
    }

    getLayers(_userId: string, groupId: string) {
        return Promise.resolve(this.db.lookup((rec) => rec.parent === groupId));
    }

    getFeature(userId: string, groupId: string, layerId: string, featureId: string) {
        const db = this.db;
        const path = `/user/${userId}/group/${groupId}/layer/${layerId}/feature/${featureId}`;
        if (db.has(featureId)) {
            return Promise.resolve(db.get(featureId));
        }
        const pr: IParser<Feature> =
            (response) => {
                const f = new Feature(objectifyResponse(response));
                db.record([userId, groupId, layerId, featureId], f);
                return f;
            };
        const url = API_URL + path;
        return this.transport.get(url, { parse: pr });
    }

    delFeature(userId: string, groupId: string, layerId: string, featureId: string) {
        const feature = <Feature>(this.db.get(featureId));
        const geom = feature.getGeometry();

        const path = `/user/${userId}/group/${groupId}/layer/${layerId}/feature.${geom.getType()}/${featureId}`;

        const url = API_URL + path;
        const db = this.db;
        const self = this;

        const pr = () => {
            db.del(featureId);
            self.changeParent(layerId);
        };

        return this.transport.del(url, { parse: pr });
    }

    getFeatures(_userId: string, _groupId: string, layerId: string) {
        return Promise.resolve(
            this.db.lookup(rec => rec.parent === layerId));
    }


    setGroup(userId: string, data: BaseModelData) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/`;

        const pr: IParser<Group> =
            (response) => {
                const g = new Group(objectifyResponse(response));
                db.record([userId, g.id], g);
                binder.changeParent(userId);
                return g;
            };

        const url = API_URL + path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    }

    setLayer(userId: string, groupId: string, data: BaseModelData) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/${groupId}/layer/`;

        const pr: IParser<Layer> =
            (response) => {
                const g = new Layer(objectifyResponse(response));
                db.record([userId, groupId, g.id], g);
                binder.changeParent(groupId);
                return g;
            };

        const url = API_URL + path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    }

    setFeature(userId: string, groupId: string, layerId: string, data: BaseModelData, batch: boolean) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/${groupId}/layer/${layerId}/feature/`;

        const pr: IParser<Feature> =
            (response) => {
                const f = new Feature(objectifyResponse(response));
                db.record([userId, groupId, layerId, f.id], f);
                if (!batch) {
                    binder.changeParent(layerId);
                }
                return f;
            };

        const url = API_URL + path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    }


    attachLayerToGroup(guid: string, groupId: string, layerId: string) {
        const path = `/user/${guid}/group/${groupId}/attach/`;

        const data = {
            'layer_id': layerId,
            'group_id': groupId
        };

        const url = API_URL + path;
        return this.transport.post(url, {
            'body': data
        });
    }

    detachLayerFromGroup(userId: string, groupId: string, layerId: string) {
        const path = `/user/${userId}/group/${groupId}/detach/${layerId}`;
        const url = API_URL + path;
        const pr = () => {
            this.changeParent(groupId);
        };
        return this.transport.del(url, { parse: pr });
    }

    matchKeyAsync(prefix: string) {
        const res = this.db.lookupKey(prefix);
        if (res.length > 0) {
            return Promise.resolve(res);
        }
        return Promise.reject('No Match');
    }

    matchKey(prefix: string) {
        return this.db.lookupKey(prefix);
    }
}

const bindInstance = new Bind();

export function get() {
    // if(!bindInstance){
    //     bindInstance = new Bind();
    // }
    return bindInstance;
}
