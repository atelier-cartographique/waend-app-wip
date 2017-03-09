
import * as Promise from 'bluebird';
import { uniqueId } from 'lodash';
import { addClass, DIV, removeElement } from "../lib/util/dom";


export interface IScreen {
    node: Element;
    shutdown: () => void;
}

export type EndFn = (a: Element) => Promise<void>;

export const Screen: (a: EndFn) => IScreen =
    (onShutdown) => {
        const id = uniqueId('wc-display-');
        const node = DIV();
        let isOn = true;

        addClass(node, 'wc-display');
        node.setAttribute('id', id);


        const shutdown =
            () => {
                if (isOn) {
                    isOn = false;
                    // here I wonder if a `finally` would do better
                    onShutdown(node)
                        .then(() => removeElement(node))
                        .catch(() => removeElement(node));
                }
            }

        return { node, shutdown };
    }