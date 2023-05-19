import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.188.0/testing/asserts.ts";
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
});
