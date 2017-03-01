/*
 * app/lib/Transport.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as querystring from 'querystring';
import * as EventEmitter from 'events';
import * as debug from 'debug';
const logger = debug('waend:Transport');


interface IHeaders {
    [propName: string]: string;
}

interface IParams {
    [propName: string]: string;
}

interface IResolve {
    (a: any): void;
}

interface IReject {
    (err: Error): void;
}

interface IResolver {
    (resolve: IResolve, reject: IReject): void;
}

interface IListeners {
    [propName: string]: EventListener;
}

type Verb = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ITransportOptions {
    verb: Verb;
    url: string;
    params: IParams;
    body: any;
    headers: IHeaders;
    listeners: IListeners,
    beforeSend?: (a: XMLHttpRequest) => void;
}




function transportXHR() {

    const mkListener: (a: XMLHttpRequest | XMLHttpRequestUpload, b: string, c: EventListener) => void =
        (emitter, eventName, cb) => {
            emitter.addEventListener(eventName, evt => {
                logger('XHR event', eventName);
                cb(evt);
            }, false);
        };


    const mkListeners: (a: XMLHttpRequest, b: IListeners) => void =
        (emitter, listeners) => {
            Object.keys(listeners).filter(k => !_.startsWith(k, 'upload:'))
                .forEach((k) => {
                    const li = listeners[k];
                    logger('XHR set event handler', k);
                    mkListener(emitter, k, li);
                });

            if (emitter.upload) {
                const uploadEmitter = emitter.upload;
                Object.keys(listeners)
                    .filter(k => _.startsWith(k, 'upload:'))
                    .map(k => k.split(':')[1])
                    .forEach((k) => {
                        const li = listeners[k];
                        logger('XHR.upload set event handler', k);
                        mkListener(uploadEmitter, k, li);
                    });
            }
        };


    const transport =
        (options: ITransportOptions) => {
            const xhr = new XMLHttpRequest();

            mkListeners(xhr, options.listeners);

            let url = options.url;
            if ('params' in options) {
                url += `?${querystring.stringify(options.params)}`;
            }
            xhr.open(options.verb, url, true);

            Object.keys(_.omit(options.headers || {}, 'Connection', 'Content-Length'))
                .forEach((hk) => {
                    try {
                        xhr.setRequestHeader(hk, options.headers[hk]);
                    }
                    catch (err) {
                        logger('transportXHR setHeader', err);
                    }

                });

            if (options.beforeSend) {
                options.beforeSend(xhr);
            }

            xhr.responseType = "json";
            xhr.send(options.body);
            return xhr;
        };

    return transport;
}

interface IBaseHandlers {
    errorhandler(e: Event): void;
    successHandler(e: Event): void;
}

const getBaseHandlers: (a: IResolve, b: IReject, c: any) => IBaseHandlers =
    (resolve, reject, options) => {
        const errorhandler = (e: Event) => {
            const xhr = <XMLHttpRequest>e.target;
            reject(new Error(xhr.statusText));
        };
        const successHandler = (e: Event) => {
            const xhr = <XMLHttpRequest>e.target;
            if (xhr.status >= 400) {
                return reject(new Error(xhr.statusText));
            }
            if (options.parse) {
                resolve(options.parse(xhr.response));
            }
            else {
                resolve(xhr.response);
            }
        };
        return { errorhandler, successHandler };
    };

class Transport extends EventEmitter {

    protected transport: (o: ITransportOptions) => void;

    constructor() {
        super();
        // TODO: support different transports
        this.transport = transportXHR();
    }

    get(url: string, getOptions: any) {
        const transport = this.transport;
        getOptions = getOptions || {};

        const resolver: IResolver =
            (resolve, reject) => {
                const {errorhandler, successHandler} = getBaseHandlers(resolve, reject, getOptions);

                const options: ITransportOptions = {
                    listeners: {
                        error: errorhandler,
                        abort: errorhandler,
                        timeout: errorhandler,
                        load: successHandler,
                    },
                    headers: _.extend({}, getOptions.headers),
                    params: getOptions.params,
                    verb: 'GET',
                    url: url,
                    body: null
                };

                transport(options);
            };

        return new Promise(resolver);
    }

    _write(verb: Verb, url: string, postOptions: any) {
        const transport = this.transport;
        postOptions = postOptions || {};

        const resolver: IResolver =
            (resolve, reject) => {
                const {errorhandler, successHandler} = getBaseHandlers(resolve, reject, postOptions);

                const progressHandler: (a: ProgressEvent) => void =
                    (evt) => {
                        if (_.isFunction(postOptions.progress)) {
                            postOptions.progress(
                                evt.lengthComputable,
                                evt.loaded,
                                evt.total
                            );
                        }
                    };

                let body;
                if (postOptions.headers
                    && ('Content-Type' in postOptions.headers)) {
                    body = postOptions.body;
                }
                else {
                    body = ('toJSON' in postOptions.body) ? postOptions.body.toJSON() : JSON.stringify(postOptions.body);
                }
                //logger(body);
                const headers = _.defaults(_.extend({}, postOptions.headers), {
                    'Content-Type': 'application/json; charset="utf-8"',
                    'Content-Length': body.length
                });


                const options: ITransportOptions = {
                    listeners: {
                        error: errorhandler,
                        abort: errorhandler,
                        timeout: errorhandler,
                        load: successHandler,
                        'upload:progress': progressHandler
                    },
                    headers: headers,
                    params: postOptions.params,
                    verb: verb,
                    body: body,
                    url: url
                };

                transport(options);
            };

        return new Promise(resolver);
    }

    post(url: string, options: any) {
        return this._write('POST', url, options);
    }

    put(url: string, options: any) {
        return this._write('PUT', url, options);
    }

    del(url: string, delOptions: any) {
        const transport = this.transport;
        delOptions = delOptions || {};

        const resolver: IResolver =
            (resolve, reject) => {
                const {errorhandler, successHandler} = getBaseHandlers(resolve, reject, delOptions);

                const options: ITransportOptions = {
                    listeners: {
                        error: errorhandler,
                        abort: errorhandler,
                        timeout: errorhandler,
                        load: successHandler,
                    },
                    headers: _.extend({}, delOptions.headers),
                    params: delOptions.params,
                    verb: 'DELETE',
                    url: url,
                    body: null
                };

                transport(options);
            };

        return new Promise(resolver);
    }
}



export default Transport;
