

export default class InputHistory {
    constructor(options) {
        this.commands = [];
        this.currentIndex = -1;
    }

    resetIndex() {
        this.currentIndex = this.commands.length;
    }

    push(cmd) {
        cmd = cmd.trim();
        if (this.commands.length > 0) {
            const lastCmd = this.commands[this.commands.length - 1];
            if (lastCmd === cmd) {
                return;
            }
        }
        this.commands.push(cmd);
        this.resetIndex();
    }

    backward() {
        if (this.commands.length > 0) {
            this.currentIndex -= 1;
            if (this.currentIndex < 0) {
                this.resetIndex();
                return '';
            }
            return this.commands[this.currentIndex];
        }
        return '';
    }

    forward() {
        if (this.commands.length > 0) {
            this.currentIndex += 1;
            if (this.currentIndex > (this.commands.length - 1)) {
                this.currentIndex = -1;
                return '';
            }
            return this.commands[this.currentIndex];
        }
        return '';
    }
}
