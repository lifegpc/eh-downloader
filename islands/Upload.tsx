import t, { i18n_map, I18NMap } from "../server/i18n.ts";

export type UploaderProps = {
    i18n?: I18NMap;
    lang?: string;
};

export default function Uploader(props: UploaderProps) {
    if (props.i18n) i18n_map.value = props.i18n;
    return (
        <form
            action="/api/file/upload"
            method="post"
            encType="multipart/form-data"
        >
            <input
                type="file"
                name="file"
                required={true}
                accept=".jpg,.jpeg,.png"
            />
            <br />
            {t("upload.filename")}{" "}
            <input
                type="text"
                name="filename"
                placeholder={t("upload.filename")}
            />
            <br />
            <input id="is_original" type="checkbox" name="is_original" />{" "}
            <label for="is_original">{t("upload.is_original")}</label>
            <br />
            <input
                id="token"
                type="text"
                name="token"
                placeholder={t("upload.token")}
                required={true}
            />
            <br />
            <input type="submit" value={t("upload.upload")} />
        </form>
    );
}
