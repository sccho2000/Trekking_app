export const PAGE_SIZE = 10;

export function paginate(items, page, pageSize = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const wanted = Number.isFinite(Number(page)) ? Math.trunc(Number(page)) : 1;
  const current = Math.min(Math.max(wanted, 1), totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}
