import { assertEquals } from "std/testing/asserts.ts";
import { check_running } from "./pid_check.ts";
import { asyncFilter, promiseState, PromiseStatus, sleep } from "./utils.ts";

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
