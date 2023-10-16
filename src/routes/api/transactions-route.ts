import express from 'express';
import {getCurrentBalance, getTransactions, insertTransaction, Transaction} from "../../services/transaction-service";

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
    let transactionReq = req.body.json();
    let transaction: Transaction = {
        id: 0,
        refId: transactionReq.refId,
        insertTimestamp: new Date(),
        effectiveTimestamp: transactionReq.effectiveTimestamp,
        value: transactionReq.value,
        value19: transactionReq.value19,
        value7: transactionReq.value7,
        vat19: transactionReq.vat19,
        vat7: transactionReq.vat7,
    };
    let result = await insertTransaction(transaction);

    res.send(result);
});

transactionsRouter.get('/balance', async (_req, res) => {
    let result = await getCurrentBalance();
    res.send(result);
});
