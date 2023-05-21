import { assert, assertEquals } from "std/testing/asserts.ts";
import { Client } from "../client.ts";
import { load_settings } from "../config.ts";

Deno.test("MPVPage_test", async () => {
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
    if (p1.is_original) {
        assertEquals(p1.xres, 2449);
        assertEquals(p1.yres, 3427);
    }
    assertEquals(p1.origin_xres, 2449);
    assertEquals(p1.origin_yres, 3427);
    console.log(p1.src);
    const p2 = re.imagelist[1];
    assertEquals(p2.index, 2);
    assertEquals(p2.name, "2.png");
    assertEquals(p2.page_token, "95e59ae4b7");
    await p2.load();
    assert(p2.data);
    assert(!p2.is_original);
    assertEquals(p2.origin_xres, 3351);
    assertEquals(p2.origin_yres, 4894);
    console.log(p2.src);
    /* console.log(p2.original_imgurl);
    const r = await p2.load_original_image();
    assert(r);
    r.body?.cancel();
    console.log(p2.redirected_url); */
});
