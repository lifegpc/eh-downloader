import { assert, assertEquals } from "std/testing/asserts.ts";
import { check_running } from "./pid_check.ts";
import {
    add_suffix_to_path,
    asyncFilter,
    asyncForEach,
    filterFilename,
    promiseState,
    PromiseStatus,
    sleep,
} from "./utils.ts";

Deno.test("promiseState_test", async () => {
    const p1 = new Promise((res) => setTimeout(() => res(100), 100));
    const p2 = new Promise((res) => setTimeout(() => res(200), 200));
    const p3 = new Promise((_res, rej) => setTimeout(() => rej(300), 100));

    async function getStates() {
        console.log(await promiseState(p1));
        console.log(await promiseState(p2));
        console.log(await promiseState(p3));
    }

    console.log("Immediately after initiation:");
    await getStates();
    await sleep(100);
    console.log("After waiting for 100ms:");
    await getStates();
    await Promise.allSettled([p1, p2, p3]);
});

Deno.test("Pid_Test", async () => {
    if (Deno.build.os == "windows") {
        assertEquals(await check_running(Deno.pid), true);
    }
});

Deno.test("asyncFilter_test", async () => {
    const t = [3, 5];
    const r = await asyncFilter(t, async (t) => {
        await sleep(10);
        return t === 3;
    });
    assertEquals(r, [3]);
    const e = [new Promise<number>((res) => setTimeout(() => res(100), 100))];
    const v = await asyncFilter(e, async (t) => {
        const s = await promiseState(t);
        return s.status === PromiseStatus.Pending;
    });
    assertEquals(v, e);
    await Promise.allSettled(e);
});

Deno.test("asyncForEach_test", async () => {
    const e = [new Promise<number>((res) => setTimeout(() => res(100), 100))];
    const t = { test: 2 };
    await asyncForEach(e, async function (e) {
        assertEquals(this, t);
        await e;
    }, t);
});

Deno.test("filterFilename_test", () => {
    assertEquals(filterFilename("abcdef.ts", 5), "ab.ts");
    assertEquals(filterFilename("\x00df\t\r.ts"), "df.ts");
    assertEquals(filterFilename("a\u200bd.ts"), "ad.ts");
    assertEquals(filterFilename("中文.ts"), "中文.ts");
    assertEquals(filterFilename("d\\s/.ts"), "d_s_.ts");
    if (Deno.build.os == "windows") {
        assertEquals(filterFilename("d|?ad.ts"), "d__ad.ts");
    }
});

Deno.test("add_suffix_to_path_test", () => {
    assertEquals(add_suffix_to_path("test.ts", "ok"), "test-ok.ts");
    assertEquals(add_suffix_to_path("test", "ok"), "test-ok");
    const t = add_suffix_to_path("test.ts");
    console.log(t);
    assert(t.startsWith("test-"));
    assert(t.endsWith(".ts"));
});
