import { EventEmitter } from 'events';
import * as url from 'url';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as debug from 'debug';
import { User } from './Model';
import Context from './Context';
import { get as getBinder } from './Bind';
import Stream from './Stream';
import region from './Region';
import semaphore from './Semaphore';
import { ICommand, ISys } from './waend';
const logger = debug('waend:Shell');


enum ContextIndex {
    SHELL = 0,
    USER,
    GROUP,
    LAYER,
    FEATURE,
}

type ContextOrNull = Context | null;

// FIXME
const FRAGMENT_ROOT: string | undefined = ((typeof window !== 'undefined')
    && (window['FRAGMENT_ROOT']) ? window['FRAGMENT_ROOT'] : '/map/');


function getCliChunk(chars, start, endChar) {
    let chunk = '';
    for (let i = start; i < chars.length; i++) {
        const c = chars[i];
        if (endChar === c) {
            break;
        }
        chunk += c;
    }
    return chunk;
}

function cliSplit(str: string) {
    const chars = str.trim().split('');
    const ret = [];
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        let chunk;
        if ('"' === c) {
            chunk = getCliChunk(chars, i + 1, '"');
            i += chunk.length + 1;
            ret.push(chunk);
        }
        else if ("'" === c) {
            chunk = getCliChunk(chars, i + 1, "'");
            i += chunk.length + 1;
            ret.push(chunk);
        }
        else if (' ' !== c) {
            chunk = getCliChunk(chars, i, ' ');
            i += chunk.length;
            ret.push(chunk);
        }
    }

    return ret;
}

// some tests, i keep them around for whatever reason
// var tests = [
//     ['cmd arg', 2],
//     ['cmd arg0 arg1', 3],
//     ['cmd "arg0 arg1"', 2],
//     ['cmd \'"arg0 arg1" arg2\' arg3', 3],
//     ['cmd "\'arg0 arg1 arg2\' arg3" arg4', 3],
//     ['cmd "\'arg0 arg1 arg2\' arg3" "arg4 arg5"', 3],
// ];

// for (var i = 0; i < tests.length; i++) {
//     var str = tests[i][0];
//     var check = tests[i][1];
//     var splitted = split(str)
//     logger('<'+str+'>', check, splitted.length, splitted);
// }

interface IUrl extends url.Url {
    fragment: string;
    comps: string[];
}

