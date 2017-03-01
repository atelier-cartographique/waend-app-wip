export declare function configure(config: any): void;
/**
 * send raw data to the nofify end point
 * @method send
 * @return {bool} true if data has been sent, false if delayed or failed
 */
export declare function send(): boolean;
/**
 * subscribe to a channel
 * @method subscribe
 * @param  {string}  type A channel name, which is usually a context name
 * @param  {string}  id   context id
 */
export declare function subscribe(type: any, id: any): void;
