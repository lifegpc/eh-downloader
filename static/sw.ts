import {
    ActivateEvent,
} from "https://gist.githubusercontent.com/ithinkihaveacat/227bfe8aa81328c5d64ec48f4e4df8e5/raw/f69f0783e69f5827b20dbe3f3509ddbf73933768/service-worker.d.ts";

async function get_deploy_id(): Promise<string | undefined> {
    const re = await (await fetch("/api/deploy_id")).json();
    return re.id;
}

let deploy_id: string | undefined = undefined;
let inited = false;

const deleteCache = async (key: string) => {
    await caches.delete(key);
};

const deleteOldCaches = async () => {
    deploy_id = await get_deploy_id();
    inited = true;
    const keyList = await caches.keys();
    const cachesToDelete = keyList.filter((key) => key !== deploy_id);
    await Promise.all(cachesToDelete.map(deleteCache));
};

/**@ts-ignore */
self.addEventListener("activate", (event: ActivateEvent) => {
    event.waitUntil(deleteOldCaches());
});

const CACHES = [
    "/common.css",
    "/hide-scrollbar.css",
    "/preact-material-components/style.css",
];

function match_url(u: URL) {
    const pn = u.pathname;
    const ori = u.origin;
    if (ori == self.location.origin) {
        if (CACHES.includes(pn)) return true;
        if (pn.startsWith("/_frsh/")) return true;
    }
    if (ori === "https://fonts.gstatic.com") return true;
    return false;
}

/**@ts-ignore */
self.addEventListener("fetch", async (e: FetchEvent) => {
    const u = new URL(e.request.url);
    if (u.origin === self.location.origin && u.pathname.startsWith("/api/")) {
        return;
    }
    if (!inited) await deleteOldCaches();
    const r = e.request;
    const responseFromCache = await caches.match(r);
    if (responseFromCache) {
        return responseFromCache;
    }
    const res = await fetch(r);
    if (res.ok) {
        const url = new URL(r.url);
        if (deploy_id && match_url(url)) {
            const cache = await caches.open(deploy_id);
            await cache.put(r, res.clone());
        }
    }
    return res;
});
