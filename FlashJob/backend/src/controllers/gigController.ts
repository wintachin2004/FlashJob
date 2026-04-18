import { Request, Response } from 'express';
import pool from '../config/database';
import { CreateGigBody, GigQueryParams } from '../types/indexT';

// GET /gigs - list with filters
export const listGigs = async (req: Request, res: Response): Promise<void> => {
  const {
    category, q, min_price, max_price,
    sort = 'newest', page = '1', limit = '20'
  }: GigQueryParams = req.query as GigQueryParams;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params: (string | number)[] = [];
  const conditions: string[] = ["g.status = 'active'"];

  if (category) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(g.title ILIKE $${params.length} OR g.description ILIKE $${params.length})`);
  }
  if (min_price) {
    params.push(parseFloat(min_price));
    conditions.push(`(SELECT MIN(price) FROM gig_packages WHERE gig_id = g.id) >= $${params.length}`);
  }
  if (max_price) {
    params.push(parseFloat(max_price));
    conditions.push(`(SELECT MIN(price) FROM gig_packages WHERE gig_id = g.id) <= $${params.length}`);
  }

  const orderMap: Record<string, string> = {
    newest: 'g.created_at DESC',
    popular: 'g.order_count DESC',
    rating: 'g.rating_avg DESC',
    price_asc: '(SELECT MIN(price) FROM gig_packages WHERE gig_id = g.id) ASC',
    price_desc: '(SELECT MIN(price) FROM gig_packages WHERE gig_id = g.id) DESC',
  };

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM gigs g
       LEFT JOIN categories c ON g.category_id = c.id
       ${whereClause}`,
      params
    );

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT g.id, g.title, g.description, g.tags, g.rating_avg, g.rating_count, g.order_count,
              g.created_at,
              u.id as seller_id, u.username, u.full_name, u.avatar_url, u.is_verified,
              c.name as category_name, c.slug as category_slug,
              (SELECT MIN(price) FROM gig_packages WHERE gig_id = g.id) as starting_price,
              (SELECT image_url FROM gig_images WHERE gig_id = g.id AND is_cover = true LIMIT 1) as cover_image
       FROM gigs g
       JOIN users u ON g.seller_id = u.id
       LEFT JOIN categories c ON g.category_id = c.id
       ${whereClause}
       ORDER BY ${orderMap[sort] || orderMap.newest}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /gigs/:id - single gig detail
export const getGig = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const gigResult = await pool.query(
      `SELECT g.*, u.username, u.full_name, u.avatar_url, u.bio, u.is_verified,
              u.rating_avg as seller_rating, u.rating_count as seller_rating_count,
              c.name as category_name, c.slug as category_slug
       FROM gigs g
       JOIN users u ON g.seller_id = u.id
       LEFT JOIN categories c ON g.category_id = c.id
       WHERE g.id = $1`,
      [id]
    );

    if (gigResult.rows.length === 0) {
      res.status(404).json({ message: 'Gig not found' });
      return;
    }

    // Packages
    const packages = await pool.query(
      `SELECT * FROM gig_packages WHERE gig_id = $1 ORDER BY price ASC`,
      [id]
    );

    // Images
    const images = await pool.query(
      `SELECT * FROM gig_images WHERE gig_id = $1 ORDER BY sort_order`,
      [id]
    );

    // Reviews (latest 10)
    const reviews = await pool.query(
      `SELECT r.*, u.username, u.avatar_url
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.gig_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [id]
    );

    // Increment view count
    await pool.query(`UPDATE gigs SET view_count = view_count + 1 WHERE id = $1`, [id]);

    res.json({
      ...gigResult.rows[0],
      packages: packages.rows,
      images: images.rows,
      reviews: reviews.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /gigs - create gig (seller only)
export const createGig = async (req: Request, res: Response): Promise<void> => {
  const { category_id, title, description, tags, packages }: CreateGigBody = req.body;

  if (!title || !packages || packages.length === 0) {
    res.status(400).json({ message: 'title and at least one package required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const gigResult = await client.query(
      `INSERT INTO gigs (seller_id, category_id, title, description, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user!.userId, category_id || null, title, description || null, tags || null]
    );

    const gig = gigResult.rows[0];

    // Insert packages
    for (const pkg of packages) {
      await client.query(
        `INSERT INTO gig_packages (gig_id, package_type, title, description, price, delivery_days, revisions, features)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [gig.id, pkg.package_type, pkg.title, pkg.description || null,
         pkg.price, pkg.delivery_days, pkg.revisions || 1, pkg.features || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(gig);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// PATCH /gigs/:id - update gig
export const updateGig = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, description, tags, status } = req.body;

  try {
    const existing = await pool.query(
      'SELECT seller_id FROM gigs WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Gig not found' });
      return;
    }

    if (existing.rows[0].seller_id !== req.user!.userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const result = await pool.query(
      `UPDATE gigs
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           tags = COALESCE($3, tags),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, description, tags, status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /gigs/:id
export const deleteGig = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT seller_id FROM gigs WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Gig not found' });
      return;
    }

    if (existing.rows[0].seller_id !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await pool.query('DELETE FROM gigs WHERE id = $1', [id]);
    res.json({ message: 'Gig deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /gigs/seller/:sellerId - gigs by seller
export const getSellerGigs = async (req: Request, res: Response): Promise<void> => {
  const { sellerId } = req.params;

  try {
    const result = await pool.query(
      `SELECT g.id, g.title, g.rating_avg, g.rating_count, g.order_count, g.status, g.created_at,
              (SELECT MIN(price) FROM gig_packages WHERE gig_id = g.id) as starting_price,
              (SELECT image_url FROM gig_images WHERE gig_id = g.id AND is_cover = true LIMIT 1) as cover_image
       FROM gigs g
       WHERE g.seller_id = $1
       ORDER BY g.created_at DESC`,
      [sellerId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
