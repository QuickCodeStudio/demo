/**
 * Repository-layer response — mirrors C# RepoResponse<T>.
 */
export class RepoResponse<T> {
  code: number;
  message?: string;
  value?: T;

  constructor(value?: T, message?: string) {
    this.code = 0;
    this.value = value;
    this.message = message ?? 'Success';
  }

  static ok<T>(value: T, message = 'Success'): RepoResponse<T> {
    return new RepoResponse<T>(value, message);
  }

  static notFound<T>(entity?: string): RepoResponse<T> {
    const r = new RepoResponse<T>();
    r.code = 404;
    r.message = entity ? `${entity} not found` : 'Not found';
    return r;
  }

  static error<T>(err: unknown): RepoResponse<T> {
    const r = new RepoResponse<T>();
    r.code = 1;
    r.message = err instanceof Error ? err.message : String(err);
    return r;
  }
}

/**
 * Helper to map a list of entities to RepoResponse<DTO[]>.
 */
export function toRepoResponseList<TEntity, TDto>(
  entities: TEntity[],
  mapper: (e: TEntity) => TDto,
): RepoResponse<TDto[]> {
  return RepoResponse.ok(entities.map(mapper));
}
