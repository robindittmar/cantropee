import express from 'express';
import {getSessionFromReq} from "../../services/session-service";
import {
    getRecurringTransactions,
    insertRecurringTransaction,
    RecurringTransaction
} from "../../services/recurring-transaction-service";
import {getConnection} from "../../core/database";

export const recurringTransactionsRouter = express.Router();


recurringTransactionsRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let result = await getRecurringTransactions(session.organizationId);
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
            firstExecution: recurringReq.firstExecution,
            nextExecution: recurringReq.nextExecution,
            lastExecution: recurringReq.lastExecution,
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
            result = await insertRecurringTransaction(session.organizationId, recurring);
        } finally {
            conn.release();
        }

        res.send({success: result !== 0});
    } catch (err) {
        next(err);
    }
});
