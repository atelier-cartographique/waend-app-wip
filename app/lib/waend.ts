
import Context from './Context';


export interface ICommand {
    name: string;
    command: <T>(ctx: Context, args: any[]) => Promise<T>;
}


