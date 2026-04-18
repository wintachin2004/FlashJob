// ── Auth ───────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ── User ───────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: Date;
}

export interface RegisterBody {
  email: string;
  password: string;
  username: string;
  full_name?: string;
  role?: 'buyer' | 'seller';
}

export interface LoginBody {
  email: string;
  password: string;
}

// ── Gig ────────────────────────────────────────────────────
export interface Gig {
  id: string;
  seller_id: string;
  category_id?: string;
  title: string;
  description?: string;
  tags?: string[];
  status: 'active' | 'paused' | 'draft';
  rating_avg: number;
  rating_count: number;
  order_count: number;
  created_at: Date;
}

export interface CreateGigBody {
  category_id?: string;
  title: string;
  description?: string;
  tags?: string[];
  packages: CreatePackageBody[];
}

export interface CreatePackageBody {
  package_type: 'basic' | 'standard' | 'premium';
  title: string;
  description?: string;
  price: number;
  delivery_days: number;
  revisions?: number;
  features?: string[];
}

// ── Order ──────────────────────────────────────────────────
export interface CreateOrderBody {
  gig_id: string;
  package_id: string;
  requirements?: string;
}

// ── Review ─────────────────────────────────────────────────
export interface CreateReviewBody {
  order_id: string;
  rating: number;
  comment?: string;
}

// ── Query Params ───────────────────────────────────────────
export interface GigQueryParams {
  category?: string;
  q?: string;
  min_price?: string;
  max_price?: string;
  sort?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc';
  page?: string;
  limit?: string;
}
