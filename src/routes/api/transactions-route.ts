import express from 'express';
import {getCurrentBalance, getTransactions, insertTransaction, Transaction} from "../../services/transaction-service";
import {Currencies, Money} from "ts-money";

export const transactionsRouter = express.Router();


transactionsRouter.get('/', async (req, res) => {
    let {start, count} = req.query;
    if (typeof start !== 'string') {
        throw new Error('start must be provided in query');
    }
    if (typeof count !== 'string') {
        throw new Error('offset must be provided in query');
    }

    let startInt = parseInt(start);
    let offsetInt = parseInt(count);

    let result = await getTransactions(new Date(1970, 1, 1), startInt, offsetInt);
    res.send(result);
});

transactionsRouter.post('/', async (req, res) => {
    let transactionReq = req.body;
    let transaction: Transaction = {
        id: 0,
        refId: transactionReq.refId,
        insertTimestamp: new Date(),
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

transactionsRouter.get('/balance', async (_req, res) => {
    let result = await getCurrentBalance();
    res.send(result);
});
