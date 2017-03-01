import Context from './Context';
declare class Feature extends Context {
    constructor(...args: any[]);
    readonly name: string;
    readonly commands: {
        'gg': () => any;
        'sg': (geoJSON: any) => any;
        'sf': (opt_txt: any) => any;
    };
}
export default Feature;
