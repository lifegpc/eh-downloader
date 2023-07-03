import { MdOutlinedTextField as _MdOutlinedTextField } from "@material/web/textfield/outlined-text-field.js?target=es2022";
import { createComponent } from "@lit-labs/react/?target=es2022";
import * as Preact from "preact/compat";

const MdOutlinedTextField = createComponent({
    tagName: "md-outlined-text-field",
    elementClass: _MdOutlinedTextField,
    // @ts-ignore Checked
    react: Preact,
});

export { _MdOutlinedTextField as MdOutlinedTextField };
export default MdOutlinedTextField;
