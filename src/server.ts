import dotenv from 'dotenv';
import logger from 'morgan';
import express from 'express';
import {initDatabaseConnection} from "./core/database";
import path from "path";
import {indexRouter} from "./routes";
import {transactionsRouter} from "./routes/api/transactions-route";


async function main() {
    dotenv.config();

    initDatabaseConnection();

    const app = express();
    const port = parseInt(process.env['SERVER_PORT'] ?? '3000');
    const loggerFormat = process.env['NODE_ENV'] === 'production' ? 'short' : 'dev';

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    app.use(logger(loggerFormat))
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));

    app.use('/', indexRouter);
    app.use('/api/transactions', transactionsRouter);

    app.listen(port, () => {
        console.log(`$ server listening on http://localhost:${port}`);
    });
}

main()
    .catch(e => console.error(e));
