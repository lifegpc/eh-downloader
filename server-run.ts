import { load_settings } from "./config.ts";
import { startServer } from "./server.ts";

await startServer(await load_settings("./config.json"));
