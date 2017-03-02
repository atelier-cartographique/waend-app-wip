/*
 * app/lib/commands/drawRegion.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

import _ from 'lodash';

import Promise from 'bluebird';
import Geometry from '../../Geometry';
import paper from '../../../vendors/paper';
import debug from 'debug';
const logger = debug('waend:command:drawRegion');

function setupCanvas (container) {
    logger(container.getAttribute('id'));
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.backgroundColor = 'transparent';
    container.appendChild(canvas);
    paper.setup(canvas);
    paper.view.draw();
}

function drawLine () {
    const self = this;
    const shell = self.shell;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const display = terminal.display();

    setupCanvas(display.node);

    const resolver = (resolve, reject) => {
        let path;
        const points =[];
        const tool = new paper.Tool();

        const onMouseDown = event => {
            path = new paper.Path({
                segments: [event.point],
                strokeColor: 'black',
                fullySelected: true
            });
        };

        const onMouseDrag = event => {
            path.add(event.point);
        };

        const onMouseUp = event => {
            const segmentCount = path.segments.length;
            logger(path);
            let polyLineOrGon; // TODO populate
            if (path.closed) {
                logger('errr not implemted');
            }
            else {
                polyLineOrGon = new Geometry.LineString([]);
                const segments = path.segments;

                for (const s of segments) {
                    const pixel = [s.point.x, s.point.y];
                    polyLineOrGon.appendCoordinate(map.getCoordinateFromPixel(pixel));
                }
            }

            tool.off('mousedown', onMouseDown);
            tool.off('mousedrag', onMouseDrag);
            tool.off('mouseup', onMouseUp);
            tool.remove();
            paper.project.remove();
            display.end();
            resolve(polyLineOrGon);
        };

        tool.on('mousedown', onMouseDown);
        tool.on('mousedrag', onMouseDrag);
        tool.on('mouseup', onMouseUp);
    };

    return (new Promise(resolver));
}


export default   {
    name: 'line',
    command: drawLine
};
