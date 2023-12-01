type EventMap = {
    "finished": number;
    "progress": number;
};

export class ProgressReadable extends EventTarget {
    readable: ReadableStream<Uint8Array>;
    readed: number;
    error?: unknown;
    timeout: number;
    get signal() {
        return this.#controller.signal;
    }
    get is_timeout() {
        return this.#is_timeout;
    }
    #controller: AbortController;
    #is_timeout: boolean;
    #timeout?: number;
    constructor(
        readable: ReadableStream<Uint8Array>,
        timeout: number,
        originalSignal?: AbortSignal,
    ) {
        super();
        this.readed = 0;
        this.timeout = timeout;
        this.#is_timeout = false;
        const reader = readable.getReader();
        this.#controller = new AbortController();
        originalSignal?.addEventListener("abort", () => {
            this.#controller.abort();
            this.#clearTimeout();
        });
        this.readable = new ReadableStream({
            pull: (c) => {
                if (c.byobRequest) {
                    throw Error("Unimplemented.");
                } else {
                    reader.read().then((v) => {
                        if (v.done) {
                            this.dispatchEvent("finished", this.readed);
                            c.close();
                            this.#clearTimeout();
                            return;
                        } else {
                            this.readed += v.value.byteLength;
                            this.dispatchEvent("progress", this.readed);
                            c.enqueue(v.value);
                            if (v.value.byteLength != 0) {
                                this.#clearTimeout();
                                this.#setTimeout();
                            }
                        }
                    }).catch((e) => {
                        try {
                            c.close();
                        } catch (_) {
                            null;
                        }
                        this.error = e;
                        this.#clearTimeout();
                    });
                }
            },
            cancel: (reason) => {
                try {
                    if (!readable.locked) readable.cancel(reason);
                    this.#clearTimeout();
                } catch (_) {
                    null;
                }
            },
            type: "bytes",
        });
        this.#setTimeout();
    }
    #clearTimeout() {
        if (this.#timeout) {
            clearTimeout(this.#timeout);
        }
    }
    #setTimeout() {
        this.#timeout = setTimeout(() => {
            this.#is_timeout = true;
            this.#controller.abort();
            console.log("aborted");
        }, this.timeout);
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
