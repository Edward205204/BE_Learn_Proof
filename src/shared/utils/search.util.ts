/**
 * Format search query for PostgreSQL Full-text Search
 * Ví dụ: "react nextjs" -> "react & nextjs"
 */
export function formatSearchQuery(query: string): string {
  if (!query) return '';

  // 1. Loại bỏ các ký tự đặc biệt có thể gây lỗi cú pháp tsquery
  // 2. Tách chuỗi thành các từ
  // 3. Ghép lại bằng toán tử '&' (AND)
  const cleanQuery = query
    .trim()
    .replace(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .join(' & ');

  return cleanQuery;
}
