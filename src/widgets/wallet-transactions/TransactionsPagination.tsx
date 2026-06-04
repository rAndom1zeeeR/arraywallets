import Link from "next/link";

interface TransactionsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export const TransactionsPagination = ({
  page,
  totalPages,
  total,
  pageSize,
}: TransactionsPaginationProps) => {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  const pageHref = (targetPage: number): string => (targetPage === 1 ? "/" : `/?page=${targetPage}`);

  return (
    <nav
      className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm"
      aria-label="Пагинация транзакций"
    >
      <p className="text-gray-600 dark:text-gray-400">
        {total === 0 ? "Нет записей" : `Показано ${from}–${to} из ${total}`}
      </p>
      <div className="flex items-center gap-2">
        {prevPage != null ? (
          <Link
            href={pageHref(prevPage)}
            className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            ← Назад
          </Link>
        ) : (
          <span className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-400 dark:border-gray-700">
            ← Назад
          </span>
        )}
        <span className="px-2 tabular-nums" aria-current="page">
          {page} / {totalPages}
        </span>
        {nextPage != null ? (
          <Link
            href={pageHref(nextPage)}
            className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Вперёд →
          </Link>
        ) : (
          <span className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-400 dark:border-gray-700">
            Вперёд →
          </span>
        )}
      </div>
    </nav>
  );
};
