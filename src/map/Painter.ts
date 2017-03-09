/*
 * app/src/Painter.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import { Extent } from '../lib/Geometry';
import semaphore from '../lib/Semaphore';
import ImageLoader from './Image';
import View, { Context } from './View';
import Transform from '../lib/Transform';
import { CoordLinestring, CoordPolygon, ContextValue, PolygonEnds, DrawingInstruction, PainterCommand, ImageOptions } from '../lib/waend';
import { CANVAS } from "../lib/util/dom";


interface TextureRecord {
    canvas: HTMLCanvasElement,
    context: Context;
}


class Painter {
    protected hasContext = false;
    private imagesLoading: ImageLoader[];
    private stateInc: number;
    private transform: Transform;
    private restoreContext: () => void;
    private textures: { [id: string]: TextureRecord };
    context: Context;

    constructor(private view: View, layerId: string) {
        const baseContext = view.getContext(layerId);
        if (baseContext) {
            this.hasContext = true;
            let currentContext: Context = baseContext;

            Object.defineProperty(this, 'context', {
                get() {
                    return currentContext;
                },

                set(ctx) {
                    currentContext = ctx;
                }
            });

            this.restoreContext = () => {
                currentContext = baseContext;
            };

            this.transform = view.transform.clone();
            semaphore.on('view:change', this.resetTransform.bind(this));
            this.stateInc = 0;
            this.imagesLoading = [];
            this.clear();
        }

    }

    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
        this.context.setTransform(a, b, c, d, e, f);
    }

    resetTransform() {
        // const ctx = this.context;
        const view = this.view;
        const T = view.transform;
        this.transform = T.clone();
    }


    clear() {
        while (this.stateInc > 0) {
            this.restore();
        }
        for (let i = 0; i < this.imagesLoading.length; i++) {
            this.imagesLoading[i].cancel();
        }
        this.imagesLoading = [];
        this.textures = {};
        this.resetTransform();
        this.context.clearRect(0, 0, this.view.size.width, this.view.size.height);
        this.context.globalCompositeOperation = 'multiply';
    }

    clearRect(extent: number[]) {
        const extObj = new Extent(extent);
        const tl = extObj.getBottomLeft().getCoordinates();
        this.context.clearRect(tl[0], tl[1],
            extObj.getWidth(), extObj.getHeight());
    }

    save() {
        this.context.save();
        this.stateInc += 1;
    }

    restore() {
        this.context.restore();
        this.stateInc -= 1;
    }

    // graphic state
    set(prop: string, value: ContextValue) {
        const ctx = this.context; // just to save keystrokes
        if ('lineDash' === prop) {
            this.context.setLineDash(<number[]>value);
        }
        else {
            switch (prop) {
                case 'fillStyle':
                    ctx.fillStyle = <string>value;
                    break;
                case 'font':
                    ctx.font = <string>value;
                    break;
                case 'globalAlpha':
                    ctx.globalAlpha = <number>value;
                    break;
                case 'globalCompositeOperation':
                    ctx.globalCompositeOperation = <string>value;
                    break;
                case 'imageSmoothingEnabled':
                    ctx.imageSmoothingEnabled = <boolean>value;
                    break;
                case 'lineCap':
                    ctx.lineCap = <string>value;
                    break;
                case 'lineDashOffset':
                    ctx.lineDashOffset = <number>value;
                    break;
                case 'lineJoin':
                    ctx.lineJoin = <string>value;
                    break;
                case 'lineWidth':
                    ctx.lineWidth = <number>value;
                    break;
                case 'miterLimit':
                    ctx.miterLimit = <number>value;
                    break;
                case 'msFillRule':
                    ctx.msFillRule = <string>value;
                    break;
                case 'shadowBlur':
                    ctx.shadowBlur = <number>value;
                    break;
                case 'shadowColor':
                    ctx.shadowColor = <string>value;
                    break;
                case 'shadowOffsetX':
                    ctx.shadowOffsetX = <number>value;
                    break;
                case 'shadowOffsetY':
                    ctx.shadowOffsetY = <number>value;
                    break;
                case 'strokeStyle':
                    ctx.strokeStyle = <string>value;
                    break;
                case 'textAlign':
                    ctx.textAlign = <string>value;
                    break;
                case 'textBaseline':
                    ctx.textBaseline = <string>value;
                    break;

                default:
                    break;
            }
        }

    }

    startTexture(tid: string) {
        const canvas = CANVAS();
        canvas.width = this.context.canvas.width;
        canvas.height = this.context.canvas.height;
        const ctx = <Context>canvas.getContext('2d');
        this.textures[tid] = {
            canvas,
            context: ctx
        };
        this.context = ctx;
    }

    endTexture() {
        this.restoreContext();
    }

    applyTexture(tid: string) {
        const canvas = this.textures[tid].canvas;
        this.context.drawImage(canvas, 0, 0);
    }

    drawPolygon(coordinates: CoordPolygon, ends = <PolygonEnds>['closePath', 'stroke']) {
        this.context.beginPath();

        for (const ring of coordinates) {
            for (let ii = 0; ii < ring.length; ii++) {
                const p = ring[ii];
                if (0 === ii) {
                    this.context.moveTo(p[0], p[1]);
                }
                else {
                    this.context.lineTo(p[0], p[1]);
                }
            }
        }

        for (let e = 0; e < ends.length; e++) {
            const end = ends[e];
            switch (end) {
                case 'closePath':
                    this.context.closePath();
                    break;
                case 'stroke':
                    this.context.stroke();
                    break;
                case 'fill':
                    this.context.fill();
                    break;
                case 'clip':
                    this.context.clip();
                    break;
                default:
                    break;
            }
        }
    }

    image(coordinates: CoordPolygon, extentArray: number[], options: ImageOptions) {
        const loader = new ImageLoader(this);
        this.imagesLoading.push(loader);
        loader.load(coordinates, extentArray, options);
    }

    drawLine(coordinates: CoordLinestring) {
        // logger('painter.line', coordinates[0]);
        this.context.beginPath();
        for (let i = 0; i < coordinates.length; i++) {
            const p = coordinates[i];
            if (0 === i) {
                this.context.moveTo(p[0], p[1]);
            }
            else {
                this.context.lineTo(p[0], p[1]);
            }
        }
        // this.context.closePath();
        this.context.stroke();
    }

    rawContext(method: string, ...args: number[]) {
        let p0;
        let p1;
        let p2;

        switch (method) {
            case 'beginPath':
                this.context.beginPath();
                break;
            case 'moveTo':
                this.context.moveTo(args[0], args[1]);
                break;
            case 'lineTo':
                this.context.lineTo(args[0], args[1]);
                break;
            case 'bezierCurveTo':
                p0 = [args[0], args[1]];
                p1 = [args[2], args[3]];
                p2 = [args[4], args[5]];
                this.context.bezierCurveTo(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
                break;
            case 'quadraticCurveTo':
                p0 = [args[0], args[1]];
                p1 = [args[2], args[3]];
                this.context.quadraticCurveTo(p0[0], p0[1], p1[0], p1[1]);
                break;
            case 'closePath':
                this.context.closePath();
                break;
            case 'stroke':
                this.context.stroke();
                break;
            case 'fill':
                this.context.fill();
                break;
        }
    }

    processInstructions(instructions: DrawingInstruction[]) {
        for (let i = 0; i < instructions.length; i++) {
            const row = instructions[i];
            const method: string = row[0];
            const args: number[] = [];
            for (let i = 1; i < row.length; i += 1) {
                args.push(<number>row[i]);
            }
            this.rawContext(method, ...args);
        }
    }

    processCommands(commands: PainterCommand[]) {
        commands.forEach((command) => {
            const commandName = command[0];
            const arg0 = command[1];
            const arg1 = command[2];
            const arg2 = command[3];
            const arg3 = command[4];
            const arg4 = command[5];
            const arg5 = command[6];


            switch (commandName) {
                case 'set':
                    this.set(<string>arg0, <ContextValue>arg1);
                    break;
                case 'image':
                    this.image(<CoordPolygon>arg0, <number[]>arg1, <ImageOptions>arg2);
                    break;
                case 'instructions':
                    this.processInstructions(<DrawingInstruction[]>arg0);
                    break;
                case 'save':
                    this.save();
                    break;
                case 'restore':
                    this.restore();
                    break;
                case 'transform':
                    this.setTransform(<number>arg0, <number>arg1, <number>arg2, <number>arg3, <number>arg4, <number>arg5);
                    break;
                case 'clear':
                    this.clear();
                    break;
                case 'clearRect':
                    this.clearRect(<number[]>arg0);
                    break;
                case 'startTexture':
                    this.startTexture(<string>arg0);
                    break;
                case 'endTexture':
                    this.endTexture();
                    break;
                case 'applyTexture':
                    this.applyTexture(<string>arg0);
                    break;
                case 'line':
                    this.drawLine(<CoordLinestring>arg0);
                    break;
                case 'polygon':
                    this.drawPolygon(<CoordPolygon>arg0, <PolygonEnds>arg1);
            }
        });
    }
}



export default Painter;
