import { last, isArray } from 'lodash';
import semaphore from '../lib/Semaphore';
import { Extent, Geometry } from './Geometry';
import * as proj4 from 'proj4';
import * as EventEmitter from 'events';


const Proj3857 = proj4.Proj('EPSG:3857');

function fequals(a: number, b: number, p: number) {
    return (Math.abs(a - b) < p);
}

function compProjected(pt: number[], INC: number) {
    try {
        const r = Proj3857.forward(pt);
        const ir = Proj3857.inverse(r);
        return fequals(ir[1], pt[1], INC);
    }
    catch (err) {
        return false;
    }
}

function maxVert() {
    let pt = [0, 0];
    let r;
    let ir;
    const INC = 0.1;

    let ret = 90;
    for (let i = 80; i < 90; i += INC) {
        pt = [180, i];
        if (!compProjected(pt, INC)) {
            ret = i - INC;
            break;
        }
    }
    return ret;
}

const horizMax = 180;
const vertiMax = maxVert();


const WORLD_EXTENT = new Extent([-horizMax, -vertiMax, horizMax, vertiMax]);

class Region extends EventEmitter {
    private state: Array<Extent>

    constructor() {
        super();
        this.state = [WORLD_EXTENT.clone()];
        semaphore.on('region:push', this.push.bind(this));
    }

    getWorldExtent() {
        return WORLD_EXTENT.clone();
    }

    get() {
        return last(this.state).clone();
    }

    pop() {
        const extent = this.state.pop();
        this.emitChange(this.get());
        return this.get();
    }

    emitChange(extent: Extent) {
        semaphore.signal('region:change', extent, this);
    }

    pushExtent(extent: Extent) {
        this.state.push(extent.normalize());
        this.emitChange(extent);
    }

    push(e: any): boolean {
        let extent: Extent;
        if (e instanceof Extent) {
            extent = e.clone();
        }
        else if (e instanceof Geometry) {
            extent = e.getExtent();
        }
        else if (isArray(e)) { // we assume ol.extent type
            extent = new Extent(e);
        }
        else {
            return false;
        }

        this.pushExtent(extent);
        return true;
    }

};

const region = new Region();

export default region;