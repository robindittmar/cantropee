import express from 'express';
import {createInvite, useInvite, validateInvite} from "../services/invite-service";
import {getSessionFromReq} from "../services/session-service";
import {ServerError} from "../core/server-error";
import {badRequest, badRequestMissingField} from "../core/response-helpers";
import {VALID_CURRENCIES} from "../core/currency";
import {validateEmail, validateOrganizationName, validatePassword} from "../core/validate-helper";
import {getEmailAvailable} from "../services/user-service";

export const inviteRouter = express.Router();

inviteRouter.post('/', async (req, res, _next) => {
    const session = getSessionFromReq(req);

    if (!session.user.settings.canCreateInvite) {
        throw new ServerError(403, 'User not allowed to create invites');
    }

    const invite = await createInvite(session.user.id);
    res.send(invite);
});

inviteRouter.post('/validate', async (req, res, next) => {
    try {
        const {inviteId} = req.body;
        if (!inviteId || typeof inviteId !== 'string') {
            badRequestMissingField(res, 'inviteId');
            return;
        }

        const valid = await validateInvite(inviteId);
        res.send({valid});
    } catch (err) {
        next(err);
    }
});

inviteRouter.post('/check-mail', async (req, res, next) => {
    try {
        let {inviteId, email} = req.body;
        if (!inviteId || typeof inviteId !== 'string') {
            badRequestMissingField(res, 'inviteId');
            return;
        }
        if (!email || typeof email !== 'string') {
            badRequestMissingField(res, 'email');
            return;
        }

        if (!await validateInvite(inviteId)) {
            badRequest(res, 'The provided invite is not valid');
        }

        const avail = await getEmailAvailable(email);
        res.send({available: avail});
    } catch (err) {
        next(err);
    }
});

inviteRouter.post('/use', async (req, res, next) => {
    try {
        const {
            inviteId,
            organization,
            currency,
            useTaxes,
            email,
            password,
        } = req.body;

        if (!inviteId || typeof inviteId !== 'string') {
            badRequestMissingField(res, 'inviteId');
            return;
        }
        if (!organization || typeof organization !== 'string') {
            badRequestMissingField(res, 'organization');
            return;
        }
        if (!currency || typeof currency !== 'string') {
            badRequestMissingField(res, 'currency');
            return;
        }
        if (typeof useTaxes !== 'boolean') {
            badRequestMissingField(res, 'useTaxes');
            return;
        }
        if (!email || typeof email !== 'string') {
            badRequestMissingField(res, 'email');
            return;
        }
        if (!password || typeof password !== 'string') {
            badRequestMissingField(res, 'password');
            return;
        }

        if (!validateEmail(email)) {
            badRequest(res, `${email} is not a valid e-mail`);
        }
        if (!VALID_CURRENCIES.includes(currency)) {
            badRequest(res, `${currency} is not a valid currency`);
            return;
        }

        if (!validatePassword(password)) {
            badRequest(res, 'password does not fulfill system criteria');
        }
        if (!validateOrganizationName(organization)) {
            badRequest(res, `${organization} is not a valid organization name`);
        }

        await useInvite(inviteId, organization, currency, useTaxes, email, password);
        res.send({success: true});
    } catch (err) {
        next(err);
    }
});
