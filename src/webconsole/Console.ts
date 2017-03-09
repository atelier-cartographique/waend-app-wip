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

import { set as setenv } from '../lib/Env';
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
    start: () => Shell;
}

export type ScreenFn = () => IDisplay;

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


export const Console: () => IConsole =
    () => {
        const node = DIV();
        const pager = Pager({ className: 'wc-pager' });
        const input = Input({ className: 'wc-input' });
        const sidebar = Sidebar({ className: 'wc-sidebar' });

        node.appendChild(sidebar.node);
        node.appendChild(pager.node);
        node.appendChild(input.node);



        const mutx = new Mutex();

        const runCommand: (a: Shell) => (b: string) => void =
            (shell) => (command) => {
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


        const start =
            () => {
                const shell = new Shell();
                setenv<ScreenFn>('screen', display);

                semaphore.observe<string>('command:run', runCommand(shell));

                shell.stdout.on('data',
                    (data: SpanPack) => pager.write(data));
                shell.stderr.on('data',
                    (data: SpanPack) => pager.write(data));

                return shell;
            };



        return { node, start };
    }



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

