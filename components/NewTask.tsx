import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import Fab from "preact-material-components/Fab";
import Icon from "preact-material-components/Icon";
import { set_state } from "../server/state.ts";
import t from "../server/i18n.ts";
import BSelect from "./BSelect.tsx";
import { StateUpdater, useRef, useState } from "preact/hooks";
import { TaskType } from "../task.ts";
import BTextField from "./BTextField.tsx";
import { parseUrl, UrlType } from "../url.ts";
import { generate_download_cfg } from "../server/cfg.ts";
import BCheckbox from "./BCheckbox.tsx";
import BContext from "./BContext.tsx";
import Button from "preact-material-components/Button";
import { sendTaskMessage } from "../islands/TaskManager.tsx";
import Snackbar from "preact-material-components/Snackbar";
import { GalleryResult } from "../server/gallery.ts";
import { tw } from "twind";

export type NewTaskProps = {
    show: boolean;
};

export default class NewTask extends Component<NewTaskProps> {
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
        if (task_type === TaskType.Download) {
            const set_url: StateUpdater<string> = (u) => {
                const n = typeof u === "string" ? u : u(url || "");
                set_url1(n);
                const p = parseUrl(n);
                if (p && p.type !== UrlType.Single) {
                    set_dgid(p.gid);
                    set_token1(p.token);
                }
            };
            const set_dgid: StateUpdater<number> = (u) => {
                const g = typeof u === "number" ? u : u(dgid || 0);
                set_dgid1(g);
                if (g && token) {
                    set_url1(`https://e-hentai.org/g/${g}/${token}/`);
                }
            };
            const set_token: StateUpdater<string> = (u) => {
                const n = typeof u === "string" ? u : u(url || "");
                set_token1(n);
                if (dgid && n) {
                    set_url1(`https://e-hentai.org/g/${dgid}/${n}/`);
                }
            };
            const set_overwrite_cfg: StateUpdater<boolean> = (u) => {
                const n = typeof u === "boolean" ? u : u(overwrite_cfg);
                set_overwrite_cfg1(n);
                if (n === true) {
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
            const set_ezgid = (g: number) => {
                if (abort) abort.abort();
                set_ezgid1(g);
                if (!isNaN(g)) fetch_ginfo(g);
            };
            let ginfo_div = null;
            if (ginfo?.ok) {
                ginfo_div = (
                    <div>
                        <div>
                            {t("task.gallery_title")}
                            {ginfo.data.meta.title}
                        </div>
                        <div>
                            {t("task.gallery_page")}
                            {ginfo.data.pages.length}
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
            config_div = (
                <div class="export_zip">
                    <BTextField
                        id="ezgid"
                        value={ezgid}
                        description={t("task.gallery_id")}
                        type="number"
                        outlined={true}
                        set_value={set_ezgid}
                    />
                    {ginfo_div}
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
