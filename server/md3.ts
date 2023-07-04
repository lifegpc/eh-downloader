import { MdOutlinedTextField as _MdOutlinedTextField } from "@material/web/textfield/outlined-text-field.js?dts=1";
import { MdOutlinedButton as _MdOutlinedButton } from "@material/web/button/outlined-button.js?dts=1";
import { MdTonalButton as _MdTonalButton } from "@material/web/button/tonal-button.js?dts=1";
import { MdSelectOption as _MdSelectOption } from "@material/web/select/select-option.js?dts=1";
import { MdOutlinedSelect as _MdOutlinedSelect } from "@material/web/select/outlined-select.js?dts=1";
import { createComponent } from "@lit-labs/react/?target=es2022";
import * as Preact from "preact/compat";

export const MdOutlinedTextField = createComponent({
    tagName: "md-outlined-text-field",
    elementClass: _MdOutlinedTextField,
    // @ts-ignore Checked
    react: Preact,
});

export const MdOutlinedButton = createComponent({
    tagName: "md-outlined-button",
    elementClass: _MdOutlinedButton,
    // @ts-ignore Checked
    react: Preact,
});

export const MdTonalButton = createComponent({
    tagName: "md-tonal-button",
    elementClass: _MdTonalButton,
    // @ts-ignore Checked
    react: Preact,
});

export const MdSelectOption = createComponent({
    tagName: "md-select-option",
    elementClass: _MdSelectOption,
    // @ts-ignore Checked
    react: Preact,
});

export const MdOutlinedSelect = createComponent({
    tagName: "md-outlined-select",
    elementClass: _MdOutlinedSelect,
    // @ts-ignore Checked
    react: Preact,
});

export { _MdOutlinedTextField };
export { _MdOutlinedButton };
export { _MdTonalButton };
export { _MdSelectOption };
export { _MdOutlinedSelect };
