import * as _ from 'lodash';


// events

export function isKeyCode(event: KeyboardEvent, kc: number) {
    return kc === event.which || kc === event.keyCode;
}

// DOM

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
    const button = document.createElement('div');
    const labelElement = document.createElement('span');
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
    const inputElement = document.createElement('input');
    const labelElement = document.createElement('label');
    const wrapper = document.createElement('div');
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
