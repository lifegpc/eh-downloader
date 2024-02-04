type EventMap = {
    "finished": number;
    "progress": number;
};

export class ProgressReadable extends EventTarget {
    readable: ReadableStream<Uint8Array>;
    readed: number;
    error?: unknown;
    timeout: number;
    interval: number;
    get signal() {
        return this.#controller.signal;
    }
    get is_timeout() {
        return this.#is_timeout;
    }
    #controller: AbortController;
    #is_timeout: boolean;
    #timeout?: number;
    #last_readed: number;
    constructor(
        readable: ReadableStream<Uint8Array>,
        timeout: number,
        interval: number,
        originalSignal?: AbortSignal,
    ) {
        super();
        this.readed = 0;
        this.timeout = timeout;
        this.interval = interval;
        this.#is_timeout = false;
        this.#last_readed = Date.now();
        const reader = readable.getReader();
        this.#controller = new AbortController();
        originalSignal?.addEventListener("abort", () => {
            this.#controller.abort();
            this.#clearInterval();
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
                            this.#clearInterval();
                            return;
                        } else {
                            const len = v.value.byteLength;
                            this.readed += len;
                            this.dispatchEvent("progress", this.readed);
                            c.enqueue(v.value);
                            if (len != 0) {
                                this.#last_readed = Date.now();
                            }
                        }
                    }).catch((e) => {
                        try {
                            c.close();
                        } catch (_) {
                            null;
                        }
                        this.error = e;
                        this.#clearInterval();
                    });
                }
            },
            cancel: (reason) => {
                try {
                    if (!readable.locked) readable.cancel(reason);
                    this.#clearInterval();
                } catch (_) {
                    null;
                }
            },
            type: "bytes",
        });
        this.#setInterval();
    }
    #clearInterval() {
        if (this.#timeout) {
            clearInterval(this.#timeout);
            this.#timeout = undefined;
        }
    }
    #setInterval() {
        this.#timeout = setInterval(() => {
            const now = Date.now();
            if (now - this.#last_readed > this.timeout) {
                this.#is_timeout = true;
                this.#controller.abort();
                this.#clearInterval();
            }
        }, this.interval);
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
