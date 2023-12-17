import express from 'express';
import {getSessionFromReq} from "../services/session-service";
import {deleteRole, getRoles, insertRole, updateRole, UserRole} from "../services/roles-service";
import {hasAdminPrivilege} from "../core/privileges";
import {badRequestMissingField, forbidden, serverError} from "../core/response-helpers";

export const rolesRouter = express.Router();


rolesRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        if (!hasAdminPrivilege(session.organization)) {
            forbidden(res);
            return;
        }

        const roles = await getRoles(session.organization.id);
        res.send({
            success: true,
            roles: roles,
        });
    } catch (err) {
        next(err);
    }
});

rolesRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        if (!hasAdminPrivilege(session.organization)) {
            forbidden(res);
            return;
        }

        const {name, privileges} = req.body;
        if (!name) {
            badRequestMissingField(res, 'name');
        }
        if (!privileges) {
            badRequestMissingField(res, 'privileges');
        }

        const role: UserRole = {
            id: '',
            name: name,
            privileges: privileges,
        };
        const id = await insertRole(session.organization.id, role);
        if (id === 0) {
            serverError(res, 'could not insert role');
        }

        res.send({
            success: true,
        });
    } catch (err) {
        next(err);
    }
});

rolesRouter.put('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        if (!hasAdminPrivilege(session.organization)) {
            forbidden(res);
            return;
        }

        const {id, name, privileges} = req.body;
        if (!id) {
            badRequestMissingField(res, 'id');
        }
        if (!name) {
            badRequestMissingField(res, 'name');
        }
        if (!privileges) {
            badRequestMissingField(res, 'privileges');
        }

        const role: UserRole = {
            id: id,
            name: name,
            privileges: privileges,
        };
        const result = await updateRole(session.organization.id, role);
        if (!result) {
            serverError(res, 'could not update role');
        }

        res.send({
            success: true,
            role: role,
        });
    } catch (err) {
        next(err);
    }
});

rolesRouter.delete('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        if (!hasAdminPrivilege(session.organization)) {
            forbidden(res);
            return;
        }

        const {id} = req.body;
        if (!id) {
            badRequestMissingField(res, 'id');
            return;
        }

        if (!await deleteRole(session.organization.id, id)) {
            serverError(res, 'Could not delete role');
            return;
        }

        res.send({
            success: true,
        });
    } catch (err) {
        next(err);
    }
});
