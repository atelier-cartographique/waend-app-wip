declare class SyncHandler {
    constructor(container: any, context: any);
    start(): this;
    follow(cb: any, ctx: any): this;
    dispatch(chan: any, cmd: any, data: any): void;
    onUpdate(chan: any, data: any): void;
    onCreate(chan: any, data: any): void;
    onDelete(chan: any, id: any): void;
}
export default SyncHandler;
