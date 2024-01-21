import { startServer } from "./server.ts";
import { isDocker } from "./utils.ts";

const configPath = isDocker() ? "./data/config.json" : "./config.json";

await startServer(configPath);
