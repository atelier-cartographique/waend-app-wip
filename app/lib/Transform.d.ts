/**
* Transformation
*/
declare class Transform {
    constructor();
    flatMatrix(): any;
    toString(): string;
    reset(t: any): this;
    clone(): any;
    inverse(): Transform;
    multiply(t: any): this;
    translate(tx: any, ty: any): this;
    /**
    * Scales with given scale on x-axis and
    * given scale on y-axis, around given origin
    *
    * If no sy is provided the scale will be proportional
    * @param sx Number
    * @param sy Number
    * @param origin {Geom.Point}|{}
    * @returns {Transform}
    */
    scale(sx: any, sy: any, origin: any): this;
    rotate(r: any, origin: any): this;
    getScale(): any[];
    getTranslate(): any[];
    /**
     * an array [x,y]
     */
    mapVec2(v: any): any;
    mapVec2Fn(name: any): (v: any) => any;
    /**
     * an array of vec2s [[x,y], [x,y], ...]
     */
    mapCoordinates(coordinates: any): any;
    mapPoint(p: any): any;
}
export default Transform;
