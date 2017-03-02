
import Context from './Context';
import Stream from './Stream';



export interface ICommand {
    name: string;
    command: <T>(ctx: Context, args: string[]) => Promise<T>;
}

export interface ISys {
    stdin: Stream;
    stdout: Stream;
    stderr: Stream;
}

export interface ITermCommand {

}

export interface ITerminal {
    capabilities: string[];
}