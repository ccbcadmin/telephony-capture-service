enum Code {
    ApplicationError = 1,
    ExchangeError = 2,
    WebSocketFailure = 3,
}

export class ApplicationError extends Error {
    constructor(message: string, public code: number = 1) {
        super(message);
        super.name = 'ExchangeError';

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ApplicationError.prototype);
    }

    toString() {
        return `${this.name} "${this.message}"`;
    }
}

export class ExchangeError extends ApplicationError {
    constructor(message: string) {

        super(message, Code.ExchangeError);
        super.name = 'ExchangeError';

        Object.setPrototypeOf(this, ExchangeError.prototype);
    }
}

export class WebSocketFailure extends ApplicationError {
    constructor(message: string = 'WebSocketFailure') {

        super(message, Code.WebSocketFailure);
        super.name = 'WebSocketFailure';

        Object.setPrototypeOf(this, WebSocketFailure.prototype);
    }
}
