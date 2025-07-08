/**
 * Resource interface for the CRUD operations
 */
export interface Resource {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/**
 * Input interface for creating a new resource
 */
export interface CreateResourceInput {
  name: string;
  description: string;
  category: string;
  status?: 'active' | 'inactive';
}

/**
 * Input interface for updating an existing resource
 */
export interface UpdateResourceInput {
  name?: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive';
}

/**
 * Filter interface for listing resources
 */
export interface ResourceFilters {
  category?: string;
  status?: 'active' | 'inactive';
  name?: string;
  limit?: number;
  offset?: number;
} 