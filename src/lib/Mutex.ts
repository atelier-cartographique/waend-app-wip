import { EventEmitter } from 'events';
import * as debug from 'debug';
const logger = debug('waend:Mutex');


type Unlock = () => void;
type Resolver = (a: (b: Unlock) => void, c: (d: Error) => void) => void;

class Mutex extends EventEmitter {

    private queue: number;

    constructor(private queueLength = 128) {
        super();
        this.queue = 0;
        this.setMaxListeners(this.queueLength);
    }

    get(): Promise<Unlock> {
        logger('mutex.get', this.queue);

        const unlock: Unlock =
            () => {
                logger('mutex.unlock', this.queue);
                this.queue -= 1;
                this.emit('unlock', this.queue);
            };

        if (this.queue > 0) {
            const resolver: Resolver =
                (resolve, reject) => {
                    if (this.queue >= this.queueLength) {
                        return reject(new Error('QueueLengthExceeded'));
                    }
                    const index = this.queue;
                    this.queue += 1;
                    logger('mutex.queue', this.queue);

                    const listener: (a: number) => void =
                        (q) => {
                            if (q <= index) {
                                this.removeListener('unlock', listener);
                                resolve(unlock);
                            }
                        };

                    this.on('unlock', listener);
                };
            return (new Promise(resolver));
        }

        this.queue += 1;
        return Promise.resolve(unlock);
    }

}

export default Mutex;
