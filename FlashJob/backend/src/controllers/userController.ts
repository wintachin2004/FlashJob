import { Request, Response } from 'express';
import pool from '../config/database';

// GET /users/:username - public profile
export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, username, full_name, avatar_url, bio, role,
              is_verified, rating_avg, rating_count, created_at
       FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /users/saved-gigs/:gigId
export const saveGig = async (req: Request, res: Response): Promise<void> => {
  const { gigId } = req.params;
  const userId = req.user!.userId;

  try {
    await pool.query(
      `INSERT INTO saved_gigs (user_id, gig_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, gigId]
    );
    res.json({ message: 'Gig saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /users/saved-gigs/:gigId
export const unsaveGig = async (req: Request, res: Response): Promise<void> => {
  const { gigId } = req.params;
  const userId = req.user!.userId;

  try {
    await pool.query(
      'DELETE FROM saved_gigs WHERE user_id = $1 AND gig_id = $2',
      [userId, gigId]
    );
    res.json({ message: 'Gig removed from saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /users/saved-gigs
export const getSavedGigs = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      `SELECT g.id, g.title, g.rating_avg, g.rating_count, g.created_at,
              u.username, u.avatar_url, u.is_verified,
              (SELECT MIN(price) FROM gig_packages WHERE gig_id = g.id) as starting_price,
              (SELECT image_url FROM gig_images WHERE gig_id = g.id AND is_cover = true LIMIT 1) as cover_image,
              sg.created_at as saved_at
       FROM saved_gigs sg
       JOIN gigs g ON sg.gig_id = g.id
       JOIN users u ON g.seller_id = u.id
       WHERE sg.user_id = $1
       ORDER BY sg.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
