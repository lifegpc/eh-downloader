import { asset } from "$fresh/runtime.ts";
import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";

export type StyleSheetType = {
    href: string;
};

export default class StyleSheet extends Component<StyleSheetType, unknown> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        const href = this.props.href;
        if (this.context) {
            const sheets = this.context.stylesheets;
            if (sheets.has(href)) return null;
            sheets.add(href);
        }
        return <link rel="stylesheet" href={asset(this.props.href)} />;
    }
}
