import * as _ from 'lodash';


// events

export const isKeyCode =
    (kc: KeyCode) => (event: KeyboardEvent) => {
        return kc === event.which || kc === event.keyCode;
    }

export enum KeyCode {
    BACKSPACE = 8,
    TAB = 9,
    ENTER = 13,
    SHIFT = 16,
    CTRL = 17,
    ALT = 18,
    PAUSE = 19,
    CAPS_LOCK = 20,
    ESCAPE = 27,
    SPACE = 32,
    PAGE_UP = 33,
    PAGE_DOWN = 34,
    END = 35,
    HOME = 36,
    LEFT_ARROW = 37,
    UP_ARROW = 38,
    RIGHT_ARROW = 39,
    DOWN_ARROW = 40,
    INSERT = 45,
    DELETE = 46,
    KEY_0 = 48,
    KEY_1 = 49,
    KEY_2 = 50,
    KEY_3 = 51,
    KEY_4 = 52,
    KEY_5 = 53,
    KEY_6 = 54,
    KEY_7 = 55,
    KEY_8 = 56,
    KEY_9 = 57,
    KEY_A = 65,
    KEY_B = 66,
    KEY_C = 67,
    KEY_D = 68,
    KEY_E = 69,
    KEY_F = 70,
    KEY_G = 71,
    KEY_H = 72,
    KEY_I = 73,
    KEY_J = 74,
    KEY_K = 75,
    KEY_L = 76,
    KEY_M = 77,
    KEY_N = 78,
    KEY_O = 79,
    KEY_P = 80,
    KEY_Q = 81,
    KEY_R = 82,
    KEY_S = 83,
    KEY_T = 84,
    KEY_U = 85,
    KEY_V = 86,
    KEY_W = 87,
    KEY_X = 88,
    KEY_Y = 89,
    KEY_Z = 90,
    LEFT_META = 91,
    RIGHT_META = 92,
    SELECT = 93,
    NUMPAD_0 = 96,
    NUMPAD_1 = 97,
    NUMPAD_2 = 98,
    NUMPAD_3 = 99,
    NUMPAD_4 = 100,
    NUMPAD_5 = 101,
    NUMPAD_6 = 102,
    NUMPAD_7 = 103,
    NUMPAD_8 = 104,
    NUMPAD_9 = 105,
    MULTIPLY = 106,
    ADD = 107,
    SUBTRACT = 109,
    DECIMAL = 110,
    DIVIDE = 111,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123,
    NUM_LOCK = 144,
    SCROLL_LOCK = 145,
    SEMICOLON = 186,
    EQUALS = 187,
    COMMA = 188,
    DASH = 189,
    PERIOD = 190,
    FORWARD_SLASH = 191,
    GRAVE_ACCENT = 192,
    OPEN_BRACKET = 219,
    BACK_SLASH = 220,
    CLOSE_BRACKET = 221,
    SINGLE_QUOTE = 222
}

// DOM

export const createElement = <T extends HTMLElement>(tagName: string): T => {
    return <T>(document.createElement(tagName));
}

export const DIV = () => {
    return createElement<HTMLDivElement>('div');
}
export const SPAN = () => {
    return createElement<HTMLSpanElement>('span');
}
export const A = () => {
    return createElement<HTMLAnchorElement>('a');
}
export const INPUT = () => {
    return createElement<HTMLInputElement>('input');
}
export const TEXTAREA = () => {
    return createElement<HTMLTextAreaElement>('textarea');
}
export const CANVAS = () => {
    return createElement<HTMLCanvasElement>('canvas');
}
export const IMG = () => {
    return createElement<HTMLImageElement>('img');
}
export const LABEL = () => {
    return createElement<HTMLLabelElement>('label');
}

export const appendText = (text: string) => (node: Element) => {
    return node.appendChild(document.createTextNode(text));
}

export function setAttributes(elem: Element, attrs: any) {
    Object.keys(attrs)
        .forEach((k) => {
            elem.setAttribute(k, attrs[k]);
        });
    return elem;
}

export function addClass(elem: Element, c: string) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    ec.push(c);
    elem.setAttribute('class', _.uniq(ec).join(' '));
}

export function toggleClass(elem: Element, c: string) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    if (_.indexOf(ec, c) < 0) {
        exports.addClass(elem, c);
    }
    else {
        exports.removeClass(elem, c);
    }
}

export function hasClass(elem: Element, c: string) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    return !(_.indexOf(ec, c) < 0)
}

export function removeClass(elem: Element, c: string) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    elem.setAttribute('class', _.without(ec, c).join(' '));
}

export function emptyElement(elem: Element) {
    while (elem.firstChild) {
        exports.removeElement(elem.firstChild);
    }
    return elem;
}

export function removeElement(elem: Element, keepChildren = false) {
    if (!keepChildren) {
        exports.emptyElement(elem);
    }
    const parent = elem.parentNode;
    const evt = document.createEvent('CustomEvent');
    if (parent) {
        parent.removeChild(elem);
    }
    evt.initCustomEvent('remove', false, false, null);
    elem.dispatchEvent(evt);
    return elem;
}

export function px(val = 0) {
    return `${val.toString()}px`;
}


// DOM+

export function makeButton(label: string, attrs: any, callback: (a: MouseEvent) => void) {
    const button = DIV();
    const labelElement = SPAN();
    exports.addClass(labelElement, 'label');
    labelElement.innerHTML = label;

    exports.setAttributes(button, attrs);

    if (callback) {
        button.addEventListener('click', event => {
            callback(event);
        }, false);
    }

    button.appendChild(labelElement);
    return button;
}

export function makeInput(options: any, callback: (a: string | number) => void) {
    const inputElement = INPUT();
    const labelElement = LABEL();
    const wrapper = DIV();
    const type = options.type;

    exports.setAttributes(wrapper, options.attrs || {});

    labelElement.innerHTML = options.label;
    inputElement.setAttribute('type', type);
    inputElement.value = options.value;
    if (callback) {
        inputElement.addEventListener('change',
            () => {
                const val = inputElement.value;
                if ('number' === type) {
                    callback(Number(val));
                }
                else {
                    callback(val);
                }
            }, false);
    }

    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

export function eventPreventer(elem: Element, events: string[]) {
    _.each(events, eventName => {
        elem.addEventListener(eventName, e => {
            // e.preventDefault();
            e.stopPropagation();
        }, false);
    });
}
