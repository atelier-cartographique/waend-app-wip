
import semaphore from '../lib/Semaphore';
import { History, IHistory } from './History';
import { isKeyCode, KeyCode, addClass, INPUT, DIV, removeClass } from "../lib/util/dom";

export interface InputOptions {
    className: string;
}

interface IInput {
    node: Element;
    enable: () => void;
    disable: () => void;
}

const isKeyEnter = isKeyCode(KeyCode.ENTER);
const isKeyUp = isKeyCode(KeyCode.UP_ARROW);
const isKeyDown = isKeyCode(KeyCode.DOWN_ARROW);



const eventHandler: (a: HTMLInputElement, b: IHistory) => (c: KeyboardEvent) => void =
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



export const Input: (a: InputOptions) => IInput =
    (options) => {
        const history = History();
        const node = INPUT();
        const inputField = INPUT();
        const inputPrompt = DIV();
        const inputBottomline = DIV();

        addClass(node, options.className);
        addClass(inputField, 'wc-input');
        addClass(inputPrompt, 'wc-input-prompt');
        addClass(inputBottomline, 'wc-input-bottom-line');

        inputField.setAttribute('type', 'text');
        inputField.addEventListener('keyup',
            eventHandler(node, history), false);

        inputPrompt.appendChild(document.createTextNode('>'));
        node.appendChild(inputPrompt);
        node.appendChild(inputField);
        node.appendChild(inputBottomline);

        const enable =
            () => {
                inputField.disabled = false;
                removeClass(node, 'wc-disabled');
            }

        const disable =
            () => {
                inputField.disabled = true;
                addClass(node, 'wc-disabled');
            }

        return { node, enable, disable };
    };