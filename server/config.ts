import type { ConfigType } from "../config.ts";

export type ConfigClientSocketData = { type: "close" };
export type ConfigSeverSocketData = { type: "close" } | {
    type: "cfg";
    cfg: ConfigType;
};
