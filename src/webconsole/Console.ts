/*
 * app/src/WebConsole.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

import * as _ from 'lodash';
import Env from '../lib/Env';
import { get as getBinder } from '../lib/Bind';
import Terminal from '../lib/Terminal';
import semaphore from '../lib/Semaphore';
import Mutex from '../lib/Mutex';
import buttons from './Buttons';
import { Extent } from '../lib/Geometry';
import {
    addClass, removeClass, emptyElement,
    removeElement,
    px, eventPreventer, isKeyCode
} from '../lib/util/dom';

import { IEventChangeContext } from "../lib/waend";
import InputHistory from "./WebHistory";
import WaendMap from "./WaendMap";
import Loader from "./WebLoader";


type EventHandler = <T extends Event>(a: T) => void;

const document = window.document;




class WebConsole extends Terminal {
    loader: Loader;
    container: HTMLDivElement;
    private inputField: HTMLInputElement;
    private onDisplay: boolean;
    private history: InputHistory;
    private commandMutex: Mutex;

    constructor(private root: Element, private mapContainer: Element) {
        super();
        this.commandMutex = new Mutex();
    }

    /*
    At the moment, the console is on top of everything
    except when asked for a fullscreen display. It means
    that the map is not receiving mouse events. We'll
    try to work this around by forwarding such events.
    It's not beautiful, well, near ugliness, but as long
    as it works, I'm OK.
    */
    forwardMouseEvents() {
        const root = this.root;
        const map = Env.get<WaendMap>('map');
        if (map) {
            const view = map.getView();
            const navigator = view.navigator;
            const node = navigator.getNode();
            const events = navigator.events;
            const forward =
                <T extends Event>(event: T): void => {
                    if (!this.onDisplay && (event.target === root)) {
                        if (event instanceof MouseEvent) {
                            const extent = new Extent(node.getBoundingClientRect());
                            if (extent.intersects([event.clientX, event.clientY])) {
                                navigator.dispatcher(event);
                            }
                        }
                        else {
                            navigator.dispatcher(event);
                        }
                    }
                };

            events.forEach((e) => {
                root.addEventListener(e, forward, false);
            });
        }
    }


    setButtons() {
        const map = Env.get<WaendMap>('map');
        if (map) {
            const view = map.getView();
            const navigator = view.navigator;
            const eventsToFilter = _.without(navigator.events, 'click');

            const cmdHandler = (cmds) => ev => {
                ev.stopPropagation();
                for (let i = 0; i < cmds.length; i++) {
                    this.runCommand(cmds[i]);
                }
            };

            const displayHandler = cmdHandler;

            let currentPager = null;
            const pagerHandler = (button, pager, cmds) => {

                const closePager_ = pager_ => {
                    emptyElement(pager_);
                    removeClass(pager_, 'wc-active');
                    addClass(pager_, 'wc-inactive');
                };

                const closePager = ev => {
                    ev.stopPropagation();
                    closePager_(pager);
                };

                const dockPage = ev => {
                    ev.stopPropagation();
                    const page = pager.wcPage;
                    if (page) {
                        self.dock.addPage(page);
                    }
                    closePager(ev);
                };

                return (ev => {
                    ev.stopPropagation();
                    if (currentPager) {
                        closePager_(currentPager);
                    }
                    // emptyElement(pager);
                    currentPager = pager;
                    removeClass(pager, 'wc-inactive');
                    addClass(pager, 'wc-active');
                    const pagerBtns = DIV();
                    const closeBtn = SPAN();
                    const dockBtn = SPAN();
                    pagerBtns.className = 'pager-actions';
                    dockBtn.className = 'pager-action-dock icon-docker';
                    dockBtn.innerHTML = 'dock it';
                    closeBtn.className = 'pager-action-close icon-close';
                    closeBtn.innerHTML = 'close';
                    dockBtn.addEventListener('click', dockPage, false);
                    closeBtn.addEventListener('click', closePager, false);
                    pagerBtns.appendChild(dockBtn);
                    pagerBtns.appendChild(closeBtn);
                    pager.appendChild(pagerBtns);

                    const rect = button.getBoundingClientRect();
                    pager.style.top = px(rect.top);
                    // pager.style.left = px(rect.right);
                    for (let i = 0; i < cmds.length; i++) {
                        self.runCommand(cmds[i], pager);
                    }
                });
            };

            self.buttonsContainer = DIV();
            addClass(self.buttonsContainer, 'wc-buttons wc-element');
            self.root.appendChild(self.buttonsContainer);

            const groupKeys = _.keys(buttons);
            const groups = {};

            for (const gn of groupKeys) {
                const buttonKeys = _.keys(buttons[gn]);
                const groupElement = DIV();
                const groupTitlewrapper = DIV();
                const groupTitlelabel = SPAN();
                const groupTitlevalue = SPAN();

                addClass(groupTitlewrapper, 'wc-buttons-group-title-wrapper');
                addClass(groupTitlelabel, 'wc-buttons-group-title-label');
                addClass(groupTitlevalue, 'wc-buttons-group-title-value');
                addClass(groupElement, 'wc-buttons-group wc-inactive');


                let grplabel = gn;
                let grpname = 'name to be added';
                if (gn == 'shell') {
                    var grplabel = 'wænd';
                    var grpname = '';
                }
                if (gn == 'group') {
                    grplabel = 'map';
                }



                groupTitlelabel.innerHTML = grplabel;
                groupTitlevalue.innerHTML = grpname;

                groupTitlewrapper.appendChild(groupTitlelabel);
                groupTitlewrapper.appendChild(groupTitlevalue);
                // groupElement.appendChild(document.createTextNode(gn));
                groupElement.appendChild(groupTitlewrapper);
                self.buttonsContainer.appendChild(groupElement);

                groups[gn] = {
                    container: groupElement,
                    title: groupTitlevalue
                };

                for (let bi = 0; bi < buttonKeys.length; bi++) {
                    const bn = buttonKeys[bi];
                    const spec = buttons[gn][bn];
                    const buttonElement = DIV();

                    addClass(buttonElement, 'wc-button');
                    eventPreventer(buttonElement, eventsToFilter);

                    if ('function' === spec.type) {
                        spec.command(self, buttonElement);
                        groupElement.appendChild(buttonElement);
                    }
                    else {
                        const bnNoSpace = bn.replace(/\s+/g, '');
                        const bnClass = bnNoSpace.toLowerCase();
                        const buttonWrapper = DIV();
                        let pager = null;

                        addClass(buttonWrapper, `button-wrapper ${bnClass}`);
                        addClass(buttonElement, `icon-${bnClass}`);
                        buttonElement.appendChild(document.createTextNode(bn));

                        if ('shell' === spec.type) {
                            buttonElement.addEventListener(
                                'click',
                                cmdHandler(spec.command)
                            );
                        }
                        else if ('display' === spec.type) {
                            buttonElement.addEventListener(
                                'click',
                                displayHandler(spec.command)
                            );
                        }
                        else if ('embed' === spec.type) {
                            pager = DIV();
                            addClass(pager, 'wc-button-pager');
                            pager.attachPage = function (page) {
                                this.appendChild(page);
                                this.wcPage = page;
                            };
                            buttonElement.addEventListener(
                                'click',
                                pagerHandler(buttonElement, pager, spec.command)
                            );
                        }

                        buttonWrapper.appendChild(buttonElement);
                        if (pager) {
                            buttonWrapper.appendChild(pager);
                        }
                        groupElement.appendChild(buttonWrapper);
                    }
                }
            }

            semaphore.observe<IEventChangeContext>('shell:change:context',
                (event) => {
                    const { index, path } = event;
                    const makeContextLink =
                        (pidx) => {
                            const id = path[pidx];
                            const db = getBinder().db;
                            let name;
                            if (db.has(id)) {
                                var model = db.get(id);
                                name = getModelName(model);
                            }
                            const ccCmd = `cc /${path.slice(0, pidx + 1).join('/')}`;
                            return self.makeCommand({
                                'args': [ccCmd, 'get'],
                                'text': name,
                                fragment: model.getDomFragment('name', 'a', {
                                    'href': '#',
                                    'title': ccCmd
                                })
                            });
                        };

                    for (let gi = 0; gi < (index + 1); gi++) {
                        const gn = groupKeys[gi];
                        const elem = groups[gn].container;
                        const title = groups[gn].title;

                        if (elem) {
                            let klass = `wc-buttons-${gn} wc-active`;
                            if (gi === index) {
                                klass += ' wc-current';
                            }
                            elem.setAttribute('class', klass);
                        }

                        if ((gi > 0) && title) {
                            const cmd = makeContextLink(gi - 1);
                            title.innerHTML = '';
                            title.appendChild(cmd.toDomFragment());
                        }
                    }
                });
        }
    }

    start() {
        // const map = this.shell.env.map;
        // const view = map.getView();
        // const navigator = view.navigator;
        // const node = navigator.getNode();
        // const eventsToFilter = _.without(navigator.events, 'click');

        // this.container = DIV();
        // this.pages = DIV();
        // this.pagesTitle = DIV();
        // this.dockContainer = DIV();

        // eventPreventer(this.container, eventsToFilter);
        // eventPreventer(this.dockContainer, eventsToFilter);
        // eventPreventer(this.pages, eventsToFilter);

        addClass(this.container, 'wc-container wc-element');
        addClass(this.pages, 'wc-pages wc-element');
        addClass(this.pagesTitle, 'wc-title');
        addClass(this.dockContainer, 'wc-dock wc-element');

        this.pages.appendChild(this.pagesTitle);

        this.root.appendChild(this.container);
        this.root.appendChild(this.pages);
        this.root.appendChild(this.dockContainer);

        this.dock = new Dock({
            container: this.dockContainer
        });

        this.insertInput();
        this.setButtons();
        // this.setMapBlock();
        this.history = new InputHistory();

        this.shell.stdout.on('data', (data) => this.write(data));
        this.shell.stderr.on('data', (data) => this.writeError(data));


        this.forwardMouseEvents();

        semaphore.observe<string>('terminal:run', (cmd) => this.runCommand(cmd));
        semaphore.observe<string>('start:loader', () => this.startLoader());
        semaphore.on('stop:loader', () => this.stopLoader());
    }


    runCommand(val: string, pager?: Element) {
        const self = this;
        const input = self.inputField;

        self.commandMutex
            .get()
            .then(unlock => {
                try {
                    addClass(input, 'wc-pending');
                    self.pageStart(val, pager);
                }
                catch (err) {
                    unlock();
                    throw err;
                }

                const shellExeced = self.shell.exec(val);
                const shellThened = shellExeced.then(() => {
                    self.history.push(val);
                    self.insertInput().focus();
                    unlock();
                });
                const shellCaught = shellThened.catch(err => {
                    self.writeError(err);
                    self.insertInput().focus();
                    unlock();
                });
            })
            .catch(err => {
                console.error('get mutex', err);
            });
    }



    write() {
        this.currentPage.appendChild(element);
    }

    makeCommand(options) {
        return (new WebCommand(this, options));
    }

    display(options = {}) {
        const display = new Display(this.root);
        const mc = this.mapContainer;
        const fullscreen = options.fullscreen;
        this.hide();
        if (fullscreen) {
            this.isFullscreen = true;
            addClass(mc, 'wc-fullscreen');
        }
        display.setFinalizer(function () {
            removeClass(mc, 'wc-fullscreen');
            this.show();
            if (fullscreen) {
                this.isFullscreen = false;
                semaphore.signal('map:resize');
            }
        }, this);
        if (fullscreen) {
            _.defer(() => {
                semaphore.signal('map:resize');
            });
        }
        return display;
    }

    hide() {
        this.onDisplay = true;
        addClass(this.container, 'wc-hide');
        addClass(this.pages, 'wc-hide');
        addClass(this.buttonsContainer, 'wc-hide');
        addClass(this.dockContainer, 'wc-hide');
    }

    show() {
        this.onDisplay = false;
        removeClass(this.container, 'wc-hide');
        removeClass(this.pages, 'wc-hide');
        removeClass(this.buttonsContainer, 'wc-hide');
        // removeClass(this.mapBlock, 'wc-hide');
        removeClass(this.dockContainer, 'wc-hide');
    }

    startLoader(text: string) {
        if (this.loader) {
            return null;
        }
        this.loader = new Loader(text);
        this.root.appendChild(this.loader.element);
        this.loader.start();
    }

    stopLoader() {
        if (this.loader) {
            this.loader.stop();
            removeElement(this.loader.element);
            this.loader = null;
        }
    }

}


export default WebConsole;
