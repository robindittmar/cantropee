import express from 'express';
import {
    getBalance,
    getTransaction,
    getTransactions,
    insertTransaction,
    Transaction
} from "../../services/transaction-service";
import {Currencies, Money} from "ts-money";

export const transactionsRouter = express.Router();


transactionsRouter.get('/', async (req, res) => {
    let {
        from,
        to,
        start,
        count,
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
    const excludePending = pending === 'false';

    const now = new Date();
    if (excludePending
        && now >= effectiveFrom
        && now < effectiveTo) {
        effectiveTo = new Date();
    }

    let result = await getTransactions(effectiveFrom, effectiveTo, startInt, offsetInt);
    res.send(result);
});

transactionsRouter.get('/:id(\\d+)', async (req, res) => {
    let id = parseInt(req.params['id'] ?? '0');
    if (id.toString() != req.params['id']) {
        throw new Error('id must be a number');
    }

    let result = await getTransaction(id);
    res.send(result);
});

transactionsRouter.post('/', async (req, res) => {
    let transactionReq = req.body;
    let transaction: Transaction = {
        id: 0,
        refId: transactionReq.refId,
        category: transactionReq.category,
        insertTimestamp: new Date(),
        pending: undefined,
        effectiveTimestamp: new Date(transactionReq.effectiveTimestamp),
        value: new Money(transactionReq.value, Currencies['EUR']!),
        value19: new Money(transactionReq.value19, Currencies['EUR']!),
        value7: new Money(transactionReq.value7, Currencies['EUR']!),
        vat19: new Money(transactionReq.vat19, Currencies['EUR']!),
        vat7: new Money(transactionReq.vat7, Currencies['EUR']!),
    };
    let result = await insertTransaction(transaction);

    res.send(result);
});

transactionsRouter.get('/balance', async (req, res) => {
    let {from, to} = req.query;
    if (typeof from !== 'string') {
        throw new Error('from must be provided in query');
    }
    if (typeof to !== 'string') {
        throw new Error('to must be provided in query');
    }

    const effectiveFrom = new Date(from);
    const effectiveTo = new Date(to);

    let result = await getBalance(effectiveFrom, effectiveTo);
    res.send(result);
});
