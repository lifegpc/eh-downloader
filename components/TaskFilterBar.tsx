// @ts-nocheck Chips
import { Component } from "preact";
import { Ref, useRef } from "preact/hooks";
import Chips from "preact-material-components/Chips";
import t from "../server/i18n.ts";

export enum TaskStatusFlag {
    None = 0,
    Running = 1 << 0,
    Waiting = 1 << 1,
    Failed = 1 << 2,
    Finished = 1 << 3,
    All = ~(~0 << 4),
}

type Props = {
    value: TaskStatusFlag;
    set_value: (v: TaskStatusFlag) => void;
};

export class TaskFilterBar extends Component<Props> {
    ref: Ref<Chips | null> | undefined;
    get is_all() {
        return this.props.value === TaskStatusFlag.All;
    }
    get is_failed() {
        return (this.props.value & TaskStatusFlag.Failed) !== 0;
    }
    get is_finished() {
        return (this.props.value & TaskStatusFlag.Finished) !== 0;
    }
    get is_running() {
        return (this.props.value & TaskStatusFlag.Running) !== 0;
    }
    get is_waiting() {
        return (this.props.value & TaskStatusFlag.Waiting) !== 0;
    }
    get value() {
        if (this.ref && this.ref.current) {
            const com = this.ref.current.MDComponent;
            if (com) {
                return com.chips.slice(1).reduce(
                    (p, v, i) => v.selected ? p | 1 << i : p,
                    0,
                );
            }
        }
        return TaskStatusFlag.None;
    }
    render() {
        this.ref = useRef<Chips>(null);
        const onClick = () => {
            const co = () => this.props.set_value(this.value);
            setTimeout(co, 0);
        };
        return (
            <Chips ref={this.ref} filter>
                <Chips.Chip
                    selected={this.is_all}
                    onClick={() => {
                        const co = () => {
                            if (this.ref && this.ref.current) {
                                const com = this.ref.current.MDComponent;
                                if (com) {
                                    com.chips.slice(1).forEach((v) => {
                                        v.selected = com.chips[0].selected;
                                    });
                                }
                            }
                            this.props.set_value(this.value);
                        };
                        setTimeout(co, 0);
                    }}
                >
                    <Chips.Checkmark />
                    <Chips.Text>{t("task.all")}</Chips.Text>
                </Chips.Chip>
                <Chips.Chip selected={this.is_running} onClick={onClick}>
                    <Chips.Checkmark />
                    <Chips.Text>{t("task.running")}</Chips.Text>
                </Chips.Chip>
                <Chips.Chip selected={this.is_waiting} onClick={onClick}>
                    <Chips.Checkmark />
                    <Chips.Text>{t("task.waiting")}</Chips.Text>
                </Chips.Chip>
                <Chips.Chip selected={this.is_failed} onClick={onClick}>
                    <Chips.Checkmark />
                    <Chips.Text>{t("task.failed")}</Chips.Text>
                </Chips.Chip>
                <Chips.Chip selected={this.is_finished} onClick={onClick}>
                    <Chips.Checkmark />
                    <Chips.Text>{t("task.finished")}</Chips.Text>
                </Chips.Chip>
            </Chips>
        );
    }
}
