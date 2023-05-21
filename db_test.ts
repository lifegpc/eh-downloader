import { assertEquals } from "std/testing/asserts.ts";
import { EhDb, GMeta, PMeta } from "./db.ts";
import { TaskType } from "./task.ts";
import { remove_if_exists } from "./test_base.ts";
import { sure_dir } from "./utils.ts";

Deno.test("DbTest", async () => {
    await sure_dir("./test/db");
    await remove_if_exists("./test/db/data.db");
    const db = new EhDb("./test/db");
    console.log(
        await db.add_task({
            gid: 1,
            token: "dd",
            pid: 1,
            pn: 1,
            type: TaskType.Download,
            id: 0,
        }),
    );
    const gmeta: GMeta = {
        gid: 1,
        token: "test",
        title: "s",
        title_jpn: "sd",
        category: "Non-H",
        uploader: "ss",
        posted: 123,
        filecount: 23,
        filesize: 132334,
        expunged: true,
        rating: 3.45,
        parent_gid: null,
        parent_key: null,
        first_gid: null,
        first_key: null,
    };
    db.add_gmeta(gmeta);
    assertEquals(
        gmeta,
        db.get_gmeta_by_gid(1),
    );
    const pmeta: PMeta = {
        gid: 1,
        index: 1,
        token: "sddd",
        name: "a.png",
        width: 1280,
        height: 720,
    };
    db.add_pmeta(pmeta);
    assertEquals(pmeta, db.get_pmeta_by_token(pmeta.gid, pmeta.token));
    assertEquals(pmeta, db.get_pmeta_by_index(pmeta.gid, pmeta.index));
    db.close();
});
