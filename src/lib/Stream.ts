/*
 * app/lib/Stream.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import { EventEmitter } from 'events';
import * as Promise from 'bluebird';
import * as _ from 'lodash';

enum Status {
    Open,
    Close
}

class Stream extends EventEmitter {
    private entries: any[];
    private openStatus: Status;

    constructor(status: Status = Status.Open) {
        super();
        this.entries = [];
        this.openStatus = status;
    }

    open() {
        this.openStatus = Status.Open;
    }

    close() {
        this.openStatus = Status.Close;
    }

    isOpened() {
        return (this.openStatus === Status.Open);
    }

    write(...args: any[]) {
        if (this.isOpened()) {
            this.entries.push(args);
            this.emit('data', ...args);
        }
    }

    read(): Promise<any> {
        if (this.isOpened) {
            const entry = this.entries.shift();
            if (entry) {
                return Promise.resolve(entry);
            }
            else {
                const resolver = (resolve: (a: any) => void) => {
                    this.once('data', () => {
                        const entry = this.entries.shift();
                        resolve(entry);
                    });
                };
                return (new Promise(resolver));
            }
        }
        return Promise.reject(new Error('stream is closed'));
    }

    readSync() {
        if (this.isOpened()) {
            return this.entries.shift();
        }
        return null;
    }

    dump() {
        const entries = this.entries;
        this.entries = [];
        return entries;
    }
};

export default Stream;
