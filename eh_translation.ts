import type { EhDb } from "./db.ts";
import { asyncForEach } from "./utils.ts";

export type GHAuthor = {
    name: string;
    email: string;
    when: string;
};
export type EHTHeader = {
    sha: string;
    message: string;
    author: GHAuthor;
    committer: GHAuthor;
};
export type EHTData = {
    namespace: string;
    frontMatters: {
        name: string;
        description: string;
        key: string;
        rules: string[];
    };
    count: number;
    data: {
        [x: string]: {
            name: string;
            intro: string;
            links: string;
        };
    };
};
export type EHTTextFile = {
    version: number;
    repo: string;
    head: EHTHeader;
    data: EHTData[];
};

async function fetch_eht_file(signal?: AbortSignal) {
    const re = await fetch(
        "https://github.com/EhTagTranslation/DatabaseReleases/raw/master/db.text.json",
        { signal },
    );
    if (re.status != 200) throw Error("fetch failed");
    return re.text();
}

export async function load_eht_file(
    location: string | undefined = undefined,
    signal?: AbortSignal,
): Promise<EHTTextFile> {
    const s = location === undefined
        ? await fetch_eht_file(signal)
        : await Deno.readTextFile(location, { signal });
    return JSON.parse(s);
}

export async function update_database_tag(
    db: EhDb,
    f: EHTTextFile,
    signal: AbortSignal,
) {
    await Deno.writeTextFile("./utt.lock", "", { create: true, signal });
    for (const d of f.data) {
        await asyncForEach(Object.getOwnPropertyNames(d.data), async (name) => {
            const tag = `${d.namespace}:${name}`;
            const t = d.data[name];
            db.update_tags(tag, t.name, t.intro);
            await Deno.readTextFile("./utt.lock", { signal });
        });
    }
}
