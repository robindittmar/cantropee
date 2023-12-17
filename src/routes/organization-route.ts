import express from "express";
import {getSessionFromReq, updateSessionCache} from "../services/session-service";
import {addUserToOrganization, createOrganization, getOrganizationsForUser} from "../services/organization-service";
import {ServerError} from "../core/server-error";
import {forbidden} from "../core/response-helpers";
import {getUserByEmail} from "../services/user-service";
import {AppDataSource} from "../core/database";

export const organizationRouter = express.Router();


organizationRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        if (!session.user.settings.canCreateInvite) {
            forbidden(res);
            return;
        }

        const {
            name,
            currency,
            useTaxes,
            previewRecurringCount,
        } = req.body;

        if (!name || typeof name !== 'string') {
            throw new ServerError(400, '"name" must be string');
        }
        if (!currency || typeof currency !== 'string') {
            throw new ServerError(400, '"currency" must be string');
        }
        if (!useTaxes || typeof useTaxes !== 'boolean') {
            throw new ServerError(400, '"useTaxes" must be boolean');
        }

        let previewCount = 3;
        if (previewRecurringCount) {
            previewCount = parseInt(previewRecurringCount);
        }

        let orgId: string = '';
        await AppDataSource.manager.transaction(async t => {
            const createOrgResult = await createOrganization(t, {
                id: '',
                name: name,
                currency: currency,
                usesTaxes: useTaxes,
                previewRecurringCount: previewCount,
                privileges: [],
            });
            await addUserToOrganization(t, createOrgResult.organizationId, session.user.id, createOrgResult.adminRoleId);

            orgId = createOrgResult.organizationId;
        });

        session.user.organizations = await getOrganizationsForUser(session.user.id);
        updateSessionCache(session);

        res.send({success: true, organizationId: orgId});
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/user', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        if (!session.organization.privileges.includes('admin')) {
            forbidden(res);
            return;
        }

        const {email, roleId} = req.body;

        if (!email || typeof email !== 'string') {
            throw new ServerError(400, '"email" must be string');
        }

        const [user] = await getUserByEmail(email);
        await addUserToOrganization(AppDataSource.manager, session.organization.id, user.id, roleId);

        res.send({success: true});
    } catch (err) {
        next(err);
    }
});
