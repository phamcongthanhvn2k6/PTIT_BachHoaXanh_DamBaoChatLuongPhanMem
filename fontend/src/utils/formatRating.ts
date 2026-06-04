/**
 * Format a rating value to a standardized string format (e.g., 4.7)
 * Uses toFixed(1) for consistent presentation.
 */
export const formatRating = (rating: number | string | null | undefined): string => {
  if (rating === undefined || rating === null || rating === '') return '0.0';
  const parsed = typeof rating === 'number' ? rating : parseFloat(rating);
  if (isNaN(parsed)) return '0.0';
  return parsed.toFixed(1);
};
