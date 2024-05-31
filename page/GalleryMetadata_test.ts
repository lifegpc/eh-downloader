import { assert, assertEquals } from "@std/assert";
import { Client } from "../client.ts";
import { load_settings } from "../config.ts";
import { API_PERMISSION } from "../test_base.ts";

Deno.test({
    name: "GalleryMetadata_test",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchGalleryMetadataByAPI([1389215, "b5e43bd12d"]);
    console.log(re.obj);
    const gdata = re.map.get(1389215);
    assert(gdata !== undefined && typeof gdata !== "string");
    assertEquals(
        gdata.title,
        "(C95) [Shiratamaco (Shiratama)] Usagi Syndrome 4 (Gochuumon wa Usagi desu ka?) [Chinese] [白玉症候群&amp;绅士仓库联合汉化]",
    );
    const gmeta = re.convert(gdata);
    assertEquals(
        gmeta.title,
        "(C95) [Shiratamaco (Shiratama)] Usagi Syndrome 4 (Gochuumon wa Usagi desu ka?) [Chinese] [白玉症候群&绅士仓库联合汉化]",
    );
});
