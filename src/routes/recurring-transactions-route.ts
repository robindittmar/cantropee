import express from 'express';
import {getSessionFromReq} from "../services/session-service";
import {
    bookPendingRecurringTransactions,
    deleteRecurringTransaction,
    ensureRecurringPrebooked, getRecurringTransactionByDatabaseId,
    getRecurringTransactions,
    insertRecurringTransaction,
    RecurringTransaction,
} from "../services/recurring-transaction-service";
import {ServerError} from "../core/server-error";
import {hasReadPrivilege, hasWritePrivilege} from "../core/privileges";
import {forbidden, serverError} from "../core/response-helpers";
import {AppDataSource} from "../core/database";

export const recurringTransactionsRouter = express.Router();


recurringTransactionsRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        if (!hasReadPrivilege(session.organization)) {
            forbidden(res);
            return;
        }

        let result = await getRecurringTransactions(session.organization.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

recurringTransactionsRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        if (!hasWritePrivilege(session.organization)) {
            forbidden(res);
            return;
        }

        let recurringReq = req.body;
        let recurring: RecurringTransaction = {
            id: '',
            active: true,
            insertTimestamp: new Date(),
            timezone: recurringReq.timezone,
            executionPolicy: recurringReq.executionPolicy,
            executionPolicyData: recurringReq.executionPolicyData,
            firstExecution: new Date(recurringReq.firstExecution),
            nextExecution: new Date(recurringReq.firstExecution),// on purpose
            lastExecution: recurringReq.lastExecution ? new Date(recurringReq.lastExecution) : undefined,
            category: recurringReq.category,
            value: Math.round(recurringReq.value),
            value19: Math.round(recurringReq.value19),
            value7: Math.round(recurringReq.value7),
            vat19: Math.round(recurringReq.vat19),
            vat7: Math.round(recurringReq.vat7),
            note: recurringReq.note,
        };

        if (recurring.note && recurring.note.length > 128) {
            throw new ServerError(400, 'field "note" is too long (128 characters)');
        }

        const result = await insertRecurringTransaction(AppDataSource.manager, session.organization.id, session.user.id, recurring);
        const success = result !== 0;
        const newRecurring = await getRecurringTransactionByDatabaseId(session.organization.id, result);
        let newTransactions = await bookPendingRecurringTransactions(session.organization.id, session.organization.previewRecurringCount);

        newTransactions = newTransactions.concat(await ensureRecurringPrebooked(session.organization.id, newRecurring, session.organization.previewRecurringCount));

        res.send({success: success, recurring: newRecurring, bookedTransactions: newTransactions});
    } catch (err) {
        next(err);
    }
});

recurringTransactionsRouter.put('/', async (_req, res, next) => {
    try {
        serverError(res, 'Not implemented yet');
        return;

        // const session = getSessionFromReq(req);
        // if (!hasWritePrivilege(session.organization)) {
        //     forbidden(res);
        //     return;
        // }
        //
        // let recurringReq = req.body;
        // let recurring: RecurringTransaction = {
        //     id: recurringReq.id,
        //     active: true,
        //     insertTimestamp: new Date(),
        //     timezone: recurringReq.timezone,
        //     executionPolicy: recurringReq.executionPolicy,
        //     executionPolicyData: recurringReq.executionPolicyData,
        //     firstExecution: new Date(recurringReq.firstExecution),
        //     nextExecution: new Date(recurringReq.nextExecution),
        //     lastExecution: recurringReq.lastExecution ? new Date(recurringReq.lastExecution) : undefined,
        //     category: recurringReq.category,
        //     value: Math.round(recurringReq.value),
        //     value19: Math.round(recurringReq.value19),
        //     value7: Math.round(recurringReq.value7),
        //     vat19: Math.round(recurringReq.vat19),
        //     vat7: Math.round(recurringReq.vat7),
        //     note: recurringReq.note,
        // };
        //
        // if (recurring.note && recurring.note.length > 128) {
        //     throw new ServerError(400, 'field "note" is too long (128 characters)');
        // }
        //
        // await AppDataSource.manager.transaction(async t => {
        //     await updateRecurringTransaction(t, session.organization.id, session.user.id, recurring);
        //     await updatePrebookedTransactions(t, session.organization.id, recurring);
        // });
        //
        // res.send({success: true});
    } catch (err) {
        next(err);
    }
});

recurringTransactionsRouter.delete('/:id([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        if (!hasWritePrivilege(session.organization)) {
            forbidden(res);
            return;
        }

        let {cascade} = req.query;
        if (typeof cascade !== 'string') {
            throw new Error('cascade must be provided in query');
        }

        let id = req.params['id'] ?? '0';
        const result = await deleteRecurringTransaction(session.organization.id, id, cascade === 'true');

        res.send({success: result});
    } catch (err) {
        next(err);
    }
});
