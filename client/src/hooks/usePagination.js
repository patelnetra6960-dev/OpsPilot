import { useState, useCallback, useMemo } from 'react';

/**
 * Reusable hook for server-side or client-side pagination state
 * @param {object} options - Initial pagination options
 */
export const usePagination = ({ initialPage = 1, initialLimit = 20, totalCount = 0 } = {}) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const totalPages = useMemo(() => {
    if (!totalCount || totalCount <= 0) return 1;
    return Math.ceil(totalCount / limit);
  }, [totalCount, limit]);

  const canNextPage = page < totalPages;
  const canPrevPage = page > 1;

  const nextPage = useCallback(() => {
    setPage((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    totalPages,
    totalCount,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
    reset
  };
};

export default usePagination;
