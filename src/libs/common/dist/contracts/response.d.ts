export declare class Response<T> {
    code: number;
    message?: string;
    value: T;
    static ok<T>(value: T, message?: string): Response<T>;
    static notFound<T>(message?: string): Response<T>;
    static error<T>(message: string, code?: number): Response<T>;
    static fromRepo<TIn, TOut = TIn>(repo: {
        code: number;
        message?: string;
        value?: TIn;
    }, transform?: (v: TIn) => TOut): Response<TOut>;
}
