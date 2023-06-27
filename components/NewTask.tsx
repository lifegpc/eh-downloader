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
        if (task_type === TaskType.Download) {
            const [gid, set_gid1] = useState<number>();
            const [token, set_token1] = useState<string>();
            const [url, set_url1] = useState<string>();
            const [cfg, set_cfg] = useState(generate_download_cfg());
            const [overwrite_cfg, set_overwrite_cfg1] = useState(false);
            const set_url: StateUpdater<string> = (u) => {
                const n = typeof u === "string" ? u : u(url || "");
                set_url1(n);
                const p = parseUrl(n);
                if (p && p.type !== UrlType.Single) {
                    set_gid1(p.gid);
                    set_token1(p.token);
                }
            };
            const set_gid: StateUpdater<number> = (u) => {
                const g = typeof u === "number" ? u : u(gid || 0);
                set_gid1(g);
                if (g && token) {
                    set_url1(`https://e-hentai.org/g/${g}/${token}/`);
                }
            };
            const set_token: StateUpdater<string> = (u) => {
                const n = typeof u === "string" ? u : u(url || "");
                set_token1(n);
                if (gid && n) {
                    set_url1(`https://e-hentai.org/g/${gid}/${n}/`);
                }
            };
            const set_overwrite_cfg: StateUpdater<boolean> = (u) => {
                const n = typeof u === "boolean" ? u : u(overwrite_cfg);
                set_overwrite_cfg1(n);
                if (n === true) {
                    set_cfg(generate_download_cfg());
                }
            };
            let cfg_div = null;
            if (overwrite_cfg) {
                cfg_div = (
                    <div>
                        <BContext set_value={set_cfg}>
                            <BCheckbox
                                id="d-download_original_img"
                                name="download_original_img"
                                checked={cfg.download_original_img || false}
                                description={t(
                                    "settings.download_original_img",
                                )}
                            />
                            <BCheckbox
                                id="d-mpv"
                                name="mpv"
                                checked={cfg.mpv || false}
                                description={t("settings.mpv")}
                            />
                            <BCheckbox
                                id="d-remove_previous_gallery"
                                name="remove_previous_gallery"
                                checked={cfg.remove_previous_gallery || false}
                                description={t(
                                    "settings.remove_previous_gallery",
                                )}
                            />
                            <BTextField
                                id="d-max_download_img_count"
                                name="max_download_img_count"
                                value={cfg.max_download_img_count || 3}
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
                                value={cfg.max_retry_count || 3}
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
                        value={gid}
                        type="number"
                        description={t("task.gallery_id")}
                        outlined={true}
                        set_value={set_gid}
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
            if (gid && token) {
                submit = () => {
                    return sendTaskMessage({
                        type: "new_download_task",
                        gid,
                        token,
                        cfg: overwrite_cfg ? cfg : undefined,
                    });
                };
                clean = () => {
                    set_gid1(undefined);
                    set_token1(undefined);
                    set_url1(undefined);
                };
            }
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
                        <Fab class="close" mini={true}>
                            <Icon onClick={close}>close</Icon>
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
