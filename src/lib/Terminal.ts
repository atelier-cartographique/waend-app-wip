import { EventEmitter } from 'events';
import Shell from '../lib/Shell';


class Terminal extends EventEmitter {
    protected shell: Shell;

    constructor() {
        super();
        this.shell = new Shell();
    }

    get capabilities() {
        return {};
    }

    start() { throw (new Error('Not Implemented')); }
    makeCommand() { throw (new Error('Not Implemented')); }
    setTitle() { throw (new Error('Not Implemented')); }

};

export default Terminal;
