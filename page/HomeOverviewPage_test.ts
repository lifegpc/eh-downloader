import { assert } from "std/assert/mod.ts";
import { Client } from "../client.ts";
import { load_settings } from "../config.ts";
import { API_PERMISSION } from "../test_base.ts";

const MAX_IMAGE_LIMITS = [5000, 10000, 25000, 50000];

Deno.test({
    name: "HomeOverviewPage_test",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchHomeOverviewPage();
    if (re === null) return;
    console.log(
        "Image limit:",
        re.current_image_limit,
        "/",
        re.max_image_limit,
    );
    assert(re.current_image_limit <= re.max_image_limit);
    assert(MAX_IMAGE_LIMITS.includes(re.max_image_limit));
});
