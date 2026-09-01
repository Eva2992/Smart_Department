import { useState, useEffect, useCallback } from "react";
import { fetchResourcesApi, deleteResourceApi } from "../../api/resource.js";
import type { ResourceQuery, PaginatedResourcesResponse } from "../../types/resource.js";
import { ResourceCard } from "./ResourceCard.js";
import { ResourceSearchFilter } from "./ResourceSearchFilter.js";

interface ResourceBrowserProps {
  initialQuery?: ResourceQuery;
  refreshTrigger?: number;
}

export function ResourceBrowser({ initialQuery = {}, refreshTrigger = 0 }: ResourceBrowserProps) {
  const [query, setQuery] = useState<ResourceQuery>({
    page: 1,
    limit: 12,
    ...initialQuery,
  });

  const [data, setData] = useState<PaginatedResourcesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const loadResources = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchResourcesApi(query);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load study resources.");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadResources();
  }, [loadResources, refreshTrigger]);

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteResourceApi(id);
      setActionNotice({ text: "Resource deleted successfully.", type: "success" });
      loadResources();
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: unknown) {
      setActionNotice({
        text: err instanceof Error ? err.message : "Failed to delete resource.",
        type: "error",
      });
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handlePageChange = (newPage: number) => {
    setQuery((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = data?.pagination.totalPages || 1;
  const currentPage = data?.pagination.page || 1;
  const totalCount = data?.pagination.total || 0;

  return (
    <div>
      {/* Search & Filter Bar */}
      <ResourceSearchFilter query={query} onChange={setQuery} />

      {/* Action Notification */}
      {actionNotice && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 transition-all ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-[#16A34A]"
              : "bg-rose-50 border border-rose-200 text-[#E11D48]"
          }`}
        >
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 rounded-[20px] bg-rose-50 border border-rose-200 text-center my-6">
          <p className="text-sm font-semibold text-[#E11D48] mb-2">{error}</p>
          <button
            onClick={loadResources}
            className="px-4 py-2 text-xs font-bold text-white bg-[#DC143C] rounded-xl hover:bg-[#B01030] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[16px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-gray-100 animate-pulse space-y-4"
            >
              <div className="flex justify-between">
                <div className="h-5 bg-gray-200 rounded-full w-24"></div>
                <div className="h-5 bg-gray-200 rounded-full w-12"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded-xl w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : data?.resources && data.resources.length > 0 ? (
        <>
          {/* Results Count Header */}
          <div className="flex items-center justify-between mb-4 px-1 text-xs text-[#6B7280]">
            <span>
              Showing <strong className="text-[#1F2937]">{data.resources.length}</strong> of{" "}
              <strong className="text-[#1F2937]">{totalCount}</strong> resources
            </span>
            {query.page && totalPages > 1 && (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} onDelete={handleDeleteResource} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3.5 py-2 text-xs font-semibold text-[#1F2937] bg-white rounded-xl border border-gray-200 shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, idx) => {
                const p = idx + 1;
                const isCurrent = p === currentPage;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-8 h-8 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#DC143C] text-white shadow-xs"
                        : "bg-white text-[#1F2937] border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3.5 py-2 text-xs font-semibold text-[#1F2937] bg-white rounded-xl border border-gray-200 shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-[20px] p-12 text-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100 my-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 text-[#6B7280] flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-1">
            No study resources found
          </h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto mb-4">
            Try adjusting your search terms or clearing the selected filters to view available
            materials.
          </p>
          <button
            onClick={() => setQuery({ page: 1, limit: 12 })}
            className="px-4 py-2 text-xs font-semibold text-[#DC143C] bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
