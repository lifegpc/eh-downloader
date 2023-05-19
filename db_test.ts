import { EhDb } from "./db.ts";
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
    db.close();
});
