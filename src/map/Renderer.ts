import * as _ from 'lodash';
import semaphore from '../lib/Semaphore';
import Region from '../lib/Region';
import W from './Worker';
import Painter from './Painter';
import { Proj3857 } from '../lib/util';
import Source from './Source';
import View from "./View";
import { InterfaceProjection } from "proj4";
import { Feature } from "../lib/Model";
import config from '../config';
import WaendWorker from './Worker';
import { EventRenderFrame, EventRenderInit, EventRenderUpdate } from './Worker';
import { PainterCommand } from "../lib/waend";


export interface RendererOptions {
    source: Source;
    view: View;
    projection: InterfaceProjection;
}



class CanvasRenderer {
    private worker: WaendWorker;
    private pendingUpdate: boolean;
    private isReady: boolean;
    readonly id: string;
    private painter: Painter;
    private visible: boolean;
    private proj: InterfaceProjection;
    private view: View;
    private source: Source;
    private features: { [propName: string]: Feature };
    private frameId: string;

    constructor(options: RendererOptions) {
        this.id = _.uniqueId();
        this.source = options.source;
        this.view = options.view;
        this.proj = options.projection;
        this.visible = true;
        this.painter = new Painter(this.view, this.source.id);
        this.initWorker();
        this.features = {};

        semaphore.on('map:update', this.render.bind(this));
    }

    setVisibility(v: boolean) {
        this.visible = v;
    }

    isVisible() {
        return this.visible;
    }

    getNewFrameId() {
        return (`${this.id}.${_.uniqueId()}`);
    }

    initWorker() {
        const layer = this.source.layer;
        this.worker = new W(layer.get('program', config.programUrl));
        this.worker.start();

        this.source.on('update',
            () => {
                const ack = _.uniqueId('ack.');
                this.worker.once(ack,
                    () => { this.render(); });

                this.worker.post({
                    name: EventRenderInit,
                    models: this.source.toJSON(),
                    ack
                });
            });

        this.source.on('update:feature',
            (feature: Feature) => {
                const ack = _.uniqueId('ack.');
                this.worker.once(ack,
                    () => { this.render(); });

                this.worker.post({
                    name: EventRenderUpdate,
                    models: this.source.toJSON([feature]),
                    ack
                });
            });


        const ack = _.uniqueId('ack.');
        this.worker.once(ack,
            () => {
                this.isReady = true;
                if (this.pendingUpdate) {
                    this.pendingUpdate = false;
                    this.render();
                }
            });

        this.worker.post({
            name: EventRenderInit,
            models: this.source.toJSON(),
            ack
        });

    }

    drawBackround() {
        const we = Region.getWorldExtent();
        const painter = this.painter;
        let tl = we.getTopLeft().getCoordinates();
        let tr = we.getTopRight().getCoordinates();
        let br = we.getBottomRight().getCoordinates();
        let bl = we.getBottomLeft().getCoordinates();
        const trans = this.view.transform.clone();

        tl = trans.mapVec2(Proj3857.forward(tl));
        tr = trans.mapVec2(Proj3857.forward(tr));
        br = trans.mapVec2(Proj3857.forward(br));
        bl = trans.mapVec2(Proj3857.forward(bl));

        const coordinates = [[tl, tr, br, bl]];

        painter.save();
        painter.set('strokeStyle', '#888');
        painter.set('lineWidth', '0.5');
        painter.set('fillStyle', '#FFF');
        painter.drawPolygon(coordinates, ['closePath', 'stroke', 'fill']);
        painter.restore();
    }

    dispatch(id: string, commands: PainterCommand[]) {
        if (id === this.frameId) {
            this.painter.processCommands(commands);
        }
    }

    render() {
        if (!this.isVisible()) {
            this.painter.clear();
            return;
        }
        if (!this.isReady) {
            this.pendingUpdate = true;
            return;
        }

        const worker = this.worker;
        const extent = this.view.getGeoExtent(this.proj);
        const transform = this.view.transform.flatMatrix();

        this.painter.clear();

        this.frameId = this.getNewFrameId();
        worker.post({
            name: EventRenderFrame,
            id: this.frameId,
            transform,
            extent,
        })
    }

    stop() {
        this.worker.stop();
    }
}


export default CanvasRenderer;
