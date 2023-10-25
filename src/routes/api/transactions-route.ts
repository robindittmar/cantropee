import express from 'express';
import {
    getBalance,
    getTransaction,
    getTransactions,
    insertTransaction,
    Transaction, updateTransaction
} from "../../services/transaction-service";
import {Currencies, Money} from "ts-money";
import {getSessionFromReq} from "../../services/session-service";
import {getConnection} from "../../core/database";

export const transactionsRouter = express.Router();


transactionsRouter.get('/', async (req, res) => {
    const session = getSessionFromReq(req);

    let {
        from,
        to,
        start,
        count,
        order,
        pending,
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

    const now = new Date();
    if (excludePending
        && now >= effectiveFrom
        && now < effectiveTo) {
        effectiveTo = new Date();
    }

    let result = await getTransactions(
        session.organizationId,
        effectiveFrom,
        effectiveTo,
        startInt,
        offsetInt,
        reverseOrder
    );
    res.send(result);
});

transactionsRouter.get('/:id(^[0-9a-fA-F]{8}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{12}$)', async (req, res) => {
    const session = getSessionFromReq(req);

    let id = req.params['id'] ?? '0';
    let result = await getTransaction(session.organizationId, id);
    res.send(result);
});

transactionsRouter.post('/', async (req, res) => {
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
        value: new Money(Math.round(transactionReq.value), Currencies['EUR']!),
        value19: new Money(Math.round(transactionReq.value19), Currencies['EUR']!),
        value7: new Money(Math.round(transactionReq.value7), Currencies['EUR']!),
        vat19: new Money(Math.round(transactionReq.vat19), Currencies['EUR']!),
        vat7: new Money(Math.round(transactionReq.vat7), Currencies['EUR']!),
        note: transactionReq.note,
    };

    if (transaction.note && transaction.note.length > 128) {
        // TODO: Logging & error handling :)
        console.error('note too long!');
        res.status(400);
        res.send({success: false});
    }

    let result = await insertTransaction(await getConnection(), session.organizationId, transaction);

    res.send(result);
});

transactionsRouter.put('/', async (req, res) => {
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
        value: new Money(Math.round(transactionReq.value), Currencies['EUR']!),
        value19: new Money(Math.round(transactionReq.value19), Currencies['EUR']!),
        value7: new Money(Math.round(transactionReq.value7), Currencies['EUR']!),
        vat19: new Money(Math.round(transactionReq.vat19), Currencies['EUR']!),
        vat7: new Money(Math.round(transactionReq.vat7), Currencies['EUR']!),
        note: transactionReq.note,
    };

    if (transaction.note && transaction.note.length > 128) {
        // TODO: Logging & error handling :)
        console.error('note too long!');
        res.status(400);
        res.send({success: false});
    }

    let result = await updateTransaction(session.organizationId, transaction);

    res.send({id: result});
});

transactionsRouter.get('/balance', async (req, res) => {
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

    let result = await getBalance(session.organizationId, effectiveFrom, effectiveTo);
    res.send(result);
});
