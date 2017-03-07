
import { mat3, vec2 } from 'gl-matrix';


class Matrix {
    private m: mat3;

    constructor(a?: number | Matrix | number[], b?: number, c?: number, d?: number, e?: number, f?: number) {
        if (0 === arguments.length) {
            this.m = mat3.create();
        }
        else if (1 === arguments.length) {
            if (a instanceof Matrix) {
                Matrix.prototype.parseFlat.apply(this, (<Matrix>a).flat());
            }
            else if (Array.isArray(a)) {
                // we assume flat matrix
                Matrix.prototype.parseFlat.apply(this, <number[]>a);
            }
        }
        else if (6 === arguments.length) {
            this.parseFlat(
                <number>a,
                <number>b,
                <number>c,
                <number>d,
                <number>e,
                <number>f
            );
        }
    }

    //////////////////// IMPL ///////////////////////

    get mat() {
        return mat3.clone(this.m);
    }

    get matRef() {
        return this.m;
    }



    clone() {
        const mx = new Matrix();
        mx.m = mat3.clone(this.m);
        return mx;
    }

    parseFlat(a: number, b: number, c: number, d: number, e: number, f: number) {
        this.m = mat3.fromValues(
            a, b, 0,
            c, d, 0,
            e, f, 1
        );
    }

    flat() {
        const fm: number[] = new Array(6);
        fm[0] = this.m[0];
        fm[1] = this.m[1];
        fm[2] = this.m[3];
        fm[3] = this.m[4];
        fm[4] = this.m[6];
        fm[5] = this.m[7];
        return fm;
    }

    /**
    * Multiplies matrix with given matrix and returns resulting matrix
    *
    * @param o {Matrix}
    * @returns {Matrix}
    */
    mul(o: Matrix) {
        mat3.multiply(this.m, this.m, o.m);
        return this;
    }

    inverse() {
        const inverse = new Matrix();
        mat3.invert(inverse.m, this.m);
        return inverse;
    }
}

/**
* Transformation
*/
class Transform {
    private m: Matrix;

    static fromFlatMatrix(fm: number[]) {
        const t = new Transform();
        t.m = new Matrix(fm);
        return t;
    }

    constructor(t?: Transform) {
        if (t) {
            this.m = t.m.clone();
        }
        else {
            this.m = new Matrix();
        }
    }

    // get you an [a b c d e f] matrix
    flatMatrix() {
        return this.m.flat();
    }

    toString() {

        function decimalAdjust(type: 'round', value: any, exp: any): any {
            // If the exp is undefined or zero...
            if (typeof exp === 'undefined' || +exp === 0) {
                return Math[type](value);
            }
            value = +value;
            exp = +exp;
            // If the value is not a number or the exp is not an integer...
            if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
                return NaN;
            }
            // Shift
            value = value.toString().split('e');
            value = Math[type](+(`${value[0]}e${value[1] ? (+value[1] - exp) : -exp}`));
            // Shift back
            value = value.toString().split('e');
            return +(`${value[0]}e${value[1] ? (+value[1] + exp) : exp}`);
        }

        function adjust(type: any, a: any, exp: any) {
            for (let i = 0; i < a.length; i++) {
                a[i] = decimalAdjust(type, a[i], exp);
            }
            return a;
        }

        const f = adjust('round', this.m.flat(), -5);
        const s = `<Matrix: (${f.join(', ')})>`;
        return s;
    }

    reset(t: Transform): Transform {
        this.m = t.m.clone();
        return this;
    }

    clone() {
        const t = new Transform();
        this.reset.call(t, this);
        return t;
    }

    inverse() {
        const inverse_m = this.m.inverse();
        const inverse = new Transform();
        inverse.m = inverse_m;
        return inverse;
    }

    multiply(t: Transform | Matrix): Transform {
        if (t instanceof Matrix) {
            this.m.mul(t);
        }
        else {
            this.m.mul(t.m);
        }
        return this;
    }

    translate(tx: number, ty: number): Transform {
        mat3.translate(this.m.matRef, this.m.mat, [tx, ty]);
        return this;
    }

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
    scale(sx: number, sy: number, origin: number[]) {
        const sm = new Matrix();

        if (undefined !== origin) {
            mat3.translate(sm.matRef, sm.mat, [origin[0], origin[1]]);
            mat3.scale(sm.matRef, sm.mat, [sx, sy]);
            mat3.translate(sm.matRef, sm.mat, [-origin[0], -origin[1]]);
        }
        else {
            mat3.scale(sm.matRef, sm.mat, [sx, sy]);
        }
        this.m.mul(sm);
        return this;
    }

    rotate(r: number, origin: number[]) {
        const rGrad = r * Math.PI / 180.0;
        const rm = new Matrix();

        if (undefined !== origin) {
            mat3.translate(rm.matRef, rm.mat, [origin[0], origin[1]]);
            mat3.rotate(rm.matRef, rm.mat, rGrad);
            mat3.translate(rm.matRef, rm.mat, [-origin[0], -origin[1]]);
        }
        else {
            mat3.rotate(rm.matRef, rm.mat, rGrad);
        }
        this.m.mul(rm);
        return this;
    }

    getScale() {
        return [this.m.mat[0], this.m.mat[4]];
    }

    getTranslate() {
        return [this.m.mat[6], this.m.mat[7]];
    }

    /**
     * a Float32Array [x,y]
     */
    mapVec2<T extends (vec2 | number[])>(v: T): T {
        const out = vec2.create();
        vec2.transformMat3(out, v, this.m.mat);
        v[0] = out[0];
        v[1] = out[1];
        return v;
    }

    mapVec2Fn(name?: string) {
        const m = this.m.clone();
        const f = function <T extends (vec2 | number[])>(v: T): T {
            const out = vec2.create();
            vec2.transformMat3(out, v, m.mat);
            v[0] = out[0];
            v[1] = out[1];
            return v;
        };

        if (name) {
            try {
                Object.defineProperty(f, 'name', { value: name });
            }
            catch (e) { }
        }
        return f;
    }

}

export default Transform;
