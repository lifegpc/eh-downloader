import { assert, assertEquals } from "@std/assert";
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
    assertEquals(re.file_size, "58.20 MiB");
    assertEquals(re.visible, true);
    console.log(re.favorited);
    assert(typeof re.favorited === "number");
    assertEquals(re.language, "Chinese");
    assertEquals(re.gid, 2552611);
    assertEquals(re.token, "3132307627");
    assertEquals(re.new_version.length, 0);
    if (!re.mpv_enabled) assertEquals((await re.imagelist).length, 19);
});

Deno.test({
    name: "GalleryPage_test2",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchGalleryPage(2209409, "8c8b2b1fc3");
    assertEquals(re.name, "[Fanbox] houk1se1 (2022.03.08 - 2022.05.01)");
    assertEquals(re.japanese_name, "");
    assertEquals(re.length, 42);
    assertEquals(re.new_version[0], { gid: 2223198, token: "2a5788135e" });
    if (!re.mpv_enabled) assertEquals((await re.imagelist).length, 42);
});

Deno.test({
    name: "GalleryPage_test3",
    permissions: API_PERMISSION,
}, async () => {
    const cfg = await load_settings("./config.json");
    const client = new Client(cfg);
    const re = await client.fetchGalleryPage(2576265, "daa01f773d");
    assertEquals(re.name, "[Fanbox] houk1se1 (2021.09.05 - 2023.06.07)");
    assertEquals(
        re.japanese_name,
        "[Fanbox] ほうき星 (2021.09.05 - 2023.06.07)",
    );
    assertEquals(re.length, 820);
    if (!re.mpv_enabled) assertEquals((await re.imagelist).length, 820);
});
