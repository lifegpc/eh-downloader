import { signal } from "@preact/signals";
import type _MdOutlinedTextField from "./md3/md-outlined-text-field.ts";

export const MdOutlinedTextField = signal<
    typeof _MdOutlinedTextField | undefined
>(undefined);

export async function load_dmodule() {
    MdOutlinedTextField.value =
        (await import("./md3/md-outlined-text-field.ts")).default;
}
