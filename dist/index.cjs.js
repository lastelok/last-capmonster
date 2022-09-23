/*!
 * puppeteer-extra-plugin-recaptcha-capmonster v1.0.5 by notsapinho
 * https://github.com/https://github.com/notsapinho/puppeteer-extra-plugin-recaptcha-capmonster.git
 * @license MIT
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var Debug = require('debug');
var axios = require('axios');
var colors = require('colors')

const requestTimeoutInterceptor = (config) => {
    if (config.timeout === undefined || config.timeout === 0) {
        return config
    }

    const source = axios.CancelToken.source()
    let proxyUsed = config?.httpsAgent?.proxy?.host ? config?.httpsAgent?.proxy?.host : ``

    setTimeout(() => {
        source.cancel(`ECANCELLED (${(config.timeout / 1000).toFixed(0)}s) - ${colors.yellow(proxyUsed)}`)
    }, config.timeout)

    // If caller configures cancelToken, preserve cancelToken behaviour.
    if (config.cancelToken) {
        config.cancelToken.promise.then((cancel) => {
            source.cancel(cancel.message)
        })
    }

    return { ...config, cancelToken: source.token }
}

axios.defaults.proxy = false
axios.defaults.timeout = 35000
axios.interceptors.request.use(requestTimeoutInterceptor)

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var Debug__default = /*#__PURE__*/_interopDefaultLegacy(Debug);
var axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);

// https://github.com/hanahaneull/capmonster/blob/master/src/index.js adapted to Typescript
class CapMonster {
    constructor(clientKey, opts) {
        // console.log(`index.cjs.js`)
    

        this.setApiKey = (apiKey) => (this.clientKey = apiKey);
        // this.getBalance = () => this.$http.post("/getBalance", {
        //     clientkey: this.clientKey
        // });
        this.createTask = (task = {}) => this.$http.post("/createTask", {
            clientKey: this.clientKey,
            task
        });
        this.decodeReCaptcha = async (method, websiteURL, websiteKey, callback) => {

            var _a;
            let solved = false;
            let retries = 0;
            // const response = await this.$http.post("/createTask", {
            //     clientKey: this.clientKey,
            //     task: {
            //         type: method,
            //         websiteURL: websiteURL,
            //         websiteKey: websiteKey
            //     }
            // });

            const response = await this.capMonsterCreateTask({
                task: {
                    type: method,
                    websiteURL: websiteURL,
                    websiteKey: websiteKey
                }
            })

            while (!solved) {
                if (retries === this.opts.retries) {
                    return callback("CAPTCHA_FAILED_TOO_MANY_TIMES");
                }
                retries++;
                await new Promise((resolve) => setTimeout(resolve, this.opts.pollingInterval));
                // const result = await this.getResult(response.data.taskId);
                const result = await this.capMonsterGetTaskResult({
                    task_id: response.taskId
                })

                if (result.status === "ready") {
                    solved = true;
                    return callback(null, {
                        id: response.taskId,
                        text: (_a = result.solution) === null || _a === void 0 ? void 0 : _a.gRecaptchaResponse
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
        this.$http = axios__default["default"].create({ baseURL: "https://api.capmonster.cloud" });
    }

    async doRequest(settings) {
        // func, body, referer, host, retrys
        try {
            let body_default = {
                method: `GET`,
                timeout: 15000,
            }
            if (settings.retrys === undefined) settings.retrys = 5

            let res = await axios.request(Object.assign({}, body_default, settings.body))

            return res.data
        } catch (e) {
            let error = this.eLog(e, settings.func, settings.retrys)

            if (settings.retrys > 0) {
                settings.retrys--
                await delay(3000)
                return await this.doRequest(settings)
            }
            return { success: false, type: error.type, message: error.message }
        }
    }

    async capMonsterCreateTask(config) {
        return await this.doRequest({
            func: getFunctionName(),
            body: {
                url: `https://api.capmonster.cloud/createTask`,
                headers: {
                    'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36`,
                },
                data: {
                    clientKey: this.clientKey,
                    task: config.task
                },
            },
        })
    }

    async capMonsterGetTaskResult(config) {
        return await this.doRequest({
            func: getFunctionName(),
            body: {
                url: `https://api.capmonster.cloud/getTaskResult/`,
                headers: {
                    'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36`,
                },
                data: {
                    clientKey: this.clientKey,
                    taskId: config.task_id,
                },
            },
        })
    }

    eLog(e, func, retrys) {
        let type = 0
        let reason = e ? e.toString() : null

        let proxyUsedInRequest = e?.config?.httpsAgent?.proxy?.host ? e?.config?.httpsAgent?.proxy?.host : ``

        let types = {
            proxyErrors: [`ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `Socket hang up`, `Client network socket disconnected`, `Socket is closed`, `Request failed with status code 407`, `EADDRINUSE`, `socket hang up`, `write EPROTO`, `EHOSTUNREACH`],
            banErrors: [`Request failed with status code 403`, `Request failed with status code 429`],
            serverErrors: [`Request failed with status code 500`, `Request failed with status code 502`, `Request failed with status code 503`, `Request failed with status code 504`],
        }

        types.proxyErrors.forEach((error) => {
            if (e.toString().includes(error)) {
                reason = `${error} - ${colors.yellow(proxyUsedInRequest)}`
                type = 1
            }
        })

        types.banErrors.forEach((error) => {
            if (e.toString().includes(error)) {
                reason = `${error} - ${colors.yellow(proxyUsedInRequest)}`
                type = 2
            }
        })

        types.serverErrors.forEach((error) => {
            if (e.toString().includes(error)) {
                reason = error
                type = 4
            }
        })

        if (e.toString().includes(`ECANCELLED`)) {
            reason = e.message
            type = 3
        }

        if (e.toString().includes(`Request failed with status code 401`)) {
            reason = e.message
            type = 4
        }

        if (reason.includes(`Request failed with status code`)) reason = `HTTP Error ${reason.slice(reason.indexOf(`status code `) + 12)}`

        this.write(colors.red(`${colors.yellow(func)} - ${reason} ${retrys > 0 ? colors.white(`[${retrys} retrys left]`) : ``}`))

        fs.appendFileSync(`./logs/capmonster.log`, `[${getTime(Date.now())}] ${func} - ${reason.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ``)}\r\n`, 'UTF-8')

        return {
            type,
            message: reason.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ``),
        }
    }

    write(log) {
        let time = new Date()

        time = colors.brightMagenta(`[${time.getHours() >= 10 ? time.getHours() : '0' + time.getHours()}:${time.getMinutes() >= 10 ? time.getMinutes() : '0' + time.getMinutes()}:${time.getSeconds() >= 10 ? time.getSeconds() : '0' + time.getSeconds()}.${colors.gray(time.getMilliseconds() >= 100 ? time.getMilliseconds() : time.getMilliseconds() >= 10 ? `0` + time.getMilliseconds() : `00` + time.getMilliseconds())}]`)

        console.log(`${time} ${log}`)
    }

}

const PROVIDER_ID = "capmonster";
const debug = Debug__default["default"](`puppeteer-extra-plugin:recaptcha-capmonster:${PROVIDER_ID}`);
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

exports["default"] = Plugin;


  module.exports = exports.default || {}
  Object.entries(exports).forEach(([key, value]) => { module.exports[key] = value })
//# sourceMappingURL=index.cjs.js.map
