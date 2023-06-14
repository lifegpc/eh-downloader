import { MeiliSearch } from "meilisearch";

async function gen_key(host: string, master_key: string) {
    const client = new MeiliSearch({ host, apiKey: master_key });
    const key = await client.createKey({
        name: "eh_downloader_update_key",
        description: "EH Downloader Update Key",
        actions: ["*"],
        indexes: ["gmeta"],
        expiresAt: null,
    });
    console.log("Update Key: ", key.key);
    const skey = await client.createKey({
        name: "eh_downloader_search_key",
        description: "EH Downloader Search Key",
        actions: ["search"],
        indexes: ["gmeta"],
        expiresAt: null,
    });
    console.log("Search Key: ", skey.key);
}

function show_help() {
    console.log("gen_meili_server_key <HOST> <MASTER_KEY>");
}

if (Deno.args.length < 2) {
    show_help();
    Deno.exit(0);
}

const host = Deno.args[0];
const master_key = Deno.args[1];
gen_key(host, master_key);
