import express from 'express';
import {
    Transaction,
    calcTransactionHistoryDiff,
    getTransaction,
    getTransactions,
    insertTransaction,
    updateTransaction
} from "../services/transaction-service";
import {getBalance} from "../services/balance-service";
import {getSessionFromReq} from "../services/session-service";
import {AppDataSource} from "../core/database";
import {ServerError} from "../core/server-error";

export const transactionsRouter = express.Router();


transactionsRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let {
            from,
            to,
            start,
            count,
            order,
            pending,
            category,
            note,
        } = req.query;
        if (typeof from !== 'string') {
            throw new ServerError(400, 'field "from" is missing from query');
        }
        if (typeof to !== 'string') {
            throw new ServerError(400, 'field "to" is missing from query');
        }
        if (typeof start !== 'string') {
            throw new ServerError(400, 'field "start" is missing from query');
        }
        if (typeof count !== 'string') {
            throw new ServerError(400, 'field "count" is missing from query');
        }
        if (note && typeof note !== 'string') {
            throw new ServerError(400, 'field "note" must be a string');
        }

        const startInt = parseInt(start);
        const offsetInt = parseInt(count);
        const effectiveFrom = new Date(from);
        let effectiveTo = new Date(to);
        let reverseOrder = order === 'asc';
        const excludePending = pending === 'false';
        let categoryFilter = undefined;
        if (category && typeof category === 'string') {
            categoryFilter = parseInt(category);
        }

        const now = new Date();
        if (excludePending
            && now >= effectiveFrom
            && now < effectiveTo) {
            effectiveTo = new Date();
        }

        let result = await getTransactions(
            session.organization.id,
            effectiveFrom,
            effectiveTo,
            startInt,
            offsetInt,
            reverseOrder,
            categoryFilter,
            note,
            session.organization.previewRecurringCount,
        );
        res.send(result);
    } catch (err) {
        next(err);
    }
});

transactionsRouter.get('/:id([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let id = req.params['id'] ?? '0';
        let result = await getTransaction(session.organization.id, id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

transactionsRouter.get('/:id([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/history', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let id = req.params['id'] ?? '0';
        let result = await calcTransactionHistoryDiff(session.organization.id, id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

transactionsRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let transactionReq = req.body;
        let transaction: Transaction = {
            id: '',
            rowIdx: 1,
            refId: transactionReq.refId,
            category: transactionReq.category,
            insertTimestamp: new Date(),
            pending: undefined,
            effectiveTimestamp: new Date(transactionReq.effectiveTimestamp),
            value: Math.round(transactionReq.value),
            value19: Math.round(transactionReq.value19),
            value7: Math.round(transactionReq.value7),
            vat19: Math.round(transactionReq.vat19),
            vat7: Math.round(transactionReq.vat7),
            note: transactionReq.note,
        };

        if (transaction.note && transaction.note.length > 128) {
            throw new ServerError(400, 'field "note" is too long (128 characters)');
        }

        let result = await insertTransaction(AppDataSource.manager, session.organization.id, transaction);

        res.send({success: result !== 0});
    } catch (err) {
        next(err);
    }
});

transactionsRouter.put('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let transactionReq = req.body;
        let transaction: Transaction = {
            id: transactionReq.id,
            rowIdx: transactionReq.rowIdx,
            refId: transactionReq.refId,
            category: transactionReq.category,
            insertTimestamp: new Date(),
            pending: undefined,
            effectiveTimestamp: new Date(transactionReq.effectiveTimestamp),
            value: Math.round(transactionReq.value),
            value19: Math.round(transactionReq.value19),
            value7: Math.round(transactionReq.value7),
            vat19: Math.round(transactionReq.vat19),
            vat7: Math.round(transactionReq.vat7),
            note: transactionReq.note,
        };

        if (transaction.note && transaction.note.length > 128) {
            throw new ServerError(400, 'field "note" is too long (128 characters)');
        }

        let result = await updateTransaction(session.organization.id, transaction);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

transactionsRouter.get('/balance', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let {from, to, category, note} = req.query;
        if (typeof from !== 'string') {
            throw new ServerError(400, 'field "from" is missing from query');
        }
        if (typeof to !== 'string') {
            throw new ServerError(400, 'field "to" is missing from query');
        }
        if (note && typeof note !== 'string') {
            throw new ServerError(400, 'field "note" must be a string');
        }

        const effectiveFrom = new Date(from);
        const effectiveTo = new Date(to);
        let categoryFilter = undefined;
        if (category && typeof category === 'string') {
            categoryFilter = parseInt(category);
        }

        let result = await getBalance(session.organization.id, effectiveFrom, effectiveTo, categoryFilter, note);
        res.send(result);
    } catch (err) {
        next(err);
    }
});