function getUrl() {
    const purl = <IUrl>url.parse(window.location.href);
    const queryString = purl.query;

    if (queryString) {
        purl.query = {};
        _.each(queryString.split('&'), pair => {
            const spair = pair.split('=');
            purl.query[spair[0]] = decodeURIComponent(spair[1]);
        });
    }

    // backbone based
    const trailingSlash = /\/$/;
    const routeStripper = /^[#\/]|\s+$/g;
    let fragment = purl.pathname || "";
    const root = FRAGMENT_ROOT ? FRAGMENT_ROOT.replace(trailingSlash, '') : "";
    if (!fragment.indexOf(root)) {
        fragment = fragment.substr(root.length);
    }
    fragment.replace(routeStripper, '');
    let path = fragment.split('/');
    while (path.length > 0 && 0 === path[0].length) {
        path = path.slice(1);
    }
    purl.fragment = fragment;
    purl.comps = path;
    return purl;
}


const defaultDescriptor = {
    enumerable: false,
    configurable: false,
    // writable: false
};

export class Shell extends EventEmitter {

    private historyStarted: string[] | undefined;
    private contexts: ContextOrNull[];
    private commands: ICommand[][];
    private currentContext: ContextIndex;
    private stdin: Stream;
    private stdout: Stream;
    private stderr: Stream;
    private env: any;
    private postSwitchCallbacks: Array<(() => void)>
    private user: User | null;

    constructor() {
        super();
        this.contexts = new Array(5);
        this.commands = new Array(5);
        this.contexts[ContextIndex.SHELL] = new Context('root', { shell: this });
        this.currentContext = ContextIndex.SHELL;
        this.initStreams();

        this.env = {}; // ouch

        semaphore.on('please:shell:context',
            this.switchContext.bind(this));

    }

    setCommands(contextId: ContextIndex, commands: ICommand[]) {
        this.commands[contextId] = commands;
    }


    initHistory() {

        window.onpopstate = (event: PopStateEvent) => {
            this.historyPopContext(event);
        };

        const purl = getUrl();
        let startPath;
        if ((purl.fragment.length > 0) && (purl.comps.length > 0)) {
            let after = _.noop;
            startPath = purl.comps;
            if (purl.query && 'c' in purl.query) {
                const command = purl.query.c;
                const comps = purl.comps;
                let pre: string | undefined;
                if (comps.length === ContextIndex.FEATURE) {
                    pre = 'gg | region set';
                }
                after = () => {
                    if (pre) {
                        this.exec(pre);
                    }
                    this.exec(command);
                };
            }
            else if (purl.comps.length === ContextIndex.FEATURE) {
                after = () => {
                    this.exec('gg | region set');
                };
            }
            this.historyPushContext(purl.comps).then(after);
        }
        this.historyStarted = startPath;
        this.emit('history:start', startPath);
    }

    historyPopContext(event: PopStateEvent) {
        if (event.state) {
            this.switchContext(event.state);
        }
    }

    historyPushContext(opt_path: string[], opt_title?: string) {
        const root = FRAGMENT_ROOT || "";
        window.history.pushState(
            opt_path,
            opt_title || '',
            root + opt_path.join('/')
        );
        return this.switchContext(opt_path);
    }

    initStreams() {

        const streams: ISys = {
            stdin: new Stream(),
            stdout: new Stream(),
            stderr: new Stream()
        };

        Object.defineProperty(this, 'stdin', _.defaults({
            get() {
                return streams.stdin;
            },
        }, defaultDescriptor));

        Object.defineProperty(this, 'stdout', _.defaults({
            get() {
                return streams.stdout;
            },
        }, defaultDescriptor));

        Object.defineProperty(this, 'stderr', _.defaults({
            get() {
                return streams.stderr;
            },
        }, defaultDescriptor));
    }

    commandLineTokens(cl: string) {
        return cliSplit(cl);
    }


    makePipes(n: number) {
        const pipes: ISys[] = [];

        for (let i = 0; i < n; i++) {
            const sys: ISys = {
                'stdin': (new Stream()),
                'stdout': (new Stream()),
                'stderr': this.stderr
            };
            pipes.push(sys);
        }

        const concentrator: ISys = {
            'stdin': (new Stream()),
            'stdout': (new Stream()),
            'stderr': this.stderr
        };

        const forward: (...a: any[]) => void =
            (...args) => {
                this.stdout.write(...args);
            }

        pipes.push(concentrator);
        concentrator.stdin.on('data', forward);

        return pipes;
    }

    execOne(cl: string) {
        const toks = this.commandLineTokens(cl.trim());
        const context = this.contexts[this.currentContext];
        if (context) {
            try {
                const sys: ISys = {
                    'stdin': this.stdin,
                    'stdout': this.stdout,
                    'stderr': this.stderr
                };

                return context.exec(sys, toks)
                    .then(result => {
                        this.env.DELIVERED = result;
                        return Promise.resolve(result);
                    });
            }
            catch (err) {
                this.env.DELIVERED = err;
                return Promise.reject(err);
            }
        }
        return Promise.reject(new Error('ContextFailed'));
    }

    execMany(cls: string[]) {
        const context = this.contexts[this.currentContext];
        const pipes = this.makePipes(cls.length);

        if (context) {

            const pipeStreams: (a: ISys, b: ISys) => void =
                (left, right) => {

                    left.stdout.on('data', (...args: any[]) => {
                        right.stdin.write(...args);
                    });

                    left.stdin.on('data', (...args: any[]) => {
                        right.stdout.write(...args);
                    });
                };

            return Promise.reduce(cls, (total, _item, index) => {
                this.env.DELIVERED = total;
                const cl = cls[index].trim();
                const toks = this.commandLineTokens(cl);
                const sys = pipes[index];
                const nextSys = pipes[index + 1];
                pipeStreams(sys, nextSys);
                return context.exec(sys, toks);
            }, 0);
        }
        return Promise.reject(new Error('ContextFailed'));
    }

    exec(cl: string) {
        const cls = cl.trim().split('|');
        // shall be called, but not doing it exposes weaknesses, which is good at this stage
        // this.stdin.dump();
        // this.stdout.dump();
        // this.stderr.dump();
        this.env.DELIVERED = null;
        if (1 === cls.length) {
            return this.execOne(cls[0]);
        }
        return this.execMany(cls);
    }

    clearContexts() {
        const start = this.currentContext + 1;
        let i;
        for (i = start; i < this.contexts.length; i++) {
            this.contexts[i] = null;
        }
        const path = [];
        for (i = 1; i < start; i++) {
            const context = this.contexts[i];
            if (!context) {
                break;
            }
            path.push(context.data.id);
        }
        for (i = 0; i < this.postSwitchCallbacks.length; i++) {
            const cb = this.postSwitchCallbacks[i];
            cb();
        }
        semaphore.signal('shell:change:context', this.currentContext, path);
    }

    switchContext(pathComps: string[]) {
        this.postSwitchCallbacks = [];
        if (0 === pathComps.length) {
            this.currentContext = ContextIndex.SHELL;
            this.clearContexts();
            return Promise.resolve(ContextIndex.SHELL);
        }
        else if (1 === pathComps.length) {
            return this.loadUser(pathComps);
        }
        else if (2 === pathComps.length) {
            return this.loadGroup(pathComps);
        }
        else if (3 === pathComps.length) {
            return this.loadLayer(pathComps);
        }
        else if (4 === pathComps.length) {
            return this.loadFeature(pathComps);
        }

        return Promise.reject(new Error('FailedToSwitchContext'));
    }

    getUserId(userName: string) {
        if ('me' === userName) {
            if (this.user) {
                return this.user.id;
            }
            throw (new Error("you're not logged in"));
        }
        return userName;
    }

    getUser() {
        return this.user;
    }

    setUser(userId: string) {
        return (
            getBinder()
                .getUser(userId)
                .then(userData => {
                    this.contexts[ContextIndex.USER] = new User({
                        shell: this,
                        data: userData,
                        parent: this.contexts[ContextIndex.SHELL]
                    });
                    this.currentContext = ContextIndex.USER;
                    this.clearContexts();
                    return Promise.resolve(this);
                })
                .catch(err => {
                    console.error('failed to switch context', err);
                })
        );
    }

    setGroup(groupId) {
        const user = this.contexts[ContextIndex.USER].data;
        const bind = getBinder();

        const prm = bind.getGroup(user.id, groupId)
            .then(groupData => {
                this.contexts[ContextIndex.GROUP] = new Group({
                    shell: this,
                    data: groupData,
                    parent: this.contexts[ContextIndex.USER]
                });
                this.currentContext = ContextIndex.GROUP;
                if (this._previousGroup !== groupId) {
                    // here we check if a region set should happen
                    this._previousGroup = groupId;
                    if (groupData.has('extent')) {
                        // it should be an array [minx, miny, maxx, maxy];
                        const extent = groupData.get('extent');
                        this.postSwitchCallbacks.push(() => {
                            semaphore.once('layer:update:complete', () => {
                                region.push(extent);
                            });
                        });
                    }
                }
                this.clearContexts();
                return Promise.resolve(this);
            })
            .catch(err => {
                console.error('failed to switch context', err);
            });

        return prm;
    }

    setLayer(layerId) {
        const user = this.contexts[ContextIndex.USER].data;
        const group = this.contexts[ContextIndex.GROUP].data;
        const bind = getBinder();

        const prm = bind.getLayer(user.id, group.id, layerId)
            .then(layerData => {
                this.contexts[ContextIndex.LAYER] = new Layer({
                    shell: this,
                    data: layerData,
                    parent: this.contexts[ContextIndex.GROUP]
                });
                this.currentContext = ContextIndex.LAYER;
                this.clearContexts();
                return Promise.resolve(this);
            })
            .catch(err => {
                console.error('failed to switch context', err);
            });

        return prm;
    }

    setFeature(featureId) {
        const user = this.contexts[ContextIndex.USER].data;
        const group = this.contexts[ContextIndex.GROUP].data;
        const layer = this.contexts[ContextIndex.LAYER].data;
        const bind = getBinder();

        const prm = bind.getFeature(user.id, group.id, layer.id, featureId)
            .then(featureData => {
                this.contexts[ContextIndex.FEATURE] = new Feature({
                    shell: this,
                    data: featureData,
                    parent: this.contexts[ContextIndex.LAYER]
                });
                this.currentContext = ContextIndex.FEATURE;
                this.clearContexts();
                return Promise.resolve(this);
            })
            .catch(err => {
                console.error('failed to switch context', err);
            });

        return prm;
    }

    loadUser(path: string[]) {
        //logger('shell.loadUser', path);
        try {
            const userName = this.getUserId(path[0]);
            return this.setUser(userName);
        }
        catch (err) {
            return Promise.reject('invalid user id');
        }

    }

    loadGroup(path) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const getGroup = _.bind(_.partial(this.setGroup, groupName), this);

        return this.setUser(userName)
            .then(getGroup);
    }

    loadLayer(path) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const layerName = path[2];
        const getGroup = _.bind(_.partial(this.setGroup, groupName), this);
        const getLayer = _.bind(_.partial(this.setLayer, layerName), this);

        return this.setUser(userName)
            .then(getGroup)
            .then(getLayer);
    }

    loadFeature(path: string[]) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const layerName = path[2];
        const featureName = path[3];
        const getGroup = _.bind(_.partial(this.setGroup, groupName), this);
        const getLayer = _.bind(_.partial(this.setLayer, layerName), this);
        const getFeature = _.bind(_.partial(this.setFeature, featureName), this);

        return this.setUser(userName)
            .then(getGroup)
            .then(getLayer)
            .then(getFeature);
    }

    loginUser(u: User) {
        this.user = u;
        semaphore.signal('user:login', u);

        const next = startPath => {
            if (!startPath) {
                this.switchContext([u.id]);
            }
        };

        if (this.historyStarted !== false) {
            next(this.historyStarted);
        }
        else {
            this.once('history:start', next);
        }
    }

    logoutUser() {
        this.user = null;
        semaphore.signal('user:logout');
    }

}


export default Shell;
