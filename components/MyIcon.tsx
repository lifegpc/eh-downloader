import { Component } from "preact";
import Icon from "preact-material-components/Icon";

type Props = {
    show: boolean;
    icon: string;
};

export default class MyIcon extends Component<Props> {
    render() {
        if (!this.props.show) return;
        return <Icon>{this.props.icon}</Icon>;
    }
}
