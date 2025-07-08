export interface ApiError {
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
export interface PriceResponse {
  'oasis-network': {
    usd: number;
  };
}