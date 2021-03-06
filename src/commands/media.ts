/*
 * app/lib/commands/media.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'lodash';
import Promise from 'bluebird';
import config from '../../config';
import Transport from '../Transport';
import debug from 'debug';
const logger = debug('waend:command:media');

const MEDIA_URL = config.public.mediaUrl;

function setupDropZone (container) {
    const dropbox = document.createElement('div');
    const dropboxLabel = document.createElement('div');
    dropbox.setAttribute('class', 'importer-dropzone');
    dropboxLabel.setAttribute('class', 'importer-dropzone-label');

    dropboxLabel.innerHTML = '<span>-UPLOAD MEDIAS-</span><br><span>Drag & drop your images here,</span><br><span>or select a file</span>';

    dropbox.appendChild(dropboxLabel);
    container.appendChild(dropbox);
    return dropbox;
}

function setupInput (container) {
    const input = document.createElement('input');
    const inputWrapper = document.createElement('div');
    inputWrapper.setAttribute('class', 'importer-input-wrapper');
    input.setAttribute('class', 'importer-input');
    input.setAttribute('type', 'file');
    input.setAttribute('multiple', '1');
    container.appendChild(input);
    return input;
}


function setupCancel (container) {
    const cancel = document.createElement('button');
    cancel.setAttribute('class', 'importer-cancel push-cancel');
    cancel.innerHTML = 'cancel';
    container.appendChild(cancel);
    return cancel;
}

function setupProgress (container) {
    const pg = document.createElement('div');
    pg.setAttribute('class', 'pg-container');
    container.appendChild(pg);
    return pg;
}

function setupHints (container) {
    const hints = document.createElement('div');
    hints.setAttribute('class', 'importer-hints');
    hints.innerHTML = [
        '<span class="hint">You can import multiple files at once</span><br><span class="hint">Many images formats are supported, just try !</span>'
    ].join(' ');
    container.appendChild(hints);
}


function listMedia () {
    const self = this;
    const stdout = self.sys.stdout;
    const shell = self.shell;
    const user = shell.user;
    const terminal = shell.terminal;
    const document = window.document;

    if (!user) {
        return self.endWithError('you are not logged in');
    }

    const resolver = (resolve, reject) => {
        const transport = new Transport();
        const success = data => {
            if('medias' in data) {
                for (const m of data.medias) {
                    const imageUrl = `${MEDIA_URL}/${user.id}/${m}/256`;
                    const wrapper = document.createElement('div');
                    const style = [
                        'width:140px;',
                        'height:140px;',
                        'background-position: center center;',
                        'background-size: contain;',
                        'background-repeat: no-repeat;',
                        `background-image:url("${imageUrl}")`
                    ];
                    wrapper.setAttribute('style', style.join(''));
                    wrapper.setAttribute('class', 'media-item');

                    const cmd0 = terminal.makeCommand({
                        'args' : [`media show ${m}`],
                        'fragment' : wrapper
                    });
                    // var cmd1 = terminal.makeCommand({
                    //     'args' : ['set image ' + user.id+'/'+m],
                    //     'text' : 'attach to current feature'
                    // });
                    stdout.write(cmd0);
                }

                resolve(data.medias);
            }
            else {
                reject(new Error('empty set'));
            }
        };
        const error = err => {
            console.error(err);
            reject(err);
        };
        transport
            .get(`${MEDIA_URL}/${user.id}`)
            .then(success)
            .catch(error);
    };

    return (new Promise(resolver));
}

function progress (length, name, options) {
    if (!options.progess) {
        const container = options.container;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        options.progress = document.createElement('div');
        options.progress.total = document.createElement('span');
        options.progress.counter = document.createElement('span');
        options.progress.mediaName = document.createElement('span');

        options.progress.setAttribute('class', 'media-progress');
        options.progress.total.setAttribute('class', 'media-total');
        options.progress.counter.setAttribute('class', 'media-counter');
        options.progress.mediaName.setAttribute('class', 'media-name');

        options.progress.mediaName.appendChild(
            document.createTextNode(`${name} : `)
        );
        options.progress.counter.innerHTML = '0';
        options.progress.total.innerHTML = ` / ${length}`;

        options.progress.appendChild(options.progress.mediaName);
        options.progress.appendChild(options.progress.counter);
        options.progress.appendChild(options.progress.total);
        container.appendChild(options.progress);
    }

}

function uploadMedia () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const display = terminal.display();
    const dropbox = setupDropZone(display.node);
    const input = setupInput(display.node);
    const cancel = setupCancel(display.node);
    const progressNode = setupProgress(display.node);

    const resolver = (resolve, reject) => {
        const dragenter = e => {
          e.stopPropagation();
          e.preventDefault();
        };

        const dragover = e => {
          e.stopPropagation();
          e.preventDefault();
        };

        const drop = e => {
          e.stopPropagation();
          e.preventDefault();

          const dt = e.dataTransfer;
          const files = dt.files;

          handleFiles(files);
        };

        var handleFiles = files => {
            const transport = new Transport();
            const files_array = [];
            for (let i = 0; i < files.length; i++) {
                // formData.append('media', files[i]);
                files_array.push(files[i]);
            }

            const progressHandler = (node, lock) => (lengthComputable, loaded, total) => {
                if (lock.o) {
                    if (lengthComputable) {
                        node.innerHTML = loaded.toString();
                    }
                    else {
                        node.innerHTML = '??';
                    }
                }
            };

            const single_uploader = item => {
                const pgOpts = {container: progressNode};
                const formData = new FormData();
                const lock = {o:true};

                progress(item.size, item.name, pgOpts);
                formData.append('media', item);
                logger('upload', item.name);
                return transport.post(MEDIA_URL, {
                    'headers' : {
                        'Content-Type': false //'multipart/form-data'
                    },
                    'body': formData,
                    'progress': progressHandler(pgOpts.progress.counter, lock),
                    'parse'() {
                        lock.o = false;
                        pgOpts.progress.counter.innerHTML = 'UPLOADED';
                        return item.name;
                    }
                });
            };

            Promise.each(files_array, single_uploader)
            .then(resolve)
            .catch(reject)
            .finally(() => {
                display.end();
            });
        };

        dropbox.addEventListener("dragenter", dragenter, false);
        dropbox.addEventListener("dragover", dragover, false);
        dropbox.addEventListener("drop", drop, false);

        // Select
        input.addEventListener('change', () => {
            ((() => {
                handleFiles(input.files, resolve, reject);
            }))();
        }, false);

        // Cancel
        cancel.addEventListener('click', () => {
            display.end();
            reject('Cancel');
        }, false);
    };

    setupHints(display.node);

    return (new Promise(resolver));
}


function showMedia (mediaName) {
    const self = this;
    const shell = self.shell;
    const user = shell.user;
    const terminal = shell.terminal;

    if (!user) {
        return self.endWithError('you are not logged in');
    }

    const display = terminal.display();
    const mediaId = `${user.id}/${mediaName}`;
    const mediaUrl = `${MEDIA_URL}/${mediaId}/1024`;
    const wrapper = document.createElement('div');
    const closer = document.createElement('div');

    wrapper.setAttribute('class', 'media-wrapper');
    wrapper.setAttribute('style', `background-image:url("${mediaUrl}");`);
    closer.setAttribute('class', 'media-close');
    closer.innerHTML = ' close ';

    wrapper.appendChild(closer);
    display.node.appendChild(wrapper);

    const resolver = (resolve, reject) => {
        const close = () => {
            display.end();
            resolve(mediaId);
        };
        closer.addEventListener('click', close, false);
    };

    return (new Promise(resolver));
}

function pickMedia () {
    const self = this;
    const shell = self.shell;
    const user = shell.user;
    const terminal = shell.terminal;

    if (!user) {
        return self.endWithError('you are not logged in');
    }

    const display = terminal.display();
    const wrapper = document.createElement('div');
    const title = document.createElement('div');
    const closer = document.createElement('div');

    wrapper.setAttribute('class', 'media-wrapper');
    wrapper.innerHTML = '<div class="picker-title">Media picker</div>';
    closer.setAttribute('class', 'media-close');
    closer.innerHTML = ' close ';

    wrapper.appendChild(closer);
    display.node.appendChild(wrapper);

    const resolver = (resolve, reject) => {

        const picker = mid => e => {
            display.end();
            resolve(mid);
        };

        const close = () => {
            display.end();
            reject('NothingPicked');
        };

        const success = data => {
            if('medias' in data) {
                for (const m of data.medias) {
                    const mid = `${user.id}/${m}`;
                    const imageUrl = `${MEDIA_URL}/${mid}/256`;
                    const pwrapper = document.createElement('div');
                    const style = [
                        'width:200px;',
                        'height:200px;',
                        'background-position: center center;',
                        'background-size: cover;',
                        'background-repeat: no-repeat;',
                        `background-image:url("${imageUrl}")`
                    ];
                    pwrapper.setAttribute('style', style.join(''));
                    pwrapper.setAttribute('class', 'media-item media-pick-item');
                    pwrapper.addEventListener('click', picker(mid), false);

                    wrapper.appendChild(pwrapper);
                }
            }
            else {
                reject(new Error('empty set'));
            }
        };

        const error = err => {
            console.error(err);
            reject(err);
        };

        const transport = new Transport();
        transport
            .get(`${MEDIA_URL}/${user.id}`)
            .then(success)
            .catch(error);

        closer.addEventListener('click', close, false);
    };
    return (new Promise(resolver));
}

function media () {
    const args = _.toArray(arguments);
    const action = args.shift();

    if('list' === action){
        return listMedia.apply(this, args);
    }
    else if('upload' === action){
        return uploadMedia.apply(this, args);
    }
    else if('show' === action){
        return showMedia.apply(this, args);
    }
    else if('pick' === action){
        return pickMedia.apply(this, args);
    }
    return this.endWithError('not a valid action');
}


export default {
    name: 'media',
    command: media
};
