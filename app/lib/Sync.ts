/*
 * app/lib/Sync.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import * as _ from 'lodash';
import * as SockJS from 'sockjs-client';
import * as debug from 'debug';
import semaphore from './Semaphore';
const logger = debug('waend:Sync');

let sock: WebSocket;
const pendings: any[] = [];

function sockOpen() {
    logger('sync opened', pendings.length);

    for (let i = 0; i < pendings.length; i++) {
        const msg = JSON.stringify(pendings[i]);
        sock.send(msg);
    }
}

function sockMessage(evt: MessageEvent) {
    const data = evt.data || '[]';
    try {
        const args = JSON.parse(data);

        if (_.isArray(args) && (args.length > 1)) {
            semaphore.signal('sync', ...args);
        }
    }
    catch (err) {
        logger(`sync.onmessage ${err}`);
    }
}

function sockClose(exp: CloseEvent) {
    logger('sync closed', exp);
}



export function configure(url: string) {
    sock = <WebSocket>(new SockJS(url));
    sock.onopen = sockOpen;
    sock.onclose = sockClose;
    sock.onmessage = sockMessage;
}

/**
 * send raw data to the nofify end point
 * @method send
 * @return {bool} true if data has been sent, false if delayed or failed
 */
export function send(...args: any[]) {
    if (!sock || (sock.readyState !== SockJS.OPEN)) {
        pendings.push(args);
    }
    else {
        try {
            sock.send(JSON.stringify(args));
            return true;
        }
        catch (err) {
            console.error('Sync.send', err);
        }
    }
    return false;
}

/**
 * subscribe to a channel
 * @method subscribe
 * @param  {string}  type A channel name, which is usually a context name
 * @param  {string}  id   context id
 */

export function subscribe(type: string, id: string) {
    exports.send('sub', type, id);
}
