import { assertEquals } from "@std/assert";
import { SortableURLSearchParams } from "./SortableURLSearchParams.ts";

Deno.test("SortableURLSearchParams_test", () => {
    const s = new SortableURLSearchParams(undefined, ["dad"]);
    s.append("a", "1");
    s.append("d", "3");
    s.append("b", "4");
    s.append("dad", "4");
    assertEquals(s.toString(), "a=1&b=4&d=3");
});
