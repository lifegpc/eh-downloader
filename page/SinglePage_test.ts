import { assert, assertEquals } from "@std/assert";
import { Client } from "../client.ts";
import { load_settings } from "../config.ts";
import { SHA1 } from "@lifegpc/sha1";
import { getHashFromUrl } from "../utils.ts";

Deno.test({
    name: "SinglePage_test",
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
    if (re2.is_original) {
        assertEquals(re2.xres, 4893);
        assertEquals(re2.yres, 3446);
        assertEquals(re2.name, "18.png");
    } else {
        assertEquals(re2.name, "18.jpg");
        assertEquals(re2.origin_xres, 4893);
        assertEquals(re2.origin_yres, 3446);
    }
    console.log(np.nl, re.nl, re2.nl);
    console.log(re2.img_url);
    const res = await client.request(re2.img_url, "GET");
    const data = await res.arrayBuffer();
    const h = (new SHA1()).update(new Uint8Array(data)).digest_hex();
    const oh = getHashFromUrl(re2.img_url);
    assertEquals(h, oh);
});
