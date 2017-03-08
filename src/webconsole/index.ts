/*
 * app/src/wmap.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



import config from '../config';
import { get as getBinder } from '../lib/Bind';
import { configure as configureSync } from '../lib/Sync';
import semaphore from '../lib/Semaphore';
import WebConsole from './WebConsole';
import LayerProvider from './LayerProvider';
import SourceProvider from './SourceProvider';
import WMap from './WaendMap';
import { configure as configureModels } from '../lib/Model';
import { configurator } from './ModelConfig';
import { IEventChangeContext, ContextIndex } from "../lib/waend";
import Env from '../lib/Env';


configureModels(configurator);


function init() {
    const elementWC = document.querySelector('#wc');
    const elementMap = document.querySelector('#map');
    if (elementWC && elementMap) {
        const wc = new WebConsole(elementWC, elementMap);
        const layer = new LayerProvider();
        const source = new SourceProvider();
        const wmap = new WMap({ 'root': elementMap });

        Env.set('map', wmap);
        wc.start();

        if (window.waendUser) {
            getBinder()
                .getMe()
                .then(user => {
                    wc.shell.loginUser(user);
                });
        }
        else {
            semaphore.signal<IEventChangeContext>('shell:change:context', {
                index: ContextIndex.SHELL,
                path: [],
            });
        }

        configureSync(config.notify);
    }
}

document.onreadystatechange = () => {
    if ('interactive' === document.readyState) {
        init();
    }
};
