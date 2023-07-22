type EventMap = {
    "finished": number;
    "progress": number;
};

export class ProgressReadable extends EventTarget {
    readable: ReadableStream<Uint8Array>;
    readed: number;
    error?: unknown;
    constructor(readable: ReadableStream<Uint8Array>) {
        super();
        this.readed = 0;
        const reader = readable.getReader();
        this.readable = new ReadableStream({
            pull: (c) => {
                if (c.byobRequest) {
                    throw Error("Unimplemented.");
                } else {
                    reader.read().then((v) => {
                        if (v.done) {
                            this.dispatchEvent("finished", this.readed);
                            c.close();
                            return;
                        } else {
                            this.readed += v.value.byteLength;
                            this.dispatchEvent("progress", this.readed);
                            c.enqueue(v.value);
                        }
                    }).catch((e) => {
                        c.close();
                        this.error = e;
                    });
                }
            },
            cancel: (reason) => {
                try {
                    readable.cancel(reason);
                } catch (_) {
                    null;
                }
            },
            type: "bytes",
        });
    }
    // @ts-ignore Checked type
    addEventListener<T extends keyof EventMap>(
        type: T,
        callback: (e: CustomEvent<EventMap[T]>) => void | Promise<void>,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, <EventListener> callback, options);
    }
    // @ts-ignore Checked type
    dispatchEvent<T extends keyof EventMap>(type: T, detail: EventMap[T]) {
        return super.dispatchEvent(new CustomEvent(type, { detail }));
    }
    // @ts-ignore Checked type
    removeEventListener<T extends keyof EventMap>(
        type: T,
        callback: (e: CustomEvent<EventMap[T]>) => void | Promise<void>,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(
            type,
            <EventListener> callback,
            options,
        );
    }
}
