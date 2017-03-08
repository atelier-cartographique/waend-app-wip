/*
 * app/src/View.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


import * as _ from 'lodash';
import { InterfaceProjection } from 'proj4';
import semaphore from '../lib/Semaphore';
import Transform from '../lib/Transform';
import region from '../lib/Region';
import { Extent } from "../lib/Geometry";
import Navigator from './Navigator';
import WaendMap from './WaendMap';
import Source from './Source';
import { Feature } from '../lib/Model';


const document = window.document;

export interface ViewOptions {
    root: Element;
    map: WaendMap;
    extent: Extent
}

export interface Context extends CanvasRenderingContext2D {
    id: string;
}

export default class View {

    private canvas: HTMLCanvasElement[];
    private contexts: Context[];
    private extent: Extent;
    private sources: Source[];
    private map: WaendMap;
    private root: Element;
    readonly navigator: Navigator;
    readonly transform: Transform;
    size: { width: number; height: number; };



    constructor(options: ViewOptions) {
        this.root = options.root;
        this.map = options.map;
        this.extent = options.extent;
        this.transform = new Transform();
        this.sources = [];
        this.canvas = [];
        this.contexts = [];
        this.resize();

        this.navigator = new Navigator({
            'container': this.root,
            'map': this.map,
            'view': this
        });

        window.addEventListener('resize', () => this.resize());
        semaphore.on('map:resize', () => this.resize());

    }

    resize() {
        const rect = this.getRect();
        this.size = {
            width: rect.width,
            height: rect.height
        };
        this.setTransform();

        for (const canvas of this.canvas) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        if (this.navigator) {
            this.navigator.resize();
        }

        semaphore.signal('please:map:render');
        semaphore.signal<View>('view:resize', this);
    }

    getRect() {
        return this.root.getBoundingClientRect();
    }

    translate(dx: number, dy: number) {
        this.transform.translate(dx, dy);
        return this;
    }

    scale(sx: number, sy: number) {
        this.transform.translate(sx, sy);
        return this;
    }

    setExtent(extent: Extent) {
        const rect = this.getRect();
        const sx = rect.width / Math.abs(extent.getWidth());
        const sy = rect.height / Math.abs(extent.getHeight());
        const s = (sx < sy) ? sx : sy;
        const center = extent.getCenter().getCoordinates();
        const aExtent = extent.getArray();
        if (sx < sy) {
            // adjust extent height
            const newHeight = rect.height * (1 / s);

            const adjH = newHeight / 2;
            aExtent[1] = center[1] - adjH;
            aExtent[3] = center[1] + adjH;
        }
        else {
            // adjust extent width
            const newWidth = rect.width * (1 / s);

            const adjW = newWidth / 2;
            aExtent[0] = center[0] - adjW;
            aExtent[2] = center[0] + adjW;
        }
        this.extent = new Extent(aExtent);
        this.setTransform();
        semaphore.signal('view:change', this);
    }

    setTransform() {
        const extent = this.extent;
        const rect = this.getRect();
        const targetCenter = [rect.width / 2, rect.height / 2];
        const sourceCenter = extent.getCenter().getCoordinates();
        const sx = rect.width / Math.abs(extent.getWidth());
        const sy = rect.height / Math.abs(extent.getHeight());
        const s = (sx < sy) ? sx : sy;
        const trX = (targetCenter[0] - sourceCenter[0]) * s;
        const trY = (targetCenter[1] - sourceCenter[1]) * s;
        const axis = [targetCenter[0], targetCenter[1]];

        const t = new Transform();
        t.translate(trX, -trY);
        t.scale(s, -s, axis);
        this.transform.reset(t);
    }

    getGeoExtent(projection: InterfaceProjection) {
        const pWorld = region.getWorldExtent().getCoordinates();
        const minPWorld = projection.forward([pWorld[0], pWorld[1]]);
        const maxPWorld = projection.forward([pWorld[2], pWorld[3]]);
        const pExtent = this.extent.bound(minPWorld.concat(maxPWorld));
        const projectedMin = pExtent.getBottomLeft().getCoordinates();
        const projectedMax = pExtent.getTopRight().getCoordinates();
        const min = projection.inverse(projectedMin);
        const max = projection.inverse(projectedMax);
        return min.concat(max);
    }

    getProjectedPointOnView(x: number, y: number) {
        const v = [x, y];
        const inv = this.transform.inverse();
        return inv.mapVec2(v);
    }

    getViewPointProjected(x: number, y: number) {
        const v = [x, y];
        return this.transform.mapVec2(v);
    }

    getLayer(layerId: string) {
        const idx = _.findIndex(this.sources, source => layerId === source.id);
        if (idx < 0) {
            return null;
        }
        return this.sources[idx];
    }

    getCanvas(layerId: string) {
        const idx = _.findIndex(this.canvas, cvns => layerId === cvns.id);
        if (idx < 0) {
            return null;
        }
        return this.canvas[idx];
    }

    getContext(layerId: string) {
        const idx = _.findIndex(this.contexts, ctx => layerId === ctx.id);
        if (idx < 0) {
            return null;
        }
        return this.contexts[idx];
    }

    getFeatures(extent?: Extent | number[] | rbush.BBox) {
        return (
            this.sources.reduce<Feature[]>(
                (acc, s) => acc.concat(s.getFeatures(extent)), [])
        );
    }

    createCanvas(layerId: string) {
        const canvas = document.createElement('canvas');
        const rect = this.getRect();

        canvas.id = layerId;
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = (-this.canvas.length).toString();
        this.canvas.push(canvas);
        this.root.insertBefore(canvas, this.navigator.getNode());
        return canvas;
    }

    createContext(layerId: string, canvas: HTMLCanvasElement) {
        const ctx = <Context>canvas.getContext('2d');
        ctx.id = layerId;
        // here should go some sort of init.

        this.contexts.push(ctx);
        return (this.contexts.length - 1);
    }

    addSource(source: Source) {
        if (!this.navigator.isStarted) {
            this.navigator.start();
        }
        if (!!(this.getLayer(source.id))) {
            return this;
        }
        const canvas = this.createCanvas(source.id);
        this.createContext(source.id, canvas);
        this.sources.push(source);
        return this;
    }

    removeSource(source: Source) {
        if (!!(this.getLayer(source.id))) {
            this.sources = _.reject(this.sources, l => l.id === source.id);
            this.contexts = _.reject(this.contexts, c => c.id === source.id);

            const canvasElement = document.getElementById(source.id);
            if (canvasElement) {
                this.root.removeChild(canvasElement);
            }
            this.canvas = _.reject(this.canvas, c => c.id === source.id);
        }
        return this;
    }

    reorderLayers(ids: string[]) {
        const ll = this.sources.length;

        this.canvas.forEach(cnvs => {
            cnvs.style.zIndex = (-ll).toString();
        });

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const cnvs = this.getCanvas(id);
            if (cnvs) {
                cnvs.style.zIndex = (-i).toString();
            }
        }

    }

    forEachImage(fn: (a: ImageData) => void) {
        const rect = this.getRect();

        for (const source of this.contexts) {
            const img = source.getImageData(0, 0, rect.width, rect.height);
            // context.putImageData(img, 0, 0);
            fn(img);
        }
    }
}

