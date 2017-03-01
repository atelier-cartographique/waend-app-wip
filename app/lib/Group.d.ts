import Context from './Context';
declare class Group extends Context {
    constructor();
    readonly name: string;
    readonly commands: {
        'll': () => any;
        'visible': () => any;
        'mklayer': (groupName: any, groupDescription: any) => any;
    };
}
export default Group;
