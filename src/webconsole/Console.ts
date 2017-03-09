/*
 * app/src/WebConsole.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import * as Promise from 'bluebird';

import Env from '../lib/Env';
import semaphore from '../lib/Semaphore';
import Mutex from '../lib/Mutex';

import { Pager } from "./Pager";
import { Input } from "./Input";
import { Sidebar } from "./Sidebar";
import { DIV, px } from "../lib/util/dom";
import { Shell } from "../lib/Shell";
import { SpanPack } from "../lib/waend";
import { Extent } from "../lib/Geometry";
import { EndFn, Display, IDisplay } from "./Display";


export interface IConsole {
    node: Element;
    start: () => void;
    display: () => IDisplay;
}


const startDisplay: (a: HTMLElement, b: Extent) => IDisplay =
    (root, rootExtent) => {
        const rootPositioning = root.style.position;
        const [left, top] = rootExtent.getBottomLeft().getCoordinates();
        const width = rootExtent.getWidth();
        const height = rootExtent.getHeight();

        const onShutdown: EndFn =
            () => {
                root.style.position = rootPositioning;
                root.style.transform = `translate(${px(width)}, 0)`;
                return Promise.resolve();
            }

        const display = Display(onShutdown);

        display.node.style.position = 'absolute';
        display.node.style.left = px(left);
        display.node.style.top = px(top);
        display.node.style.width = px(width);
        display.node.style.height = px(height);

        root.style.position = 'absolute';
        root.style.transform = `translate(-${px(width)}, 0)`;

        return display;
    };


export const Console: (a: Shell) => IConsole =
    (shell) => {
        const node = DIV();
        const pager = Pager({ className: 'wc-pager' });
        const input = Input({ className: 'wc-input' });
        const sidebar = Sidebar({ className: 'wc-sidebar' });

        node.appendChild(sidebar.node);
        node.appendChild(pager.node);
        node.appendChild(input.node);



        const mutx = new Mutex();

        const runCommand: (a: string) => void =
            (command) => {
                mutx.get()
                    .then((unlock) => {
                        input.disable();
                        shell.exec(command)
                            .finally(() => {
                                pager.newPage();
                                input.enable();
                                unlock();
                            });
                    })
                    .catch((err) => {
                        console.error('get mutex', err);
                    });
            };


        const start =
            () => {
                semaphore.observe<string>('command:run', runCommand);

                shell.stdout.on('data',
                    (data: SpanPack) => pager.write(data));
                shell.stderr.on('data',
                    (data: SpanPack) => pager.write(data));
            };


        const display =
            () => {
                const parent = node.parentElement;
                if (parent) {
                    const rect = parent.getBoundingClientRect();
                    const extent = new Extent(rect);
                    return startDisplay(node, extent);
                }
                throw (new Error('OrphanConsole'));
            }

        return { node, start, display };
    }


// class WebConsole extends Terminal {
//     loader: Loader;
//     container: HTMLDivElement;
//     private inputField: HTMLInputElement;
//     private onDisplay: boolean;
//     private history: InputHistory;
//     private commandMutex: Mutex;

//     constructor(private root: Element, private mapContainer: Element) {
//         super();
//         this.commandMutex = new Mutex();
//     }



//     start() {
//         // const map = this.shell.env.map;
//         // const view = map.getView();
//         // const navigator = view.navigator;
//         // const node = navigator.getNode();
//         // const eventsToFilter = _.without(navigator.events, 'click');

//         // this.container = DIV();
//         // this.pages = DIV();
//         // this.pagesTitle = DIV();
//         // this.dockContainer = DIV();

//         // eventPreventer(this.container, eventsToFilter);
//         // eventPreventer(this.dockContainer, eventsToFilter);
//         // eventPreventer(this.pages, eventsToFilter);

//         addClass(this.container, 'wc-container wc-element');
//         addClass(this.pages, 'wc-pages wc-element');
//         addClass(this.pagesTitle, 'wc-title');
//         addClass(this.dockContainer, 'wc-dock wc-element');

//         this.pages.appendChild(this.pagesTitle);

//         this.root.appendChild(this.container);
//         this.root.appendChild(this.pages);
//         this.root.appendChild(this.dockContainer);

//         this.dock = new Dock({
//             container: this.dockContainer
//         });

//         this.insertInput();
//         this.setButtons();
//         // this.setMapBlock();
//         this.history = new InputHistory();

//         this.shell.stdout.on('data', (data) => this.write(data));
//         this.shell.stderr.on('data', (data) => this.writeError(data));


//         this.forwardMouseEvents();

//         semaphore.observe<string>('terminal:run', (cmd) => this.runCommand(cmd));
//         semaphore.observe<string>('start:loader', () => this.startLoader());
//         semaphore.on('stop:loader', () => this.stopLoader());
//     }





//     write() {
//         this.currentPage.appendChild(element);
//     }

//     makeCommand(options) {
//         return (new WebCommand(this, options));
//     }

//     display(options = {}) {
//         const display = new Display(this.root);
//         const mc = this.mapContainer;
//         const fullscreen = options.fullscreen;
//         this.hide();
//         if (fullscreen) {
//             this.isFullscreen = true;
//             addClass(mc, 'wc-fullscreen');
//         }
//         display.setFinalizer(function () {
//             removeClass(mc, 'wc-fullscreen');
//             this.show();
//             if (fullscreen) {
//                 this.isFullscreen = false;
//                 semaphore.signal('map:resize');
//             }
//         }, this);
//         if (fullscreen) {
//             _.defer(() => {
//                 semaphore.signal('map:resize');
//             });
//         }
//         return display;
//     }

//     hide() {
//         this.onDisplay = true;
//         addClass(this.container, 'wc-hide');
//         addClass(this.pages, 'wc-hide');
//         addClass(this.buttonsContainer, 'wc-hide');
//         addClass(this.dockContainer, 'wc-hide');
//     }

//     show() {
//         this.onDisplay = false;
//         removeClass(this.container, 'wc-hide');
//         removeClass(this.pages, 'wc-hide');
//         removeClass(this.buttonsContainer, 'wc-hide');
//         // removeClass(this.mapBlock, 'wc-hide');
//         removeClass(this.dockContainer, 'wc-hide');
//     }

//     startLoader(text: string) {
//         if (this.loader) {
//             return null;
//         }
//         this.loader = new Loader(text);
//         this.root.appendChild(this.loader.element);
//         this.loader.start();
//     }

//     stopLoader() {
//         if (this.loader) {
//             this.loader.stop();
//             removeElement(this.loader.element);
//             this.loader = null;
//         }
//     }

// }


