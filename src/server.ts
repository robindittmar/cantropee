import dotenv from 'dotenv';
import logger from 'morgan';
import express, {Request, Response, NextFunction} from 'express';
import cookieParser from "cookie-parser";
import {validateSession} from "./services/session-service";
import {initDatabaseConnection} from "./core/database";
import {loginRouter} from "./routes/login-route";
import {logoutRouter} from "./routes/logout-route";
import {changePasswordRouter} from "./routes/change-password-route";
import {transactionsRouter} from "./routes/transactions-route";
import {recurringTransactionsRouter} from "./routes/recurring-transactions-route";
import {categoriesRouter} from "./routes/categories-route";
import {usersRouter} from "./routes/users-route";
import {exportRouter} from "./routes/export-route";
import {sessionRouter} from "./routes/session-route";
import {housekeep} from "./services/housekeep-service";


async function main() {
    let conf = dotenv.config();
    console.log(`$ initializing with ${JSON.stringify(conf.parsed)}`);

    initDatabaseConnection();

    await housekeep();

    const app = express();
    const port = parseInt(process.env['SERVER_PORT'] ?? '3000');
    const loggerFormat = process.env['NODE_ENV'] === 'production' ? 'short' : 'dev';

    app.use(logger(loggerFormat));
    app.use(express.json());
    app.use(cookieParser());
    app.use(validateSession);

    app.use('/api/login', loginRouter);
    app.use('/api/logout', logoutRouter);
    app.use('/api/change-password', changePasswordRouter);
    app.use('/api/categories', categoriesRouter);
    app.use('/api/transactions', transactionsRouter);
    app.use('/api/recurring', recurringTransactionsRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/session', sessionRouter);
    app.use('/api/export', exportRouter);

    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error(err);
        res.status(500).send({code: 500, status: 'Internal Server Error'});
    });

    app.listen(port, () => {
        console.log(`$ server listening on http://localhost:${port}`);
    });
}

main()
    .catch(e => console.error(e));
