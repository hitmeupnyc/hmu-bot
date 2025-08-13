interface MemberPaginationProps {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function MemberPagination({
  currentPage,
  totalPages,
  isLoading,
  onPageChange,
}: MemberPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="px-6 py-3 border-t border-gray-200">
      <div className="flex justify-between items-center">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || isLoading}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}