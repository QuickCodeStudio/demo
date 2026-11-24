/**
 * Standard API response envelope — mirrors C# Response<T>.
 */
export class Response<T> {
  code: number;
  message?: string;
  value!: T;

  static ok<T>(value: T, message = 'Success'): Response<T> {
    const r = new Response<T>();
    r.code = 0;
    r.value = value;
    r.message = message;
    return r;
  }

  static notFound<T>(message = 'Not found'): Response<T> {
    const r = new Response<T>();
    r.code = 404;
    r.message = message;
    return r;
  }

  static error<T>(message: string, code = 1): Response<T> {
    const r = new Response<T>();
    r.code = code;
    r.message = message;
    return r;
  }

  /**
   * Convert a RepoResponse into an API Response, optionally transforming the value.
   */
  static fromRepo<TIn, TOut = TIn>(
    repo: { code: number; message?: string; value?: TIn },
    transform?: (v: TIn) => TOut,
  ): Response<TOut> {
    const r = new Response<TOut>();
    r.code = repo.code;
    r.message = repo.message;
    if (repo.code === 0 && repo.value !== undefined) {
      r.value = transform ? transform(repo.value) : (repo.value as unknown as TOut);
    }
    return r;
  }
}
