import path from "path";
import dotenv from 'dotenv';
import logger from 'morgan';
import express, {Request, Response, NextFunction} from 'express';
import cookieParser from "cookie-parser";
import {validateSession} from "./services/session-service";
import {initDatabaseConnection} from "./core/database";
import {loginRouter} from "./routes/login-route";
import {logoutRouter} from "./routes/logout-route";
import {changePasswordRouter} from "./routes/change-password-route";
import {transactionsRouter} from "./routes/api/transactions-route";
import {recurringTransactionsRouter} from "./routes/api/recurring-transactions-route";
import {categoriesRouter} from "./routes/api/categories-route";
import {usersRouter} from "./routes/api/users-route";
import {exportRouter} from "./routes/api/export-route";
import {sessionRouter} from "./routes/api/session-route";


async function main() {
    let conf = dotenv.config();
    console.log(`$ initializing with ${JSON.stringify(conf.parsed)}`);

    initDatabaseConnection();

    const app = express();
    const port = parseInt(process.env['SERVER_PORT'] ?? '3000');
    const loggerFormat = process.env['NODE_ENV'] === 'production' ? 'short' : 'dev';

    app.use(logger(loggerFormat));
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));
    app.use(cookieParser());
    app.use(validateSession);

    app.use('/', express.static(path.join(__dirname, '../static')));
    app.use('/login', loginRouter);
    app.use('/logout', logoutRouter);
    app.use('/change-password', changePasswordRouter);
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
