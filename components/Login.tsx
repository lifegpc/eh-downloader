import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import BMd3TextField from "./BMd3TextField.tsx";
import t from "../server/i18n.ts";
import { useState } from "preact/hooks";
import { MdTonalButton } from "../server/dmodule.ts";
import { set_state } from "../server/state.ts";
import pbkdf2Hmac from "pbkdf2-hmac/?target=es2022";
import { encodeBase64 as encode } from "std/encoding/base64.ts";

type Props = {
    show: boolean;
};

export default class Login extends Component<Props> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return null;
        if (!MdTonalButton.value) return null;
        const [username, set_username] = useState<string>();
        const [password, set_password] = useState<string>();
        const [disabled, set_disabled] = useState(false);
        const login = async (username: string, password: string) => {
            set_disabled(true);
            const b = new URLSearchParams();
            b.append("username", username);
            const p = new Uint8Array(
                await pbkdf2Hmac(
                    password,
                    "eh-downloader-salt",
                    210000,
                    64,
                    "SHA-512",
                ),
            );
            const t = (new Date()).getTime();
            const p2 = encode(
                new Uint8Array(
                    await pbkdf2Hmac(p, t.toString(), 1000, 64, "SHA-512"),
                ),
            );
            b.append("password", p2);
            b.append("t", t.toString());
            b.append("set_cookie", "1");
            if (document.location.protocol === "https:") {
                b.append("secure", "1");
            }
            const re2 = await fetch("/api/token", { method: "PUT", body: b });
            const token = await re2.json();
            if (!token.ok) {
                throw Error(token.error);
            }
        };
        const Button = MdTonalButton.value;
        return (
            <div>
                <BMd3TextField
                    label={t("user.username")}
                    type="text"
                    value={username}
                    set_value={set_username}
                />
                <BMd3TextField
                    label={t("user.password")}
                    type="password"
                    value={password}
                    set_value={set_password}
                />
                <Button
                    disabled={disabled || !username || !password}
                    onClick={() => {
                        if (!username || !password) return;
                        login(username, password).then(() => {
                            set_disabled(false);
                            set_state("#/");
                        }).catch((e) => {
                            console.error(e);
                            set_disabled(false);
                        });
                    }}
                >
                    {t("user.login")}
                </Button>
            </div>
        );
    }
}
