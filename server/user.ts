import type { UserPermission } from "../db.ts";

export type BUser = {
    id: number | bigint;
    username: string;
    is_admin: boolean;
    permissions: UserPermission;
};
