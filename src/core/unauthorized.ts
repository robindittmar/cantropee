import {Response} from "express";

export const unauthorized = (res: Response) => {
    res.status(403);
    res.send({
        success: false,
        code: 403,
        message: 'You have insufficient rights to perform this action',
    });
};
