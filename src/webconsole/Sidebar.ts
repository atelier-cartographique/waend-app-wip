

import buttonGroups, { Button, ButtonGroup } from './Buttons';
import { addClass, DIV, emptyElement, getDomForModel, removeClass } from "../lib/util/dom";
import semaphore from '../lib/Semaphore';
import { IEventChangeContext } from "../lib/waend";
import { get as getBinder } from '../lib/Bind';

export interface SidebarOptions {
    className: string;
}

type TitleFn = (a: Element) => void;

interface IGroup {
    node: Element;
    setTitle: TitleFn;
}

interface ISidebar {
    node: Element;
}

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


const makeGroup: (a: string, b: ButtonGroup) => IGroup =
    (label, group) => {
        const node = DIV();
        const title = DIV();

        addClass(node, `wc-group-${label}`);
        addClass(title, 'wc-group-title');

        group
            .map(makeButton)
            .reduce((elem, button) => {
                elem.appendChild(button);
                return elem;
            }, node);

        const setTitle: TitleFn =
            (elem) => {
                emptyElement(title);
                title.appendChild(elem);
            }

        return { node, setTitle };
    }


const makeContextLink: (a: number, b: string[]) => Element =
    (pidx, path) => {
        const id = path[pidx];
        const db = getBinder().db;
        const model = db.get(id);
        const fragment = getDomForModel(model, 'name', 'a', '');
        const ccCmd = `cc /${path.slice(0, pidx + 1).join('/')}`;

        fragment.addEventListener('click', () => {
            semaphore.signal('command:run', ccCmd);
        }, false);

        return fragment;
    };


const listenContext: (a: IGroup[]) => void =
    (groups) => {
        semaphore.observe<IEventChangeContext>('shell:change:context',
            (event) => {
                const { index, path } = event;

                for (let gi = 0; gi < (index + 1); gi++) {
                    const group = groups[gi];
                    addClass(group.node, 'wc-active');
                    removeClass(group.node, 'wc-current');

                    if (gi === index) {
                        addClass(group.node, 'wc-current');
                    }

                    if (gi > 0) {
                        group.setTitle(makeContextLink(gi - 1, path));
                    }
                }
            });
    };


export const Sidebar: (a: SidebarOptions) => ISidebar =
    (options) => {
        const node = DIV();
        addClass(node, options.className);

        const shell = makeGroup('shell', buttonGroups.shell);
        const user = makeGroup('user', buttonGroups.user);
        const group = makeGroup('group', buttonGroups.group);
        const layer = makeGroup('layer', buttonGroups.layer);
        const feature = makeGroup('feature', buttonGroups.feature);

        const groups = [shell, user, group, layer, feature];
        groups.forEach((g) => { node.appendChild(g.node); });
        listenContext(groups);

        return { node };
    }