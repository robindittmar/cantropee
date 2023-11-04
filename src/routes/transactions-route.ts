import express from 'express';
import {
    Transaction,
    calcTransactionHistoryDiff,
    getBalance,
    getTransaction,
    getTransactions,
    insertTransaction,
    updateTransaction
} from "../services/transaction-service";
import {getSessionFromReq} from "../services/session-service";
import {getConnection} from "../core/database";

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
        } = req.query;
        if (typeof from !== 'string') {
            throw new Error('from must be provided in query');
        }
        if (typeof to !== 'string') {
            throw new Error('to must be provided in query');
        }
        if (typeof start !== 'string') {
            throw new Error('start must be provided in query');
        }
        if (typeof count !== 'string') {
            throw new Error('count must be provided in query');
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
            categoryFilter
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
            // TODO: Logging & error handling :)
            console.error('note too long!');
            res.status(400);
            res.send({success: false});
        }

        let result: number = 0;
        const conn = await getConnection();
        try {
            result = await insertTransaction(conn, session.organization.id, transaction);
        } finally {
            conn.release();
        }

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
            // TODO: Logging & error handling :)
            console.error('note too long!');
            res.status(400);
            res.send({success: false});
        }

        try {
            let result = await updateTransaction(session.organization.id, transaction);

            res.send(result);
        } catch (err) {
            console.log(err);
            res.status(500);
            res.send({success: false});
        }
    } catch (err) {
        next(err);
    }
});

transactionsRouter.get('/balance', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let {from, to} = req.query;
        if (typeof from !== 'string') {
            throw new Error('from must be provided in query');
        }
        if (typeof to !== 'string') {
            throw new Error('to must be provided in query');
        }

        const effectiveFrom = new Date(from);
        const effectiveTo = new Date(to);

        let result = await getBalance(session.organization.id, effectiveFrom, effectiveTo);
        res.send(result);
    } catch (err) {
        next(err);
    }
});
