import express from 'express';
import {getSessionFromReq} from "../../services/session-service";
import {
    deleteRecurringTransaction,
    getRecurringTransactions,
    insertRecurringTransaction,
    RecurringTransaction
} from "../../services/recurring-transaction-service";
import {getConnection} from "../../core/database";

export const recurringTransactionsRouter = express.Router();


recurringTransactionsRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let result = await getRecurringTransactions(session.organization.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

recurringTransactionsRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let recurringReq = req.body;
        let recurring: RecurringTransaction = {
            id: '',
            insertTimestamp: new Date(),
            timezone: recurringReq.timezone,
            executionPolicy: recurringReq.executionPolicy,
            executionPolicyData: recurringReq.executionPolicyData,
            firstExecution: new Date(recurringReq.firstExecution),
            nextExecution: new Date(recurringReq.nextExecution),
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
            // TODO: Logging & error handling :)
            console.error('note too long!');
            res.status(400);
            res.send({success: false});
        }

        let result: number = 0;
        const conn = await getConnection();
        try {
            result = await insertRecurringTransaction(session.organization.id, recurring);
        } finally {
            conn.release();
        }

        res.send({success: result !== 0});
    } catch (err) {
        next(err);
    }
});

recurringTransactionsRouter.delete('/:id([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

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
