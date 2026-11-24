"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoResponse = void 0;
exports.toRepoResponseList = toRepoResponseList;
class RepoResponse {
    code;
    message;
    value;
    constructor(value, message) {
        this.code = 0;
        this.value = value;
        this.message = message ?? 'Success';
    }
    static ok(value, message = 'Success') {
        return new RepoResponse(value, message);
    }
    static notFound(entity) {
        const r = new RepoResponse();
        r.code = 404;
        r.message = entity ? `${entity} not found` : 'Not found';
        return r;
    }
    static error(err) {
        const r = new RepoResponse();
        r.code = 1;
        r.message = err instanceof Error ? err.message : String(err);
        return r;
    }
}
exports.RepoResponse = RepoResponse;
function toRepoResponseList(entities, mapper) {
    return RepoResponse.ok(entities.map(mapper));
}
//# sourceMappingURL=repo-response.js.map