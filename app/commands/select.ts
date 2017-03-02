/*
 * app/lib/commands/select.js
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
import Geometry from '../Geometry';
import Transform from '../Transform';
import region from '../Region';
import {getModelName} from '../helpers';
import turf from 'turf';
import {coordReduce} from 'turf-meta';
import debug from 'debug';
const logger = debug('waend:command:select');


function getMouseEventPos (ev, view) {
    if (ev instanceof MouseEvent) {
        const target = ev.target;
        const vrect = view.getRect();
        return [
            ev.clientX - vrect.left,
            ev.clientY - vrect.top
        ];
    }
    return [0, 0];
}


function minDistance (point, geom) {
    const d = coordReduce(geom, (memo, coord) => {
        const td = turf.distance(point, turf.point(coord));
        if (td < memo) {
            return td;
        }
        return memo;
    }, Number.MAX_VALUE);
    return d;
}

function select () {
    const self = this;
    const stdout = self.sys.stdout;
    const shell = self.shell;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const display = terminal.display();
    const rect = map.getView().getRect();
    const canvas = document.createElement('canvas');

    canvas.setAttribute('width', rect.width);
    canvas.setAttribute('height', rect.height);
    canvas.style.position = 'absolute';
    canvas.style.top = `${rect.top}px`;
    canvas.style.left = `${rect.left}px`;
    display.node.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const makeOutput = feature => terminal.makeCommand({
        fragment: feature.getDomFragment('name'),
        text: getModelName(feature),
        args: [
            `cc /${feature.getPath().join('/')}`,
            'gg | region set'
        ]
    });


    function toPixel (coordinates) {
        return map.getPixelFromCoordinate(coordinates);
    }

    function highlightFeature (f) {
        const extent = f.getExtent();
        let moved = false;
        ctx.beginPath();
        ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].forEach(corner => {
            const methodName = `get${corner}`;
            const method = extent[methodName];
            const point = method.call(extent);
            const coords = toPixel(point.getCoordinates());
            if (!moved) {
                ctx.moveTo(coords[0], coords[1]);
                moved = true;
            }
            else {
                ctx.lineTo(coords[0], coords[1]);
            }
        });
        ctx.closePath();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgb(0, 165, 255)';
        ctx.fillStyle = 'rgba(0, 165, 255, 0.05)';
        ctx.stroke();
        ctx.fill();

        const name = getModelName(f);
        const fs = 20;
        let [x, y] = toPixel(extent.getBottomLeft().getCoordinates());
        y += (fs * 1.2);
        ctx.fillStyle = 'rgb(0, 70, 110)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.font = `${fs}px "dauphine_regular"`;
        const ts = ctx.measureText(name);
        if (x < 0) {
            x = 0;
        }
        else if ((x + ts.width) > rect.width) {
            x -= (x + ts.width) - rect.width;
        }
        if (y > rect.height) {
            y = rect.height - 4;
        }
        ctx.strokeText(name, x, y);
        ctx.fillText(name, x, y);
    }

    const resolver = (resolve, reject) => {
        const innerSelect = event => {
            const pos = getMouseEventPos(event, map.getView());
            const clientPosMin = [pos[0] -1, pos[1] - 1];
            const clientPosMax = [pos[0] + 1, pos[1] + 1];
            const mapPosMin = map.getCoordinateFromPixel(clientPosMin);
            const mapPosMax = map.getCoordinateFromPixel(clientPosMax);
            const features = map.getFeatures(mapPosMin.concat(mapPosMax));
            display.end();
            if (features) {
                // // resolve(features[0]);
                // for (const f of features) {
                //     if (f) {
                //         stdout.write(makeOutput(f));
                //     }
                // }
                //
                // resolve(features);
                const pivot = turf.point(map.getCoordinateFromPixel(pos));
                let bestOption = [Number.MAX_VALUE, null];
                for (const f of features) {
                    if (f) {
                        // highlightFeature(f);
                        let md = minDistance(pivot, f.getGeometry().toGeoJSON());
                        if (md < bestOption[0]) {
                            bestOption = [md, f];
                        }
                    }
                }
                if (bestOption[1] !== null) {
                    stdout.write(makeOutput(bestOption[1]));
                }
                resolve(bestOption[1]);
            }
            else {
                reject('NothingSelected');
            }
        };

        const innerHighlight = event => {
            ctx.clearRect(0, 0, rect.width, rect.height);
            const pos = getMouseEventPos(event, map.getView());
            const clientPosMin = [pos[0] -1, pos[1] - 1];
            const clientPosMax = [pos[0] + 1, pos[1] + 1];
            const mapPosMin = map.getCoordinateFromPixel(clientPosMin);
            const mapPosMax = map.getCoordinateFromPixel(clientPosMax);
            const features = map.getFeatures(mapPosMin.concat(mapPosMax));

            if (features) {
                const pivot = turf.point(map.getCoordinateFromPixel(pos));
                let bestOption = [Number.MAX_VALUE, null];
                for (const f of features) {
                    if (f) {
                        // highlightFeature(f);
                        let md = minDistance(pivot, f.getGeometry().toGeoJSON());
                        if (md < bestOption[0]) {
                            bestOption = [md, f];
                        }
                    }
                }
                if (bestOption[1] !== null) {
                    highlightFeature(bestOption[1]);
                }
            }
        };

        display.node.addEventListener('mousemove', innerHighlight, true);
        display.node.addEventListener('click', innerSelect, true);
    };

    return (new Promise(resolver));
}


export default {
    name: 'select',
    command: select
};
