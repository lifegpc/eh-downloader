import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.188.0/testing/asserts.ts";
import { Client } from "../client.ts";
import { load_settings } from "../config.ts";
import { API_PERMISSION } from "../test_base.ts";

Deno.test({
    name: "GalleryPage_test",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchGalleryPage(2552611, "3132307627");
    assertEquals(
        re.name,
        "(C101) [Shiratamaco (Shiratama)] Étude 30 (Various) [Chinese] [白玉症候群汉化]",
    );
    assertEquals(
        re.japanese_name,
        "(C101) [しらたまこ (しらたま)] Étude 27 (よろず) [中国翻訳]",
    );
    assertEquals(
        re.tags,
        new Set([
            "language:chinese",
            "language:translated",
            "group:shiratamaco",
            "artist:shiratama",
            "female:kemonomimi",
        ]),
    );
    assertEquals(re.length, 19);
    assertEquals(re.file_size, "58.20 MB");
    assertEquals(re.visible, true);
    console.log(re.favorited);
    assert(typeof re.favorited === "number");
    assertEquals(re.language, "Chinese");
});
