import { signal } from "@preact/signals";
import type {
    MdOutlinedButton as _MdOutlinedButton,
    MdOutlinedTextField as _MdOutlinedTextField,
    MdTonalButton as _MdTonalButton,
} from "./md3.ts";

export const MdOutlinedTextField = signal<
    typeof _MdOutlinedTextField | undefined
>(undefined);

export const MdOutlinedButton = signal<typeof _MdOutlinedButton | undefined>(
    undefined,
);

export const MdTonalButton = signal<typeof _MdTonalButton | undefined>(
    undefined,
);

export async function load_dmodule() {
    const md3 = await import("./md3.ts");
    MdOutlinedTextField.value = md3.MdOutlinedTextField;
    MdOutlinedButton.value = md3.MdOutlinedButton;
    MdTonalButton.value = md3.MdTonalButton;
}
