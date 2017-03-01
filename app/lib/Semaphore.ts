import * as EventEmitter from 'events';


class Semaphore extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(256);
    }

    signal(event: string, ...args: any[]) {
        this.emit(event, ...args);
    }

}

const semaphore = new Semaphore();
export default semaphore;
