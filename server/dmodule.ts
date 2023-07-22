import { signal } from "@preact/signals";
import type {
    MdDialog as _MdDialog,
    MdMenu as _MdMenu,
    MdMenuItem as _MdMenuItem,
    MdOutlinedButton as _MdOutlinedButton,
    MdOutlinedSelect as _MdOutlinedSelect,
    MdOutlinedTextField as _MdOutlinedTextField,
    MdSelectOption as _MdSelectOption,
    MdTextButton as _MdTextButton,
    MdTonalButton as _MdTonalButton,
} from "./md3.ts";
import type _bs5 from "./bs5.ts";

export const MdOutlinedTextField = signal<
    typeof _MdOutlinedTextField | undefined
>(undefined);

export const MdOutlinedButton = signal<typeof _MdOutlinedButton | undefined>(
    undefined,
);

export const MdTonalButton = signal<typeof _MdTonalButton | undefined>(
    undefined,
);

export const MdSelectOption = signal<typeof _MdSelectOption | undefined>(
    undefined,
);

export const MdOutlinedSelect = signal<typeof _MdOutlinedSelect | undefined>(
    undefined,
);

export const MdDialog = signal<typeof _MdDialog | undefined>(undefined);

export const MdTextButton = signal<typeof _MdTextButton | undefined>(undefined);

export const MdMenu = signal<typeof _MdMenu | undefined>(undefined);

export const MdMenuItem = signal<typeof _MdMenuItem | undefined>(undefined);

export const bs5 = signal<typeof _bs5 | undefined>(undefined);

export async function load_dmodule() {
    const md3 = await import("./md3.ts");
    MdOutlinedTextField.value = md3.MdOutlinedTextField;
    MdOutlinedButton.value = md3.MdOutlinedButton;
    MdTonalButton.value = md3.MdTonalButton;
    MdSelectOption.value = md3.MdSelectOption;
    MdOutlinedSelect.value = md3.MdOutlinedSelect;
    MdDialog.value = md3.MdDialog;
    MdTextButton.value = md3.MdTextButton;
    MdMenu.value = md3.MdMenu;
    MdMenuItem.value = md3.MdMenuItem;
    const b = await import("./bs5.ts");
    bs5.value = b.default;
}
