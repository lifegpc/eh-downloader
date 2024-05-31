import { assert, assertEquals } from "@std/assert";
import { check_running } from "./pid_check.ts";
import {
    add_suffix_to_path,
    asyncEvery,
    asyncFilter,
    asyncForEach,
    calFileMd5,
    compareNum,
    filterFilename,
    map,
    promiseState,
    PromiseStatus,
    sleep,
    sure_dir,
    toJSON,
} from "./utils.ts";
import { md5 } from "lifegpc-md5";

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
    const v = await asyncFilter(e, async function (d) {
        assertEquals(this, t);
        const s = await promiseState(d);
        return s.status === PromiseStatus.Pending;
    }, t);
    assertEquals(v, e);
    const e2 = { 0: e[0], length: 1 };
    const v2 = await asyncFilter(e2, async function (d) {
        assertEquals(this, t);
        const s = await promiseState(d);
        return s.status === PromiseStatus.Pending;
    }, t);
    assertEquals(v, v2);
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
    assertEquals(filterFilename("t\\.ts", 0), "t_.ts");
});

Deno.test("add_suffix_to_path_test", () => {
    assertEquals(add_suffix_to_path("test.ts", "ok"), "test-ok.ts");
    assertEquals(add_suffix_to_path("test", "ok"), "test-ok");
    const t = add_suffix_to_path("test.ts");
    console.log(t);
    assert(t.startsWith("test-"));
    assert(t.endsWith(".ts"));
});

Deno.test("calFileMd5_test", async () => {
    await sure_dir();
    const text = `Hello World.te${Math.random()}`;
    await Deno.writeTextFile("./test/test.txt", text);
    assertEquals(await calFileMd5("./test/test.txt"), md5(text));
});

Deno.test("asyncEvery_test", async () => {
    // @ts-ignore: FUCKED UP
    const list = [];
    // @ts-ignore: FUCKED UP
    function timeout(fun, time) {
        list.push(setTimeout(fun, time));
    }
    const e = [new Promise<number>((res) => timeout(() => res(100), 100))];
    const e2 = [
        new Promise<number>((res) => timeout(() => res(100), 100)),
        new Promise<number>((res) => timeout(() => res(200), 100)),
    ];
    const e3 = [
        new Promise<number>((res) => timeout(() => res(100), 100)),
        new Promise<number>((res) => timeout(() => res(200), 100)),
        new Promise<number>((res) => timeout(() => res(150), 100)),
    ];
    const t = { test: 2 };
    assertEquals(
        await asyncEvery(e, async function (e) {
            assertEquals(this, t);
            return (await e) === 100;
        }, t),
        true,
    );
    assertEquals(
        await asyncEvery(e2, async function (e) {
            assertEquals(this, t);
            const d = await e;
            return d === 100;
        }, t),
        false,
    );
    assertEquals(
        await asyncEvery(e3, async function (e) {
            assertEquals(this, t);
            const d = await e;
            if (d === 150) throw Error("Should exited.");
            return d === 100;
        }, t),
        false,
    );
    // @ts-ignore: FUCKED UP
    for (const i of list) {
        clearTimeout(i);
    }
});

Deno.test("map_test", () => {
    const arr = { 0: 1, 1: 2, length: 2 };
    const d = { d: 1 };
    const re = map(arr, function (n) {
        assertEquals(this, d);
        return n + 2;
    }, d);
    assertEquals(re, [3, 4]);
});

Deno.test("toJSON_test", () => {
    assertEquals(toJSON({ a: 3n }), '{"a":3}');
    assertEquals(
        toJSON([1099511627776n, { a: 45n }]),
        '[1099511627776,{"a":45}]',
    );
    assertEquals(toJSON([9007199254740992n]), '["9007199254740992"]');
});

Deno.test("compareNum_test", () => {
    assertEquals([3, 4n, 1, 2n, 11n, 5n].sort(compareNum), [
        1,
        2n,
        3,
        4n,
        5n,
        11n,
    ]);
});
