import { assert, assertEquals } from "@std/assert";
import { Client } from "../client.ts";
import { load_settings } from "../config.ts";
import { API_PERMISSION } from "../test_base.ts";

Deno.test({
    name: "SinglePage_test",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchSignlePage(2552611, "30d3bd7940", 1);
    assertEquals(re.currentIndex, 1);
    assertEquals(re.nextPageUrl, "https://e-hentai.org/s/8216544b21/2552611-2");
    const np = await re.nextPage();
    assert(np);
    assertEquals(np.currentIndex, 2);
    assertEquals(np.gid, re.gid);
    if (re.is_original) {
        assertEquals(re.xres, 2067);
        assertEquals(re.yres, 3001);
        assertEquals(re.name, "logo.png");
    }
    assertEquals(re.origin_xres, 2067);
    assertEquals(re.origin_yres, 3001);
    if (np.is_original) {
        assertEquals(np.xres, 2067);
        assertEquals(np.yres, 3001);
        assertEquals(np.name, "1.png");
    }
    assertEquals(np.origin_xres, 2067);
    assertEquals(np.origin_yres, 3001);
    const re2 = await client.fetchSignlePage(2028320, "1f48eb617e", 19);
    assertEquals(re2.currentIndex, 19);
    assertEquals(re2.gid, 2028320);
    assertEquals(re2.name, "18.jpg");
    assertEquals(re2.is_original, false);
    assertEquals(re2.origin_xres, 4893);
    assertEquals(re2.origin_yres, 3446);
    console.log(np.nl, re.nl, re2.nl);
});
