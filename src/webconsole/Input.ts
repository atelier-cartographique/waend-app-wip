
import semaphore from '../lib/Semaphore';
import { History } from './History';
import { isKeyCode, KeyCode, addClass } from "../lib/util/dom";

export interface InputOptions {
    className: string;
}

const isKeyEnter = isKeyCode(KeyCode.ENTER);
const isKeyUp = isKeyCode(KeyCode.UP_ARROW);
const isKeyDown = isKeyCode(KeyCode.DOWN_ARROW);



const eventHandler: (a: HTMLInputElement, b: History) => (c: KeyboardEvent) => void =
    (input, history) => (event) => {
        if (isKeyEnter(event)) {
            const cmd = input.value.trim();
            input.value = '';
            if (cmd.length > 0) {
                history.push(cmd);
                semaphore.signal('input:line', cmd);
            }

        }
        else if (isKeyUp(event)) {
            input.value = history.backward();
        }
        else if (isKeyDown(event)) {
            input.value = history.forward();
        }
    }



export const Input: (a: InputOptions) => Element =
    (options) => {
        const history = History();
        const input = document.createElement('input');
        const inputField = document.createElement('input');
        const inputPrompt = document.createElement('div');
        const inputBottomline = document.createElement('div');

        addClass(input, options.className);
        addClass(inputField, 'wc-input');
        addClass(inputPrompt, 'wc-input-prompt');
        addClass(inputBottomline, 'wc-input-bottom-line');

        inputField.setAttribute('type', 'text');
        inputField.addEventListener('keyup',
            eventHandler(input, history), false);

        inputPrompt.appendChild(document.createTextNode('>'));
        input.appendChild(inputPrompt);
        input.appendChild(inputField);
        input.appendChild(inputBottomline);

        return input;
    };