import { assertEquals } from "@std/assert";
import { parse_bool, parse_int } from "./parse_form.ts";

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

Deno.test("parse_int_test", async () => {
    const f = new FormData();
    f.append("a", "d");
    assertEquals(await parse_int(f.get("a"), null), null);
    assertEquals(await parse_int(f.get("a"), 1), 1);
    f.append("c", "1");
    assertEquals(await parse_int(f.get("c"), null), 1);
    assertEquals(await parse_int(f.get("c"), 2), 1);
    f.append("d", "-1");
    assertEquals(await parse_int(f.get("d"), null), -1);
});
