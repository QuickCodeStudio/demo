"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
class Response {
    code;
    message;
    value;
    static ok(value, message = 'Success') {
        const r = new Response();
        r.code = 0;
        r.value = value;
        r.message = message;
        return r;
    }
    static notFound(message = 'Not found') {
        const r = new Response();
        r.code = 404;
        r.message = message;
        return r;
    }
    static error(message, code = 1) {
        const r = new Response();
        r.code = code;
        r.message = message;
        return r;
    }
    static fromRepo(repo, transform) {
        const r = new Response();
        r.code = repo.code;
        r.message = repo.message;
        if (repo.code === 0 && repo.value !== undefined) {
            r.value = transform ? transform(repo.value) : repo.value;
        }
        return r;
    }
}
exports.Response = Response;
//# sourceMappingURL=response.js.map