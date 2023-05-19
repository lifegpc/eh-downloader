import { Client } from "../client.ts";
import { load_settings } from "../config.ts";
import { API_PERMISSION } from "../test_base.ts";

Deno.test({
    name: "GalleryMetadata_test",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchGalleryMetadataByAPI([2552611, "3132307627"]);
    console.log(re.obj);
});
