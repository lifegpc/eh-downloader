import dev from "$fresh/dev.ts";
import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";

await dev(import.meta.url, "./server-run.ts", {
    plugins: [twindPlugin(twindConfig)],
});
