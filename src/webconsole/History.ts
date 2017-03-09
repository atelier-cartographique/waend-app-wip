


type HistMoveFn = () => string;

export interface IHistory {
    forward: HistMoveFn;
    backward: HistMoveFn;
    push: (a: string) => void;
}



export const History: () => IHistory =
    () => {
        const commands: string[] = [];
        let currentIndex = -1;

        const resetIndex =
            () => {
                currentIndex = commands.length - 1;
                return currentIndex;
            }

        const push: (a: string) => number =
            (cmd) => {
                if (commands.length > 0) {
                    const lastCmd = commands[commands.length - 1];
                    if (lastCmd === cmd) {
                        return currentIndex;
                    }
                }
                commands.push(cmd);
                return resetIndex();
            }

        const backward: HistMoveFn =
            () => {
                if (commands.length > 0) {
                    currentIndex -= 1;
                    if (currentIndex < 0) {
                        currentIndex = +1;
                    }
                    return commands[currentIndex];
                }
                return '';
            }

        const forward: HistMoveFn =
            () => {
                if (commands.length > 0) {
                    currentIndex += 1;
                    if (currentIndex > (commands.length - 1)) {
                        currentIndex = -1;
                    }
                    return commands[currentIndex];
                }
                return '';
            }

        return { push, backward, forward };
    }
