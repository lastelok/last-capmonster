"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSolutions = exports.PROVIDER_ID = void 0;
exports.PROVIDER_ID = "capmonster";
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)(`puppeteer-extra-plugin:recaptcha-capmonster:${exports.PROVIDER_ID}`);
const capmonster_api_1 = __importDefault(require("./capmonster-api"));
const solver = new capmonster_api_1.default();
const secondsBetweenDates = (before, after) => (after.getTime() - before.getTime()) / 1000;
async function decodeRecaptchaAsync(token, vendor, sitekey, url) {
    return new Promise((resolve) => {
        const cb = (err, result) => resolve({ err, result });
        try {
            solver.setApiKey(token);
            let method = "NoCaptchaTaskProxyless";
            if (vendor === "hcaptcha") {
                method = "HCaptchaTaskProxyless";
            }
            solver.decodeReCaptcha(method, url, sitekey, cb);
        }
        catch (error) {
            return resolve({ err: error });
        }
    });
}
async function getSolutions(captchas = [], token = "") {
    const solutions = await Promise.all(captchas.map((c) => getSolution(c, token)));
    return { solutions, error: solutions.find((s) => !!s.error) };
}
exports.getSolutions = getSolutions;
async function getSolution(captcha, token) {
    const solution = {
        _vendor: captcha._vendor,
        provider: exports.PROVIDER_ID
    };
    try {
        if (!captcha || !captcha.sitekey || !captcha.url || !captcha.id) {
            throw new Error("Missing data in captcha");
        }
        solution.id = captcha.id;
        solution.requestAt = new Date();
        debug("Requesting solution..", solution);
        const { err, result } = await decodeRecaptchaAsync(token, captcha._vendor, captcha.sitekey, captcha.url);
        debug("Got response", { err, result });
        if (err)
            throw new Error(`${exports.PROVIDER_ID} error: ${err}`);
        if (!result || !result.text || !result.id) {
            throw new Error(`${exports.PROVIDER_ID} error: Missing response data: ${result}`);
        }
        solution.providerCaptchaId = result.id;
        solution.text = result.text;
        solution.responseAt = new Date();
        solution.hasSolution = !!solution.text;
        solution.duration = secondsBetweenDates(solution.requestAt, solution.responseAt);
    }
    catch (error) {
        debug("Error", error);
        solution.error = error.toString();
    }
    return solution;
}
//# sourceMappingURL=capmonster.js.map