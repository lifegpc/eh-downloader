import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import Fab from "preact-material-components/Fab";
import Icon from "preact-material-components/Icon";
import { set_state } from "../server/state.ts";
import t from "../server/i18n.ts";
import BSelect from "./BSelect.tsx";
import { StateUpdater, useEffect, useRef, useState } from "preact/hooks";
import { TaskType } from "../task.ts";
import BTextField from "./BTextField.tsx";
import { parseUrl, UrlType } from "../url.ts";
import {
    cfg,
    generate_download_cfg,
    generate_export_zip_cfg,
} from "../server/cfg.ts";
import BCheckbox from "./BCheckbox.tsx";
import BContext from "./BContext.tsx";
import Button from "preact-material-components/Button";
import { sendTaskMessage } from "../islands/TaskManager.tsx";
import Snackbar from "preact-material-components/Snackbar";
import { GalleryResult } from "../server/gallery.ts";
import { tw } from "twind";
import { ExportZipConfig } from "../tasks/export_zip.ts";
import { GMeta } from "../db.ts";
import { GalleryListResult } from "../server/gallery.ts";

export type NewTaskProps = {
    show: boolean;
};

type State = {
    gids?: GMeta[];
};

export default class NewTask extends Component<NewTaskProps, State> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return null;
        const [task_type, set_task_type] = useState(TaskType.Download);
        let config_div = null;
        const close = () => {
            set_state((p) => p.slice(0, p.length - 4));
        };
        let submit: (() => boolean) | null = null;
        let clean: (() => void) | null = null;
        const snack = useRef<Snackbar>();
        const show_snack = (message: string) => {
            snack.current?.MDComponent?.show({ message });
        };
        const [dgid, set_dgid1] = useState<number>();
        const [token, set_token1] = useState<string>();
        const [url, set_url1] = useState<string>();
        const [dcfg, set_dcfg] = useState(generate_download_cfg());
        const [overwrite_cfg, set_overwrite_cfg1] = useState(false);
        const [ezgid, set_ezgid1] = useState<number>();
        const [ginfo, set_ginfo] = useState<GalleryResult>();
        const [abort, set_abort] = useState<AbortController>();
        const [ezcfg, set_ezcfg1] = useState(generate_export_zip_cfg());
        const [overwrite_ezcfg, set_overwrite_ezcfg] = useState(false);
        const fetchGidsData = async () => {
            const re = await fetch(
                "/api/gallery/list?all=1&fields=gid,title,title_jpn",
            );
            const d: GalleryListResult = await re.json();
            if (d.ok) {
                this.setState({ ...this.state, gids: d.data });
            }
        };
        useEffect(() => {
            if (task_type === TaskType.ExportZip) {
                fetchGidsData().catch((e) => console.error(e));
            }
        }, [task_type]);
        if (task_type === TaskType.Download) {
            const set_url: StateUpdater<string | undefined> = (u) => {
                const n = typeof u === "string" ? u : u ? u(url) : u;
                set_url1(n);
                if (n) {
                    const p = parseUrl(n);
                    if (p && p.type !== UrlType.Single) {
                        set_dgid(p.gid);
                        set_token1(p.token);
                    }
                }
            };
            const set_dgid: StateUpdater<number | undefined> = (u) => {
                const g = typeof u === "number" ? u : u ? u(dgid) : u;
                set_dgid1(g);
                if (g && token) {
                    set_url1(`https://e-hentai.org/g/${g}/${token}/`);
                }
            };
            const set_token: StateUpdater<string | undefined> = (u) => {
                const n = typeof u === "string" ? u : u ? u(url) : u;
                set_token1(n);
                if (dgid && n) {
                    set_url1(`https://e-hentai.org/g/${dgid}/${n}/`);
                }
            };
            const set_overwrite_cfg = (n: boolean) => {
                set_overwrite_cfg1(n);
                if (n) {
                    set_dcfg(generate_download_cfg());
                }
            };
            let cfg_div = null;
            if (overwrite_cfg) {
                cfg_div = (
                    <div>
                        <BContext set_value={set_dcfg}>
                            <BCheckbox
                                id="d-download_original_img"
                                name="download_original_img"
                                checked={dcfg.download_original_img || false}
                                description={t(
                                    "settings.download_original_img",
                                )}
                            />
                            <BCheckbox
                                id="d-mpv"
                                name="mpv"
                                checked={dcfg.mpv || false}
                                description={t("settings.mpv")}
                            />
                            <BCheckbox
                                id="d-remove_previous_gallery"
                                name="remove_previous_gallery"
                                checked={dcfg.remove_previous_gallery || false}
                                description={t(
                                    "settings.remove_previous_gallery",
                                )}
                            />
                            <BTextField
                                id="d-max_download_img_count"
                                name="max_download_img_count"
                                value={dcfg.max_download_img_count || 3}
                                description={t(
                                    "settings.max_download_img_count",
                                )}
                                type="number"
                                min={1}
                                outlined={true}
                            />
                            <BTextField
                                id="d-max_retry_count"
                                name="max_retry_count"
                                value={dcfg.max_retry_count || 3}
                                description={t("settings.max_retry_count")}
                                type="number"
                                min={1}
                                outlined={true}
                            />
                        </BContext>
                    </div>
                );
            }
            config_div = (
                <div class="download">
                    <BTextField
                        value={url}
                        type="text"
                        description={t("task.gallery_url")}
                        outlined={true}
                        set_value={set_url}
                    />
                    <BTextField
                        value={dgid}
                        type="number"
                        description={t("task.gallery_id")}
                        outlined={true}
                        set_value={set_dgid}
                    />
                    <BTextField
                        value={token}
                        type="text"
                        description={t("task.gallery_token")}
                        outlined={true}
                        set_value={set_token}
                    />
                    <BCheckbox
                        id="d-cfg"
                        checked={overwrite_cfg}
                        description={t("task.overwrite_cfg")}
                        set_value={set_overwrite_cfg}
                    />
                    {cfg_div}
                </div>
            );
            if (dgid && token) {
                submit = () => {
                    return sendTaskMessage({
                        type: "new_download_task",
                        gid: dgid,
                        token,
                        cfg: overwrite_cfg ? dcfg : undefined,
                    });
                };
                clean = () => {
                    set_dgid1(undefined);
                    set_token1(undefined);
                    set_url1(undefined);
                };
            }
        } else if (task_type === TaskType.ExportZip) {
            const export_ad = overwrite_ezcfg
                ? ezcfg.export_ad || false
                : false;
            const jpn_title = overwrite_ezcfg
                ? ezcfg.jpn_title || false
                : cfg.value
                ? cfg.value.export_zip_jpn_title
                : false;
            const fetch_ginfo = (gid: number) => {
                set_abort(new AbortController());
                fetch(`/api/gallery/${gid}`).then(async (res) => {
                    try {
                        set_ginfo(await res.json());
                    } catch (e) {
                        set_ginfo({
                            ok: false,
                            status: -1,
                            error: e.toString(),
                        });
                    }
                }).catch((e) => {
                    set_ginfo({ ok: false, status: -1, error: e.toString() });
                }).finally(() => {
                    set_abort(undefined);
                });
            };
            const set_ezgid = (g: number | undefined) => {
                if (abort) abort.abort();
                set_ezgid1(g);
                if (g !== undefined && !isNaN(g)) fetch_ginfo(g);
            };
            let ginfo_div = null;
            if (ginfo?.ok) {
                let title = ginfo.data.meta.title;
                if (jpn_title && ginfo.data.meta.title_jpn) {
                    title = ginfo.data.meta.title_jpn;
                }
                const count = export_ad
                    ? ginfo.data.pages.length
                    : ginfo.data.pages.reduce((p, c) => c.is_ad ? p : p + 1, 0);
                ginfo_div = (
                    <div>
                        <div>
                            {t("task.gallery_title")}
                            {title}
                        </div>
                        <div>
                            {t("task.gallery_page")}
                            {count}
                        </div>
                    </div>
                );
            } else if (ginfo?.ok === false) {
                ginfo_div = (
                    <div>
                        <div class={tw`text-red-500`}>{ginfo.error}</div>
                    </div>
                );
            }
            const set_ezcfg: StateUpdater<ExportZipConfig> = (v) => {
                set_ezcfg1(v);
                this.forceUpdate();
            };
            const set_overwrite_cfg = (v: boolean) => {
                set_overwrite_ezcfg(v);
                if (v) {
                    set_ezcfg(Object.assign(ezcfg, generate_export_zip_cfg()));
                }
            };
            let cfg_div = null;
            if (overwrite_ezcfg) {
                cfg_div = (
                    <div>
                        <BContext set_value={set_ezcfg}>
                            <BCheckbox
                                id="ez-jpn_title"
                                name="jpn_title"
                                checked={ezcfg.jpn_title || false}
                                description={t("task.ezcfg_jpn_title")}
                            />
                            <BCheckbox
                                id="ez-export_ad"
                                name="export_ad"
                                checked={ezcfg.export_ad || false}
                                description={t("task.ezcfg_export_ad")}
                            />
                            <BTextField
                                name="output"
                                value={ezcfg.output}
                                description={t("task.ezcfg_output")}
                                type="text"
                                outlined={true}
                            />
                            <BTextField
                                name="max_length"
                                value={ezcfg.max_length}
                                description={t("task.ezcfg_max_length")}
                                type="number"
                                outlined={true}
                                min={0}
                            />
                        </BContext>
                    </div>
                );
            }
            const datalist: { value: number; label?: string }[] = [
                {
                    value: 0,
                    label: "点兔",
                },
                {
                    value: 1,
                    label: "点兔",
                },
                {
                    value: 2,
                    label: "点兔",
                },
                {
                    value: 3,
                    label: "点兔",
                },
                {
                    value: 4,
                    label: "点兔",
                },
                {
                    value: 5,
                    label: "点兔",
                },
                {
                    value: 6,
                    label: "点兔",
                },
                {
                    value: 7,
                    label: "点兔",
                },
                {
                    value: 8,
                    label: "点兔",
                },
            ];
            if (this.state.gids) {
                this.state.gids.forEach((g) => {
                    const t = jpn_title && g.title_jpn ? g.title_jpn : g.title;
                    datalist.push({ value: g.gid, label: t });
                });
            }
            config_div = (
                <div class="export_zip">
                    <BTextField
                        value={ezgid}
                        description={t("task.gallery_id")}
                        type="number"
                        outlined={true}
                        set_value={set_ezgid}
                        datalist={datalist}
                    />
                    {ginfo_div}
                    <BCheckbox
                        id="ez-cfg"
                        checked={overwrite_ezcfg}
                        description={t("task.overwrite_cfg")}
                        set_value={set_overwrite_cfg}
                    />
                    {cfg_div}
                </div>
            );
        }
        const sub = () => {
            if (submit) {
                const re = submit();
                if (re) {
                    if (clean) clean();
                    close();
                } else {
                    show_snack(t("task.submit_failed"));
                }
            }
        };
        return (
            <div class="new_task">
                <div class="container">
                    <div class="top">
                        <div class="title">{t("task.add")}</div>
                        <Fab class="close" mini={true} onClick={close}>
                            <Icon>close</Icon>
                        </Fab>
                    </div>
                    <div class="content">
                        <div class="type">
                            {t("task.type")}
                            <BSelect
                                outlined={true}
                                list={[{
                                    value: TaskType.Download,
                                    text: t("task.download"),
                                }, {
                                    value: TaskType.ExportZip,
                                    text: t("task.export_zip"),
                                }]}
                                selectedValue={task_type}
                                set_value={set_task_type}
                            />
                        </div>
                        {config_div}
                    </div>
                    <div class="bottom">
                        <Button disabled={submit === null} onClick={sub}>
                            {t("common.submit")}
                        </Button>
                    </div>
                </div>
                <Snackbar ref={snack} />
            </div>
        );
    }
}
