import Context from './Context';
declare class Layer extends Context {
    constructor();
    readonly name: string;
    readonly commands: {
        'lf': () => any;
        'create': (sGeom: any) => any;
        'import': () => any;
        'sl': (opt_txt: any) => any;
    };
}
export default Layer;
