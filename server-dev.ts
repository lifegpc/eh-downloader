import dev from "$fresh/dev.ts";

await dev(import.meta.url, "./server-run.ts");
