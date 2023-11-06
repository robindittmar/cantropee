import {Response} from "express";

export const badRequest = (res: Response, missingFieldName: string) => {
    res.status(400);
    res.send({
        success: false,
        code: 400,
        message: `missing field "${missingFieldName} in request`,
    });
};

export const unauthorized = (res: Response) => {
    res.status(403);
    res.send({
        success: false,
        code: 403,
        message: 'You have insufficient rights to perform this action',
    });
};

export const serverError = (res: Response, msg: string) => {
    res.status(500);
    res.send({
        success: false,
        code: 500,
        message: `Internal Server Error: ${msg}`,
    });
}
