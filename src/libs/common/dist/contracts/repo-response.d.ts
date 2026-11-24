export declare class RepoResponse<T> {
    code: number;
    message?: string;
    value?: T;
    constructor(value?: T, message?: string);
    static ok<T>(value: T, message?: string): RepoResponse<T>;
    static notFound<T>(entity?: string): RepoResponse<T>;
    static error<T>(err: unknown): RepoResponse<T>;
}
export declare function toRepoResponseList<TEntity, TDto>(entities: TEntity[], mapper: (e: TEntity) => TDto): RepoResponse<TDto[]>;
