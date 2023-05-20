import { assertEquals } from "https://deno.land/std@0.188.0/testing/asserts.ts";
import { Client } from "../client.ts";
import { load_settings } from "../config.ts";
import { API_PERMISSION } from "../test_base.ts";
import { assert } from "https://deno.land/std@0.188.0/_util/asserts.ts";

Deno.test({
    name: "GalleryPage_test",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchMPVPage(1473589, "b1f3c60a95");
    assertEquals(re.gid, 1473589);
    assertEquals(re.pagecount, 8);
    assertEquals(re.imagelist.length, re.pagecount);
    const p1 = re.imagelist[0];
    assertEquals(p1.index, 1);
    assertEquals(p1.name, "1.png");
    assertEquals(p1.page_token, "7ffd92a751");
    await p1.load();
    assert(p1.data);
    assertEquals(p1.xres, 2449);
    assertEquals(p1.yres, 3427);
    console.log(p1.data.i);
});
