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
import { SpanPack } from "./waend";


enum Status {
    Open,
    Close
}



export default class Stream extends EventEmitter {
    private entries: SpanPack[];
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

    write(pack: SpanPack) {
        if (this.isOpened()) {
            this.entries.push(pack);
            this.emit('data', pack);
        }
    }

    read(): Promise<SpanPack> {
        if (this.isOpened) {
            const entry = this.entries.shift();
            if (entry) {
                return Promise.resolve(entry);
            }
            else {
                const resolver: (a: (b: SpanPack) => void) => void =
                    (resolve) => {
                        this.once('data',
                            (entry: SpanPack) => {
                                resolve(entry);
                                this.entries.shift();
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

