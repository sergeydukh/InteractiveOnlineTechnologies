export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
}

export function paginationParams(query: PaginationQuery, defaults = { page: 1, limit: 5 }): URLSearchParams {
  return new URLSearchParams({
    page: String(query.page ?? defaults.page),
    limit: String(query.limit ?? defaults.limit),
  });
}
