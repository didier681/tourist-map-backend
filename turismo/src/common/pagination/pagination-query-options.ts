import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { PaginationQueryDto } from './pagination-query.dto';
import { PaginatedResult } from './paginated-result';

// Deja que TypeORM cuente y pagine en SQL para no cargar listados completos en memoria.
export async function findPaginated<T extends object>(
  repository: Repository<T>,
  pagination: PaginationQueryDto,
  options: FindManyOptions<T> = {},
): Promise<PaginatedResult<T>> {
  const [data, total] = await repository.findAndCount({
    ...options,
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  });

  return {
    data,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export type OptionalWhere<T> = FindOptionsWhere<T> | FindOptionsWhere<T>[];
