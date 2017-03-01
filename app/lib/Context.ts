/*
 * app/lib/Context.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import * as EventEmitter from 'events';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import Shell from './Shell';
import { ModelData } from './Model';
import { get as getBinder } from './Bind';

// import * as debug from 'debug';
// const logger = debug('waend:Context');

type IResolver<T> = (resolve: (a: T) => void, reject: (a: Error) => void) => void;

class Context extends EventEmitter {

    public static binder = getBinder();
    public shell: Shell;
    readonly data: ModelData;
    readonly current: string[];
    readonly parent?: Context;

    constructor(options: any) {
        super();
        this.shell = options.shell;
        this.data = options.data;
        this.parent = options.parent;

        const computeCurrent: (a: Context, b: string[]) => string[] =
            (ctx, acc) => {
                if (ctx.parent) {
                    return computeCurrent(ctx.parent, acc);
                }
                return acc.concat([ctx.data.id]);
            };
        this.current = computeCurrent(this, []);
    }

    get baseCommands() {
        const val = {};
        for (let k in commands) {
            const c = commands[k];
            val[c.name] = c.command;
        }
        return val;
    }

    /**
     *  this function executes a command in the scope of this context
     */
    exec() {
        const args = _.toArray(arguments);
        const sys = args.shift();
        const cmd = args.shift();
        let method = null;

        if (cmd in this.commands) {
            method = this.commands[cmd];
        }
        else if (cmd in this.baseCommands) {
            method = this.baseCommands[cmd];
        }

        if (method) {
            this.sys = sys;
            return method.call(this, ...args);
        }
        else if (this.parent) {
            return this.parent.exec(...arguments);
        }
        throw (new Error(`command not found: ${cmd}`));
    }

    getUser() {
        const cur = this.current;
        if (cur.length > 0) {
            return cur[0];
        }
        return null;
    }

    getGroup() {
        const cur = this.current;
        if (cur.length > 1) {
            return cur[1];
        }
        return null;
    }

    getLayer() {
        const cur = this.current;
        if (cur.length > 2) {
            return cur[2];
        }
        return null;
    }

    getFeature() {
        const cur = this.current;
        if (cur.length > 3) {
            return cur[3];
        }
        return null;
    }


    end<T>(ret: IResolver<T> | T) {
        if (_.isFunction(<IResolver<T>>ret)) { // we assume fn(resolve, reject)
            const resolver = <IResolver<T>>ret;
            return (new Promise<T>(resolver));
        }
        return Promise.resolve<T>(<T>ret);
    }

    endWithError<T>(err: Error) {
        return Promise.reject<T>(err);
    }

}


export default Context;

/*

Argument of type 'IResolver<T>' 
is not assignable to parameter of type:

(resolve: (thenableOrResult?: T | Thenable<T> | undefined) => void, reject: (error?: any) => void...

Types of parameters 'a' and 'resolve' are incompatible.

(thenableOrResult?: T | Thenable<T> | undefined) => void

is not assignable to type 'T'.

*/