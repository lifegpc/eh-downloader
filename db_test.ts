import { assertEquals } from "std/assert/mod.ts";
import { EhDb, EhFile, GMeta, PMeta } from "./db.ts";
import { TaskType } from "./task.ts";
import { DB_PERMISSION, remove_if_exists } from "./test_base.ts";
import { sure_dir } from "./utils.ts";

Deno.test({ name: "DbTest", permissions: DB_PERMISSION }, async () => {
    await sure_dir("./test/db");
    await remove_if_exists("./test/db/data.db");
    const db = new EhDb("./test/db");
    await db.init();
    console.log(
        await db.add_task({
            gid: 1,
            token: "dd",
            pid: 1,
            type: TaskType.Download,
            id: 0,
            details: null,
        }),
    );
    console.log(
        await db.add_task({
            gid: 1,
            token: "dd",
            pid: 1,
            type: TaskType.ExportZip,
            id: 0,
            details: "test",
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
    const tags = new Set(["std", "df2", "ef3"]);
    await db.add_gtag(1, tags);
    assertEquals(tags, db.get_gtags(1));
    const f: EhFile = {
        id: 0,
        token: "s",
        path: "a.png",
        width: 1280,
        height: 720,
        is_original: true,
    };
    const f2 = db.add_file(f);
    f.id = f2.id;
    assertEquals(f, f2);
    f.path = "df.png";
    f.id = 0;
    const f3 = db.add_file(f);
    f.id = f2.id;
    assertEquals(f, f3);
    f3.path = "s.ppp";
    f3.id = 0;
    const f4 = db.add_file(f3, false);
    f3.id = f4.id;
    assertEquals(f3, f4);
    assertEquals(f.id, f2.id);
    assertEquals(db.get_files("s").length, 2);
    db.add_file(f3);
    assertEquals(db.get_files("s").length, 1);
    db.close();
});
