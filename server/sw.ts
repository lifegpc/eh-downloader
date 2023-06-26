export async function registeServiceWorker(
    path: string,
    options?: RegistrationOptions,
) {
    const r = await navigator.serviceWorker.getRegistration(path);
    if (r === undefined) {
        return await navigator.serviceWorker.register(path, options);
    }
    return r;
}
