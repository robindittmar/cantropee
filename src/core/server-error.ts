export class ServerError extends Error {
    constructor(public statusCode: number = 500, message: string = 'Internal Server Error') {
        super();
        this.message = message;
    }
}
