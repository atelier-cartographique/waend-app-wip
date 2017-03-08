

import { Button, ButtonGroup } from './Buttons';
import { addClass, DIV } from "../lib/util/dom";
import semaphore from '../lib/Semaphore';

const commandHandler: (a: string[]) => (c: Event) => void =
    (commands) => (event) => {
        event.stopPropagation();
        commands.forEach((command) => {
            semaphore.signal('command:run', command);
        });
    };


const makeButton: (a: Button) => Element =
    (button) => {

        const buttonElement = DIV();
        addClass(buttonElement, 'wc-button');

        // eventPreventer(buttonElement, eventsToFilter);

        if ('function' === button.type && button.fn) {
            button.fn(buttonElement);
            return buttonElement;
        }

        const bnClass = button.label.replace(/\s+/g, '').toLowerCase();
        const buttonWrapper = DIV();

        buttonElement.appendChild(document.createTextNode(button.label));
        buttonWrapper.appendChild(buttonElement);

        addClass(buttonWrapper, `button-wrapper ${bnClass}`);
        addClass(buttonElement, `icon-${bnClass}`);


        if (('shell' === button.type || 'display' === button.type)
            && button.command) {
            buttonElement.addEventListener(
                'click',
                commandHandler(button.command)
            );
        }
        // TODO
        // else if ('embed' === button.type) {
        //     let pager = DIV();
        //     addClass(pager, 'wc-button-pager');
        //     pager.attachPage = function (page) {
        //         this.appendChild(page);
        //         this.wcPage = page;
        //     };
        //     buttonElement.addEventListener(
        //         'click',
        //         pagerHandler(buttonElement, pager, spec.command)
        //     );
        //     buttonWrapper.appendChild(pager);
        // }

        return buttonWrapper;
    }


export const makeGroup: (a: string, b: ButtonGroup) => Element =
    (label, group) => {
        const element = DIV();
        addClass(element, `wc-group-${label}`);
        return (
            group
                .map(makeButton)
                .reduce((elem, button) => {
                    elem.appendChild(button);
                    return elem;
                }, element)

        );
    }

