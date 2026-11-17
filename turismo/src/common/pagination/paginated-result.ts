import { PaginationQueryDto } from './pagination-query.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Comparte la estructura y el cálculo de páginas entre listados y búsquedas filtradas.
export function paginateArray<T>(
  items: T[],
  pagination: PaginationQueryDto,
): PaginatedResult<T> {
  const offset = (pagination.page - 1) * pagination.limit;

  return {
    data: items.slice(offset, offset + pagination.limit),
    total: items.length,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(items.length / pagination.limit),
  };
}
