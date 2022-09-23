/*!
 * puppeteer-extra-plugin-recaptcha-capmonster v1.0.5 by notsapinho
 * https://github.com/https://github.com/notsapinho/puppeteer-extra-plugin-recaptcha-capmonster.git
 * @license MIT
 */
import Debug from 'debug';
import axios from 'axios';

// https://github.com/hanahaneull/capmonster/blob/master/src/index.js adapted to Typescript
class CapMonster {
    constructor(clientKey, opts) {
        this.setApiKey = (apiKey) => (this.clientKey = apiKey);
        this.getBalance = () => this.$http.post("/getBalance", {
            clientkey: this.clientKey
        });
        this.createTask = (task = {}) => this.$http.post("/createTask", {
            clientKey: this.clientKey,
            task
        });
        this.decodeReCaptcha = async (method, websiteURL, websiteKey, callback) => {
            var _a;
            let solved = false;
            let retries = 0;
            const response = await this.$http.post("/createTask", {
                clientKey: this.clientKey,
                task: {
                    type: method,
                    websiteURL: websiteURL,
                    websiteKey: websiteKey
                }
            });
            while (!solved) {
                if (retries === this.opts.retries) {
                    return callback("CAPTCHA_FAILED_TOO_MANY_TIMES");
                }
                retries++;
                await new Promise((resolve) => setTimeout(resolve, this.opts.pollingInterval));
                const result = await this.getResult(response.data.taskId);
                if (result.data.status === "ready") {
                    solved = true;
                    return callback(null, {
                        id: response.data.taskId,
                        text: (_a = result.data.solution) === null || _a === void 0 ? void 0 : _a.gRecaptchaResponse
                    });
                }
            }
        };
        this.getResult = (taskId) => this.$http.post("/getTaskResult", {
            clientKey: this.clientKey,
            taskId
        });
        if (!opts) {
            this.opts = {
                pollingInterval: 2000,
                retries: 50
            };
        }
        this.clientKey = clientKey;
        this.$http = axios.create({ baseURL: "https://api.capmonster.cloud" });
    }
}

const PROVIDER_ID = "capmonster";
const debug = Debug(`puppeteer-extra-plugin:recaptcha-capmonster:${PROVIDER_ID}`);
const solver = new CapMonster();
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
async function getSolution(captcha, token) {
    const solution = {
        _vendor: captcha._vendor,
        provider: PROVIDER_ID
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
            throw new Error(`${PROVIDER_ID} error: ${err}`);
        if (!result || !result.text || !result.id) {
            throw new Error(`${PROVIDER_ID} error: Missing response data: ${result}`);
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

class Plugin {
    static use(providers) {
        providers.push({ id: PROVIDER_ID, fn: getSolutions });
    }
}

export { Plugin as default };
//# sourceMappingURL=index.esm.ts.map
