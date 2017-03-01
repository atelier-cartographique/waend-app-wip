import EventEmitter from 'events';
declare class Stream extends EventEmitter {
    constructor(noAutoOpen: any);
    open(): void;
    close(): void;
    isOpened(): boolean;
    write(): void;
    read(): any;
    readSync(): any;
    dump(): any;
}
export default Stream;
