import express from "express";
import {getSessionFromReq} from "../services/session-service";
import {createOrganization, getOrganizationsForUser} from "../services/organization-service";
import {ServerError} from "../core/server-error";
import {forbidden} from "../core/response-helpers";

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
        console.log(useTaxes);
        let previewCount = 3;
        if (previewRecurringCount) {
            previewCount = parseInt(previewRecurringCount);
        }

        const orgId = await createOrganization(session.user.id, {
            id: '',
            name: name,
            currency: currency,
            usesTaxes: useTaxes,
            previewRecurringCount: previewCount,
            privileges: [],
        });

        session.user.organizations = await getOrganizationsForUser(session.user.id);

        res.send({success: true, organizationId: orgId});
    } catch (err) {
        next(err);
    }
});
