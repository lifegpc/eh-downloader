import { assertEquals } from "std/testing/asserts.ts";
import { parse_bool } from "./parse_form.ts";

Deno.test("parse_bool_test", async () => {
    const f = new FormData();
    f.append("a", "d");
    assertEquals(await parse_bool(f.get("a"), true), false);
    assertEquals(await parse_bool(f.get("b"), true), true);
    assertEquals(await parse_bool(f.get("b"), null), null);
    assertEquals(await parse_bool(f.get("a"), null), false);
    f.append("c", "1");
    f.append("d", "TRue");
    assertEquals(await parse_bool(f.get("c"), null), true);
    assertEquals(await parse_bool(f.get("d"), null), true);
    f.append("e", "tRUE", "a.png");
    assertEquals(await parse_bool(f.get("e"), null), true);
});
