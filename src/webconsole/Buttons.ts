/*
 * app/src/Buttons.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import semaphore from '../lib/Semaphore';

type CmdFn = (a: Element) => void;

export interface Button {
    label: string;
    type: 'display' | 'shell' | 'embed' | 'function';
    command?: string[];
    fn?: CmdFn;
}

export type ButtonGroup = Array<Button>;




const loginButton: CmdFn =
    (button) => {
        let isLogged = false;
        button.setAttribute('class', 'wc-button icon-login');
        button.innerHTML = 'Login';

        button.addEventListener('click', () => {
            if (!isLogged) {
                semaphore.signal('command:run', 'login');
            }
            else {
                semaphore.signal('command:run', 'logout');
            }
        });

        semaphore.on('user:login', () => {
            isLogged = true;
            button.innerHTML = 'Logout';
        });
        semaphore.on('user:logout', () => {
            isLogged = false;
            button.innerHTML = 'Login';
        });
    }


const shellButtons: ButtonGroup = [
    {
        label: 'Help',
        type: 'display',
        command: ['help']
    },
    {
        label: 'Login',
        type: 'function',
        fn: loginButton
    },
    {
        label: 'About',
        type: 'shell',
        command: ['cc /2232525b-a8cb-4579-af24-2b5629ba43b5/3a7f695b-cd37-43f4-9a7a-efb1e422aef8', 'view'],
    },
];


const userButtons: ButtonGroup = [
    {
        label: 'My profile',
        type: 'embed',
        command: ['cc /me', 'get']
    },
    {
        label: 'Add map',
        type: 'display',
        command: ['mkgroup']
    },
    {
        label: 'List maps',
        type: 'embed',
        command: ['lg']
    },
    {
        label: 'Upload image',
        type: 'display',
        command: ['media upload']
    },
    {
        label: 'Browse images',
        type: 'embed',
        command: ['media list']
    }
];

const groupButtons: ButtonGroup = [
    {
        label: 'Add layer',
        type: 'display',
        command: ['mklayer']
    },
    {
        label: 'List layers',
        type: 'embed',
        command: ['ll']
    },
    {
        label: 'Show - Hide layers',
        type: 'display',
        command: ['visible']
    },
    {
        label: 'Set map extent',
        type: 'shell',
        command: ['region get | set extent']
    },
    {
        label: 'Select Features',
        type: 'display',
        command: ['select']
    },
    {
        label: 'View mode',
        type: 'shell',
        command: ['view']
    }
];


const layerButtons: ButtonGroup = [
    {
        label: 'Style layer',
        type: 'embed',
        command: ['sl']
    },
    {
        label: 'Trace',
        type: 'display',
        command: ['trace | create | cc']
    },
    {
        label: 'Draw line',
        type: 'display',
        command: ['draw | create | cc']
    },
    {
        label: 'Draw zone',
        type: 'display',
        command: ['draw | close | create | cc']
    },
    {
        label: 'Import geo-datas',
        type: 'display',
        command: ['import', 'lf']
    },
    {
        label: 'List features',
        type: 'embed',
        command: ['lf']
    }
];

const featureButtons: ButtonGroup = [
    {
        label: 'Style feature',
        type: 'embed',
        command: ['sf']
    },
    {
        label: 'Set name',
        type: 'display',
        command: ['get name | edit | set name']
    },
    {
        label: 'Set image',
        type: 'display',
        command: ['media pick | set params.image']
    },
    {
        label: 'Set text',
        type: 'display',
        command: ['del params.image', 'get params.text | edit | set params.text']
    },
    {
        label: 'Edit shape',
        type: 'display',
        command: ['gg | trace | sg']
    },
    {
        label: 'Duplicate shape',
        type: 'shell',
        command: ['gg | create | cc']
    },
    {
        label: 'Zoom to feature',
        type: 'shell',
        command: ['gg | region set']
    },
    {
        label: 'Delete feature',
        type: 'shell',
        command: ['del_feature', 'lf']
    }

];


export default {
    'shell': shellButtons,
    'user': userButtons,
    'group': groupButtons,
    'layer': layerButtons,
    'feature': featureButtons,
};
