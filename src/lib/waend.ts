
import Context from './Context';
import Stream from './Stream';

export enum ContextIndex {
    SHELL = 0,
    USER,
    GROUP,
    LAYER,
    FEATURE,
}

export interface ICommand {
    name: string;
    command: <T>(ctx: Context, args: string[]) => Promise<T>;
}

export interface ISys {
    stdin: Stream;
    stdout: Stream;
    stderr: Stream;
}

export interface ITermCommand {

}

export interface ITerminal {
    capabilities: string[];
}

export interface IChannel {
    type: string;
    id: string;
}


export interface IEventChangeContext {
    index: ContextIndex;
    path: string[];
}

export type JSONGeometry =
    GeoJSON.Point
    | GeoJSON.LineString
    | GeoJSON.Polygon;

export type Coordinates =
    GeoJSON.Position
    | GeoJSON.Position[]
    | GeoJSON.Position[][]

export type CoordPoint = GeoJSON.Position;
export type CoordLinestring = GeoJSON.Position[];
export type CoordPolygon = GeoJSON.Position[][];

export interface IFeature {
    geometry: JSONGeometry;
}

// painting

export type ImageAdjust = 'none' | 'fit' | 'cover';

export interface ImageOptions {
    image: string;
    adjust: ImageAdjust;
    clip: boolean;
    rotation?: number;
}

export type PolygonEnd = 'closePath' | 'stroke' | 'fill' | 'clip';
export type PolygonEnds = PolygonEnd[];
export type ClipCommand = 'end' | 'begin';
export type ContextValue = boolean | string | number | number[];
export type DrawingInstructionBase = [string];
export type DrawingInstructionPoint = [string, number, number];
export type DrawingInstructionQuadratic = [string, number, number, number, number];
export type DrawingInstructionBezier = [string, number, number, number, number, number, number];

export type DrawingInstruction =
    | DrawingInstructionBase
    | DrawingInstructionPoint
    | DrawingInstructionQuadratic
    | DrawingInstructionBezier;

export type PainterCommandApplyTexture = ['applyTexture', string];
export type PainterCommandClear = ['clear'];
export type PainterCommandClearRect = ['clearRect', number[]];
export type PainterCommandEndTexture = ['endTexture'];
export type PainterCommandImage = ['image', CoordPolygon, number[], ImageOptions];
export type PainterCommandInstructions = ['instructions', DrawingInstruction[]];
export type PainterCommandLine = ['line', CoordLinestring];
export type PainterCommandPolygon = ['polygon', CoordPolygon, PolygonEnds];
export type PainterCommandRestore = ['restore'];
export type PainterCommandSave = ['save'];
export type PainterCommandSet = ['set', string, ContextValue];
export type PainterCommandStartTexture = ['startTexture', string];
export type PainterCommandTransform = ['transform', number, number, number, number, number, number];

export type PainterCommand =
    | PainterCommandClear
    | PainterCommandApplyTexture
    | PainterCommandClearRect
    | PainterCommandEndTexture
    | PainterCommandImage
    | PainterCommandInstructions
    | PainterCommandLine
    | PainterCommandPolygon
    | PainterCommandRestore
    | PainterCommandSave
    | PainterCommandSet
    | PainterCommandStartTexture
    | PainterCommandTransform;