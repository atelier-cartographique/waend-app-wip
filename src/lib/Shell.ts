import { EventEmitter } from 'events';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as debug from 'debug';
import { User } from './Model';
import Context from './Context';
import Env from './Env';
import { get as getBinder } from './Bind';
import Stream from './Stream';
import region from './Region';
import semaphore from './Semaphore';
import { ICommand, ISys, IEventChangeContext, ContextIndex, SpanPack } from './waend';
const logger = debug('waend:Shell');



type ContextOrNull = Context | null;

function getCliChunk(chars: string[], start: number, endChar: string) {
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


const defaultDescriptor = {
    enumerable: false,
    configurable: false,
    // writable: false
};

export class Shell extends EventEmitter {

    stdin: Stream;
    stdout: Stream;
    stderr: Stream;
    private contexts: ContextOrNull[];
    private commands: ICommand[][];
    private currentContext: ContextIndex;
    private postSwitchCallbacks: Array<(() => void)>
    private user: User | null;
    private previousGroup: string;

    constructor() {
        super();
        this.contexts = new Array(5);
        this.commands = new Array(5);
        this.contexts[ContextIndex.SHELL] = new Context('root', { shell: this });
        this.currentContext = ContextIndex.SHELL;
        this.initStreams();

        semaphore.on('please:shell:context',
            this.switchContext.bind(this));

    }

    setCommands(contextId: ContextIndex, commands: ICommand[]) {
        this.commands[contextId] = commands;
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

        const forward: (a: SpanPack) => void =
            (pack) => {
                this.stdout.write(pack);
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
                        Env.set('DELIVERED', result);
                        return Promise.resolve(result);
                    });
            }
            catch (err) {
                Env.set('DELIVERED', new Error(err));
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

                    left.stdout.on('data', (pack: SpanPack) => {
                        right.stdin.write(pack);
                    });

                    left.stdin.on('data', (pack: SpanPack) => {
                        right.stdout.write(pack);
                    });
                };

            return Promise.reduce(cls, (total, _item, index) => {
                Env.set('DELIVERED', total);
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
        Env.set('DELIVERED', null);
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
        semaphore.signal<IEventChangeContext>('shell:change:context', {
            path,
            index: this.currentContext,
        });
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
                    this.contexts[ContextIndex.USER] = new Context('user', {
                        shell: this,
                        data: userData,
                        parent: this.contexts[ContextIndex.SHELL]
                    });
                    this.currentContext = ContextIndex.USER;
                    this.clearContexts();
                    return Promise.resolve(this);
                })
                .catch(err => {
                    logger('failed to switch context', err);
                })
        );
    }

    setGroup(groupId: string) {
        const context = this.contexts[ContextIndex.USER];
        if (context) {

            const user = context.data;

            return (
                getBinder()
                    .getGroup(user.id, groupId)
                    .then(groupData => {
                        this.contexts[ContextIndex.GROUP] = new Context("group", {
                            shell: this,
                            data: groupData,
                            parent: this.contexts[ContextIndex.USER]
                        });
                        this.currentContext = ContextIndex.GROUP;
                        if (this.previousGroup !== groupId) {
                            // here we check if a region set should happen
                            this.previousGroup = groupId;
                            if (groupData.has('extent')) {
                                // it should be an array [minx, miny, maxx, maxy];
                                const extent = groupData.get('extent',
                                    region.getWorldExtent().getArray());
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
                        logger('failed to switch context', err);
                    })
            );
        }

        return Promise.reject(new Error("SetGroupNoContext"));
    }

    setLayer(layerId: string) {
        const userContext = this.contexts[ContextIndex.USER];
        const groupContext = this.contexts[ContextIndex.GROUP];

        if (userContext && groupContext) {
            const user = userContext.data;
            const group = groupContext.data;

            return (
                getBinder()
                    .getLayer(user.id, group.id, layerId)
                    .then(layerData => {
                        this.contexts[ContextIndex.LAYER] = new Context("layer", {
                            shell: this,
                            data: layerData,
                            parent: this.contexts[ContextIndex.GROUP]
                        });
                        this.currentContext = ContextIndex.LAYER;
                        this.clearContexts();
                        return Promise.resolve(this);
                    })
                    .catch(err => {
                        logger('failed to switch context', err);
                    })
            );
        }
        return Promise.reject(new Error("SetLayerNoContext"));
    }

    setFeature(featureId: string) {
        const userContext = this.contexts[ContextIndex.USER];
        const groupContext = this.contexts[ContextIndex.GROUP];
        const layerContext = this.contexts[ContextIndex.LAYER];

        if (userContext && groupContext && layerContext) {

            const user = userContext.data;
            const group = groupContext.data;
            const layer = layerContext.data;

            return (
                getBinder()
                    .getFeature(user.id, group.id, layer.id, featureId)
                    .then(featureData => {
                        this.contexts[ContextIndex.FEATURE] = new Context("feature", {
                            shell: this,
                            data: featureData,
                            parent: this.contexts[ContextIndex.LAYER]
                        });
                        this.currentContext = ContextIndex.FEATURE;
                        this.clearContexts();
                        return Promise.resolve(this);
                    })
                    .catch(err => {
                        logger('failed to switch context', err);
                    })
            );
        }
        return Promise.reject(new Error("SetFeatureNoContext"));
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

    loadGroup(path: string[]) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];

        return this.setUser(userName)
            .then(() => this.setGroup(groupName));
    }

    loadLayer(path: string[]) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const layerName = path[2];

        return this.setUser(userName)
            .then(() => this.setGroup(groupName))
            .then(() => this.setLayer(layerName));
    }

    loadFeature(path: string[]) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const layerName = path[2];
        const featureName = path[3];

        return this.setUser(userName)
            .then(() => this.setGroup(groupName))
            .then(() => this.setLayer(layerName))
            .then(() => this.setFeature(featureName));
    }

    loginUser(u: User) {
        this.user = u;
        semaphore.signal('user:login', u);
    }

    logoutUser() {
        this.user = null;
        semaphore.signal<void>('user:logout');
    }

}


export default Shell;
