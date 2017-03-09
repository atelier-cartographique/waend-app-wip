/*
 * src/webconsole/index.ts
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



import config from '../config';
import { get as getBinder } from '../lib/Bind';
import { configure as initSync } from '../lib/Sync';
import { Console } from './Console';
import map from '../map';
import Env from '../lib/Env';
import { initHistory } from "./WebHistory";



function init() {
    const elementWC = document.querySelector('#wc');
    const elementMap = document.querySelector('#map');
    if (elementWC && elementMap) {
        const wcons = Console();
        const wmap = map(elementMap);

        Env.set('map', wmap);

        const shell = wcons.start();

        const historyPopContext: (a: PopStateEvent) => void =
            (event) => {
                if (event.state) {
                    shell.switchContext(event.state);
                }
            };

        getBinder()
            .getMe()
            .then(user => { shell.loginUser(user); })
            .catch(() => 0);


        initSync(config.notifyUrl);
        shell.switchContext(initHistory('/map/', historyPopContext));
    }
}

document.onreadystatechange = () => {
    if ('interactive' === document.readyState) {
        init();
    }
};
