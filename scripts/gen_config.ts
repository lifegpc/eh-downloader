Deno.writeTextFileSync(
    "./config.json",
    JSON.stringify({ cookies: Deno.env.get("EH_COOKIES") }),
);
