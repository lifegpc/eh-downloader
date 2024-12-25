import { assert, assertEquals } from "@std/assert";
import { check_running } from "./pid_check.ts";
import {
    add_suffix_to_path,
    asyncEvery,
    asyncFilter,
    asyncForEach,
    calFileMd5,
    calFileSha1,
    compareNum,
    filterFilename,
    getHashFromUrl,
    map,
    parseBigInt,
    promiseState,
    PromiseStatus,
    replaceExtname,
    sleep,
    sure_dir,
    toJSON,
} from "./utils.ts";
import { md5 } from "lifegpc-md5";
import { sha1 } from "@lifegpc/sha1";

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
    if (Deno.build.os == "windows" || Deno.build.os == "linux") {
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

Deno.test("calFileSha1_test", async () => {
    await sure_dir();
    const text = `Hello World.te${Math.random()}dsadasd`;
    await Deno.writeTextFile("./test/testsha1.txt", text);
    assertEquals(await calFileSha1("./test/testsha1.txt"), sha1(text));
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

Deno.test("parseBigInt_test", () => {
    assertEquals(parseBigInt("1.jpg"), 1);
    assertEquals(parseBigInt("9007199254740992.png"), 9007199254740992n);
    assertEquals(parseBigInt("+3_3"), 3);
    assertEquals(parseBigInt("+9007199254740992"), 9007199254740992n);
    assertEquals(parseBigInt("-9007199254740992.3"), -9007199254740992n);
    assertEquals(parseBigInt("--9007199254740992"), NaN);
    assertEquals(parseBigInt("--3"), NaN);
});

Deno.test("getHashFromUrl_test", () => {
    assertEquals(
        getHashFromUrl(
            "https://tgozcdr.gmhufzljgpgr.hath.network/h/5ad98a65fedb4bbe374200127bf59122d790b01a-561706-2400-3455-jpg/keystamp=1717653000-d7f10a5a37;fileindex=148307765;xres=2400/3.jpg",
        ),
        "5ad98a65fedb4bbe374200127bf59122d790b01a",
    );
    assertEquals(
        getHashFromUrl(
            "https://shioxowwjqzzmcmcjtcc.hath.network/om/148307800/fdf168f74a048b4d8ac00fd8679ebd37495d4225-12779336-5709-4063-png/eda2e519f8a8d08af91c9e69aca958bad4287fc7-442362-2400-1708-jpg/2400/jxd25rgrogit4j1d6bp/13_14.jpg",
        ),
        "eda2e519f8a8d08af91c9e69aca958bad4287fc7",
    );
    assertEquals(
        getHashFromUrl(
            "https://wodmrfmkcovmstjztpdj.hath.network/om/148307765/b17d7a49b90ec7f8e586dd9847d22027b0d56d6b-5720430-2822-4063-png/x/0/erpgfojcsyhu9v1d6b2/3.png",
        ),
        "b17d7a49b90ec7f8e586dd9847d22027b0d56d6b",
    );
    assertEquals(
        getHashFromUrl(
            "https://asmrsqqftvbbqqaocggo.hath.network/om/98603353/1f48eb617ea10c4b48ef0485d43f339985119d7f-13101261-4893-3446-png/4038f0c078b59736aeaa5b1ce38a44b701238363-330283-2400-1690-jpg/2400/g101vh47s3q5al1d6ax/18.jpg",
        ),
        "4038f0c078b59736aeaa5b1ce38a44b701238363",
    );
    assertEquals(
        getHashFromUrl(
            "https://zurswtyclg.hath.network/om/160618900/ff92f8c044e42cdcadcc0bb35d4bc957d1b00c93-3221277-2419-3482-png/109caa716cd3ac3b8ccf4e1e6c1290cc40e72984-100408-2419-3482-wbp/2560/eoqq7x49z16j8q1jeha/12.webp",
        ),
        "109caa716cd3ac3b8ccf4e1e6c1290cc40e72984",
    );
});

Deno.test("replaceExtname_test", () => {
    assertEquals(replaceExtname("test.ts", "js"), "test.js");
    assertEquals(replaceExtname("test", "js"), "test.js");
    assertEquals(replaceExtname("test.ts", ""), "test");
    assertEquals(replaceExtname("test", ""), "test");
    assertEquals(replaceExtname("test", "."), "test.");
});
