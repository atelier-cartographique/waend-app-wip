import Context from './Context';
declare class User extends Context {
    constructor();
    readonly name: string;
    readonly commands: {
        'lg': () => any;
    };
}
export default User;
