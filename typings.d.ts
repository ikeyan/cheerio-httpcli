declare module "cheerio-httpcli" {
    import * as http from "http";
    import Promise = require("tspromise");

    export var version: string;
    export var headers: {[headerKey: string]: string};
    export var timeout: number;
    export var gzip: boolean;
    export var referer: boolean;
    export var debug: boolean;
    export var maxDataSize: number|void;
    export function setIconvEngine(iconv_module_name: string): void;
    /// browser_type = "ie" | "edge" | "chrome" | "firefox" | "opera" | "vivaldi" | "safari" | "ios" | "android" | "googlebot"
    export function setBrowser(browser_type: string): boolean;

    export interface ExtendedResponse extends http.ServerResponse {
        cookies: {[cookieKey: string]: string};
    }
    export interface ExtendedCheerioAPI extends CheerioAPI {
        documentInfo: () => {url: string, encoding: string},
        click: () => FetchPromiseResult,
        submit: (params: Params) => FetchPromiseResult,
    }
    export interface Params {
        [paramName: string]: string
    }

    type FetchPromiseResult = Promise<{response: ExtendedResponse, body: string, $: ExtendedCheerioAPI}>;

    export function fetch (url: string, params?: Params): FetchPromiseResult;
}
