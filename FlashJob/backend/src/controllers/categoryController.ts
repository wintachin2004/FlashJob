import { Request, Response } from 'express';
import pool from '../config/database';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(g.id) as gig_count
       FROM categories c
       LEFT JOIN gigs g ON g.category_id = c.id AND g.status = 'active'
       WHERE c.parent_id IS NULL
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin only
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { name, name_th, icon, slug, parent_id } = req.body;

  if (!name || !slug) {
    res.status(400).json({ message: 'name and slug required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (name, name_th, icon, slug, parent_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, name_th || null, icon || null, slug, parent_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
