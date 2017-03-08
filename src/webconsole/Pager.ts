

import { SpanPack, PackPage } from "../lib/waend";
import semaphore from '../lib/Semaphore';
import { addClass, DIV, SPAN, appendText } from "../lib/util/dom";
import { asElement } from "./Command";

export interface PagerOptions {
    className: string;
}

type WriteFn = (a: SpanPack) => void;

interface IPager {
    node: Element;
    write: WriteFn;
    newPage: () => IPage;
}

interface IPage {
    node: Element;
    write: WriteFn;
}


const makePage: () => IPage =
    () => {
        const node = DIV();
        const docker = SPAN();
        const packList: PackPage = [];

        appendText('<dock>')(docker);
        addClass(docker, 'wc-page-docker icon-docker');
        node.appendChild(docker);

        docker.addEventListener('click', () => {
            semaphore.signal('page:dock', packList);
        }, false);

        const write: WriteFn =
            (pack) => {
                packList.push(pack);
                const line = makeLine(pack);
                node.appendChild(line);
            }

        return { node, write };
    }


const makeLine: (a: SpanPack) => Element =
    (pack) => {
        const line = DIV();
        addClass(line, 'wc-line');

        return (
            pack.reduce((elem, span) => {
                const fragment = asElement(span);
                elem.appendChild(fragment);
                return elem;
            }, line)
        );
    }


export const Pager: (a: PagerOptions) => IPager =
    (options) => {
        const node = DIV();
        const pages: IPage[] = [];
        const pageIndex = -1;

        addClass(node, options.className);

        const currentPage: () => IPage =
            () => {
                if (pageIndex >= 0) {
                    return pages[pageIndex];
                }
                return newPage();
            }


        const newPage: () => IPage =
            () => {
                const page = makePage();
                pages.push(page);
                node.appendChild(page.node);
                return page;
            }


        const write: WriteFn =
            (pack) => {
                currentPage().write(pack);
            }

        return { node, write, newPage };
    };
