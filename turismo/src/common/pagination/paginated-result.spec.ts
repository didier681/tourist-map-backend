import { PaginationQueryDto } from './pagination-query.dto';
import { findPaginated } from './pagination-query-options';
import { paginateArray } from './paginated-result';

describe('paginación', () => {
  it('devuelve los metadatos estándar y corta los resultados de la página solicitada', () => {
    expect(
      paginateArray([1, 2, 3, 4, 5], {
        page: 2,
        limit: 2,
      } as PaginationQueryDto),
    ).toEqual({
      data: [3, 4],
      total: 5,
      page: 2,
      limit: 2,
      totalPages: 3,
    });
  });

  it('aplica skip/take en la consulta y conserva el total sin paginar', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[{ id: 3 }], 8]);

    await expect(
      findPaginated(
        { findAndCount } as never,
        { page: 2, limit: 2 } as PaginationQueryDto,
      ),
    ).resolves.toEqual({
      data: [{ id: 3 }],
      total: 8,
      page: 2,
      limit: 2,
      totalPages: 4,
    });
    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 2 }),
    );
  });
});
