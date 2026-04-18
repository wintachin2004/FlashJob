import { Request, Response } from 'express';
import pool from '../config/database';
import { CreateReviewBody } from '../types/indexT';

// POST /reviews
export const createReview = async (req: Request, res: Response): Promise<void> => {
  const { order_id, rating, comment }: CreateReviewBody = req.body;
  const userId = req.user!.userId;

  if (!order_id || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ message: 'order_id and rating (1-5) required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify order is completed and belongs to buyer
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND buyer_id = $2 AND status = 'completed'`,
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      res.status(403).json({ message: 'Order not found or not completed' });
      return;
    }

    const order = orderResult.rows[0];

    // Check no duplicate review
    const existingReview = await client.query(
      'SELECT id FROM reviews WHERE order_id = $1',
      [order_id]
    );

    if (existingReview.rows.length > 0) {
      res.status(409).json({ message: 'Already reviewed this order' });
      return;
    }

    const result = await client.query(
      `INSERT INTO reviews (order_id, gig_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [order_id, order.gig_id, userId, order.seller_id, rating, comment || null]
    );

    // Update gig rating average
    await client.query(
      `UPDATE gigs SET
         rating_avg = (SELECT AVG(rating) FROM reviews WHERE gig_id = $1),
         rating_count = (SELECT COUNT(*) FROM reviews WHERE gig_id = $1)
       WHERE id = $1`,
      [order.gig_id]
    );

    // Update seller rating average
    await client.query(
      `UPDATE users SET
         rating_avg = (SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1),
         rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1)
       WHERE id = $1`,
      [order.seller_id]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /reviews/gig/:gigId
export const getGigReviews = async (req: Request, res: Response): Promise<void> => {
  const { gigId } = req.params;
  const { page = '1', limit = '10' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  try {
    const result = await pool.query(
      `SELECT r.*, u.username, u.avatar_url, u.is_verified
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.gig_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [gigId, parseInt(limit as string), offset]
    );

    const count = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE gig_id = $1',
      [gigId]
    );

    res.json({
      data: result.rows,
      total: parseInt(count.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
