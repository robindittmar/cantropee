import {Organization} from "../services/organization-service";

export enum Privileges {
    Read = 'read',
    Write = 'write',
    Admin = 'admin',
}

export const hasAdminPrivilege = (org: Organization): boolean => {
    return org.privileges.includes(Privileges.Admin);
}

export const hasWritePrivilege = (org: Organization): boolean => {
    return org.privileges.includes(Privileges.Write) || org.privileges.includes(Privileges.Admin);
}

export const hasReadPrivilege = (org: Organization): boolean => {
    return org.privileges.includes(Privileges.Read) || org.privileges.includes(Privileges.Admin);
}
