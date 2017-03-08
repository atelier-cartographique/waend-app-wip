
import { Span } from "../lib/waend";
import semaphore from '../lib/Semaphore';
import { addClass, SPAN } from "../lib/util/dom";



const onClick: (a: string[]) => (b: MouseEvent) => void =
    (commands) => (event) => {
        event.preventDefault();
        commands.forEach((command) => {
            semaphore.signal('command:run', command);
        });
    }

const fromFragment: (a: Element, b?: string[]) => Element =
    (fragment, commands) => {
        if (commands) {
            fragment.addEventListener('click',
                onClick(commands), false);
        }
        return fragment;
    }


export const asElement: (a: Span) => Element =
    (span) => {
        if (span.fragment) {
            return fromFragment(span.fragment, span.commands);
        }

        const element = SPAN();
        const textElement = document.createTextNode(span.text);

        addClass(element, 'wc-command');
        element.appendChild(textElement);

        if (span.commands) {
            addClass(element, 'clickable');
            element.addEventListener('click',
                onClick(span.commands), false);
        }
        return element;
    }

