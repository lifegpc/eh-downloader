import { assert, assertEquals } from "std/testing/asserts.ts";
import { parse_range } from "./range_parser.ts";

Deno.test("parse_range_test", () => {
    let r = parse_range(200, "bytes=1-30, 50-70");
    assert(typeof r !== "number");
    assertEquals(r.type, "bytes");
    assertEquals(r.slice(0), [{ start: 1, end: 30 }, { start: 50, end: 70 }]);
    r = parse_range(100, "bytes=20-,50-");
    assert(typeof r !== "number");
    assertEquals(r.type, "bytes");
    assertEquals(r.slice(0), [{ start: 20, end: 99 }, { start: 50, end: 99 }]);
    r = parse_range(100, "bytes=-3");
    assert(typeof r !== "number");
    assertEquals(r.type, "bytes");
    assertEquals(r.slice(0), [{ start: 97, end: 99 }]);
    r = parse_range(100, "bytes=-10,1-30, 70-96");
    assert(typeof r !== "number");
    assertEquals(r.type, "bytes");
    assertEquals(r.slice(0), [
        { start: 90, end: 99 },
        { start: 1, end: 30 },
        { start: 70, end: 96 },
    ]);
    r = parse_range(100, "bytes=-10,1-30,70-96", true);
    assert(typeof r !== "number");
    assertEquals(r.type, "bytes");
    assertEquals(r.slice(0), [{ start: 70, end: 99 }, { start: 1, end: 30 }]);
});
