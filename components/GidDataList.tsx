import { Component } from "preact";
import { GMeta } from "../db.ts";
import { useEffect } from "preact/hooks";
import { GalleryListResult } from "../server/gallery.ts";

type Props = {
    /**@default {false}*/
    jpn_title?: boolean;
    id: string;
};

type State = {
    data?: GMeta[];
};

export default class GidDataList extends Component<Props, State> {
    render() {
        const fetchData = async () => {
            const re = await fetch(
                "/api/gallery/list?all=1&fields=gid,title,title_jpn",
            );
            const d: GalleryListResult = await re.json();
            if (d.ok) {
                this.setState({ data: d.data });
            }
        };
        useEffect(() => {
            fetchData().catch((e) => console.error(e));
        }, []);
        return (
            <datalist id={this.props.id}>
                {this.state.data
                    ? this.state.data.map((d) => {
                        let title = d.title;
                        if (this.props.jpn_title && d.title_jpn) {
                            title = d.title_jpn;
                        }
                        return <option value={d.gid}>{title}</option>;
                    })
                    : null}
            </datalist>
        );
    }
}
