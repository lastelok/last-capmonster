export declare const PROVIDER_ID = "capmonster";
import * as types from "../types/plugin";
export declare function getSolutions(captchas?: types.CaptchaInfo[], token?: string): Promise<types.GetSolutionsResult>;
