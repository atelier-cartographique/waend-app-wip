
import * as url from 'url';
import semaphore from '../lib/Semaphore';
import { IEventChangeContext } from "../lib/waend";


type HistoryPopFn = (a: PopStateEvent) => void;
type HistoryPushFn = (a: IEventChangeContext) => void;

interface IUrl extends url.Url {
    fragment: string;
    comps: string[];
}


const getUrl: (a: string) => IUrl =
    (fragmentRoot) => {
        const purl = <IUrl>url.parse(window.location.href);
        const queryString = purl.query;

        if (queryString) {
            purl.query = {};
            const pairs = (<string>queryString).split('&');
            pairs.forEach((pair) => {
                const spair = pair.split('=');
                purl.query[spair[0]] = decodeURIComponent(spair[1]);
            });
        }

        // backbone based
        const trailingSlash = /\/$/;
        const routeStripper = /^[#\/]|\s+$/g;
        let fragment = purl.pathname || "";
        const root = fragmentRoot ? fragmentRoot.replace(trailingSlash, '') : "";
        if (!fragment.indexOf(root)) {
            fragment = fragment.substr(root.length);
        }
        fragment.replace(routeStripper, '');
        let path = fragment.split('/');
        while (path.length > 0 && 0 === path[0].length) {
            path = path.slice(1);
        }
        purl.fragment = fragment;
        purl.comps = path;

        return purl;
    };



export const initHistory: (a: string, b: HistoryPopFn) => string[] =
    (fragmentRoot, historyPopContext) => {
        const purl = getUrl(fragmentRoot);

        const historyPush: HistoryPushFn =
            (event) => {
                const { path } = event;
                window.history.pushState(
                    path,
                    '',
                    fragmentRoot + path.join('/')
                );
            };

        window.onpopstate = historyPopContext;

        let firstEvent = true;
        semaphore.observe<IEventChangeContext>(
            'shell:change:context', (event) => {
                if (firstEvent) {
                    firstEvent = false;
                }
                else {
                    historyPush(event);
                }
            });

        return purl.comps;
    };




