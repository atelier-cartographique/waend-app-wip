
import { Proj } from "proj4";
import { vec2 } from 'gl-matrix';
import { Extent } from '../Geometry';
import Transform from '../Transform';
import { Model, Feature, Layer } from "../Model";
import { get as getBinder } from '../Bind';
import { CoordPolygon, CoordLinestring } from "../waend";


export function getModelName(model: Model) {
    const name = model.get('name', null);
    if (name) {
        return JSON.stringify(name);
    }
    return `•${model.id.substr(0, 6)}`;
}


export function copy<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
}



export function pathKey(objOpt: any, pathOpt: string, def: any): any {
    const path = pathOpt.split('.');
    let obj: any = objOpt;
    for (let i = 0, len = path.length; i < len; i++) {
        if (!obj || (typeof obj !== 'object')) {
            return def;
        }
        const p = path[i];
        obj = obj[p];
    }
    if (obj === undefined) {
        return def;
    }
    return obj;
}


// GEOM

export function isZero(val: number) {
    return Math.abs(val) <= Number.EPSILON;
}


export function vecDist<T extends (vec2 | number[])>(v1: T, v2: T): number {
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    return Math.sqrt((dx * dx) + (dy * dy));
}


export function vecAdd<T extends (vec2 | number[])>(v1: T, v2: T, a: number): [number, number] {
    const t = a / vecDist(v1, v2);
    const rx = v1[0] + (v2[0] - v1[0]) * t;
    const ry = v1[1] + (v2[1] - v1[1]) * t;
    return [rx, ry];
}


export function vecEquals(v1: number[], v2: number[]) {
    return (exports.vecDist(v1, v2) < Number.EPSILON);
}


export function lineAngle<T extends (vec2 | number[])>(start: T, end: T): number {
    const d = [end[0] - start[0], end[1] - start[1]];
    const theta = Math.atan2(-d[1], d[0]) * 360.0 / 6.2831853071795;
    const theta_normalized = theta < 0 ? theta + 360 : theta;
    if (theta_normalized > 360) {
        return 0;
    }
    return theta_normalized;
}

export function transformExtent(extent: number[], T: Transform) {
    const min = extent.slice(0, 2);
    const max = extent.slice(2);
    T.mapVec2(vec2.clone(min));
    T.mapVec2(vec2.clone(max));
    return min.concat(max);
}


function floorVec2<T extends (vec2 | number[])>(v: T) {
    v[0] = Math.floor(v[0]);
    v[1] = Math.floor(v[1]);
    return v;
}


export const polygonTransform = (T: Transform, coordinates: CoordPolygon) => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = T.mapVec2(coordinates[i][ii]);
        }
    }
    return coordinates;
};


export const lineTransform = (T: Transform, coordinates: CoordLinestring) => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = T.mapVec2(coordinates[i]);
        // coordinates[i] = floorVec2(T.mapVec2(coordinates[i]));
    }
    return coordinates;
};


export const polygonFloor = (coordinates: CoordPolygon) => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = floorVec2(coordinates[i][ii]);
            // coordinates[i][ii] = floorVec2(T.mapVec2(coordinates[i][ii]));
        }
    }
    return coordinates;
};


export const lineFloor = (coordinates: CoordLinestring) => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = floorVec2(coordinates[i]);
        // coordinates[i] = floorVec2(T.mapVec2(coordinates[i]));
    }
    return coordinates;
};


// GEO

export const Proj3857 = Proj('EPSG:3857');

export function projectExtent(extent: number[], proj = Proj3857) {
    const min = proj.forward(extent.slice(0, 2));
    const max = proj.forward(extent.slice(2));
    return min.concat(max);
}

export function unprojectExtent(extent: number[], proj = Proj3857) {
    const min = proj.inverse(extent.slice(0, 2));
    const max = proj.inverse(extent.slice(2));
    return min.concat(max);
}


function addExtent(feature: Feature, extent: Extent) {
    const geom = feature.getGeometry();
    extent.add(geom);
}

export const polygonProject = (coordinates: CoordPolygon) => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.forward(coordinates[i][ii]);
        }
    }
    return coordinates;
};

export const lineProject = (coordinates: CoordLinestring) => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.forward(coordinates[i]);
    }
    return coordinates;
};

//

export function layerExtent(layer: Layer) {
    const path = layer.getPath();

    return (
        getBinder()
            .getFeatures(path[0], path[1], path[2])
            .then(features => {
                let extent;

                for (const feature of features) {
                    if (extent) {
                        addExtent(feature, extent);
                    }
                    else {
                        extent = feature.getGeometry().getExtent();
                    }
                }

                return extent;
            })
    );
}

