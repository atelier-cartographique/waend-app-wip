import EventEmitter from 'events';
import Shell from '../lib/Shell';


class Terminal extends EventEmitter {

    constructor() {
        super();
        this.shell = new Shell(this);
    }

    get capabilities () {
        return {};
    }

    start() { throw (new Error('Not Implemented')); }
    makeCommand() { throw (new Error('Not Implemented')); }
    setTitle() { throw (new Error('Not Implemented')); }

};

export default Terminal;
