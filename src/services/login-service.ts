import {Request, Response, NextFunction} from "express";
import {getConnection} from "../core/database";
import {SessionModel} from "../models/session-model";
import {ResultSetHeader} from "mysql2/index";
import {randomUUID} from "crypto";

export const requireLogin = async (req: Request, res: Response, next: NextFunction) => {
    if ('sid' in req.cookies) {
        let sessionId = req.cookies['sid'];

        const conn = await getConnection();
        const [result] = await conn.query<SessionModel[]>(
            'SELECT * FROM `sessions`' +
            ' WHERE `session_id` = ?' +
            ' AND `valid_until` > NOW()',
            [req.cookies['sid']]
        );

        if (result.length > 0) {
            let validUntil = new Date();
            validUntil.setHours(validUntil.getHours() + 1);

            const [result] = await conn.execute<ResultSetHeader>(
                'UPDATE `sessions`' +
                ' SET `valid_until` = ?' +
                ' WHERE `session_id` = ?',
                [
                    validUntil.toISOString().slice(0, 19).replace('T', ' '),
                    sessionId,
                ]
            );

            if (result.affectedRows != 1) {
                throw new Error('Could not update session timestamp');
            }

            next();
        } else {
            // Session invalid
            res.redirect(`/login?redirect=${encodeURI(req.path)}`);
        }
    } else {
        // No session
        res.redirect(`/login?redirect=${encodeURI(req.path)}`);
    }
};

export async function login(password: string): Promise<{ success: boolean, sessionId: string }> {
    if (password == 'tom') {
        let sessionId = randomUUID();
        let validUntil = new Date();
        validUntil.setHours(validUntil.getHours() + 1);

        const conn = await getConnection();
        const [result] = await conn.execute<ResultSetHeader>(
            'INSERT INTO `sessions`' +
            ' (`session_id`, `valid_until`)' +
            ' VALUES (?, ?)',
            [
                sessionId,
                validUntil.toISOString().slice(0, 19).replace('T', ' '),
            ]
        );

        if (result.affectedRows > 0) {
            return {
                success: true,
                sessionId,
            };
        }
    }

    return {
        success: false,
        sessionId: '',
    };
}
