import { Request, Response } from 'express';
import pool from '../config/database';
import { CreateOrderBody } from '../types/indexT';

// POST /orders - place an order
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const { gig_id, package_id, requirements }: CreateOrderBody = req.body;

  if (!gig_id || !package_id) {
    res.status(400).json({ message: 'gig_id and package_id required' });
    return;
  }

  try {
    // Get package details
    const pkgResult = await pool.query(
      `SELECT gp.*, g.seller_id FROM gig_packages gp
       JOIN gigs g ON gp.gig_id = g.id
       WHERE gp.id = $1 AND gp.gig_id = $2`,
      [package_id, gig_id]
    );

    if (pkgResult.rows.length === 0) {
      res.status(404).json({ message: 'Package not found' });
      return;
    }

    const pkg = pkgResult.rows[0];

    if (pkg.seller_id === req.user!.userId) {
      res.status(400).json({ message: 'Cannot order your own gig' });
      return;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + pkg.delivery_days);

    const result = await pool.query(
      `INSERT INTO orders (buyer_id, seller_id, gig_id, package_id, price, delivery_days, requirements, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user!.userId, pkg.seller_id, gig_id, package_id,
       pkg.price, pkg.delivery_days, requirements || null, deadline]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /orders - my orders (buyer or seller)
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  const { role = 'buyer', status } = req.query;
  const userId = req.user!.userId;

  const conditions = role === 'seller'
    ? ['o.seller_id = $1']
    : ['o.buyer_id = $1'];

  const params: (string | number)[] = [userId];

  if (status) {
    params.push(status as string);
    conditions.push(`o.status = $${params.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT o.*, g.title as gig_title,
              buyer.username as buyer_username, buyer.avatar_url as buyer_avatar,
              seller.username as seller_username, seller.avatar_url as seller_avatar,
              gp.package_type
       FROM orders o
       JOIN gigs g ON o.gig_id = g.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       JOIN gig_packages gp ON o.package_id = gp.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /orders/:id - order detail
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      `SELECT o.*, g.title as gig_title,
              buyer.username as buyer_username, buyer.avatar_url as buyer_avatar,
              seller.username as seller_username, seller.avatar_url as seller_avatar,
              gp.package_type, gp.revisions
       FROM orders o
       JOIN gigs g ON o.gig_id = g.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       JOIN gig_packages gp ON o.package_id = gp.id
       WHERE o.id = $1 AND (o.buyer_id = $2 OR o.seller_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Messages
    const messages = await pool.query(
      `SELECT om.*, u.username, u.avatar_url
       FROM order_messages om
       JOIN users u ON om.sender_id = u.id
       WHERE om.order_id = $1
       ORDER BY om.created_at ASC`,
      [id]
    );

    res.json({ ...result.rows[0], messages: messages.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /orders/:id/status - update order status
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user!.userId;

  const validTransitions: Record<string, string[]> = {
    pending: ['in_progress', 'cancelled'],
    in_progress: ['delivered', 'cancelled'],
    delivered: ['completed', 'revision'],
    revision: ['in_progress'],
  };

  try {
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];
    const allowed = validTransitions[order.status] || [];

    if (!allowed.includes(status)) {
      res.status(400).json({ message: `Cannot transition from ${order.status} to ${status}` });
      return;
    }

    // Only seller can deliver, only buyer can complete/request revision
    if (['delivered'].includes(status) && order.seller_id !== userId) {
      res.status(403).json({ message: 'Only seller can deliver' });
      return;
    }
    if (['completed', 'revision'].includes(status) && order.buyer_id !== userId) {
      res.status(403).json({ message: 'Only buyer can complete or request revision' });
      return;
    }

    const completedAt = status === 'completed' ? new Date() : null;

    const result = await pool.query(
      `UPDATE orders
       SET status = $1, completed_at = COALESCE($2, completed_at), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, completedAt, id]
    );

    // On complete, increment gig order count
    if (status === 'completed') {
      await pool.query(
        'UPDATE gigs SET order_count = order_count + 1 WHERE id = $1',
        [order.gig_id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /orders/:id/messages - send message in order
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { message, attachment_url } = req.body;
  const userId = req.user!.userId;

  try {
    // Verify user is part of this order
    const orderCheck = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [id, userId]
    );

    if (orderCheck.rows.length === 0) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO order_messages (order_id, sender_id, message, attachment_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *, (SELECT username FROM users WHERE id = $2) as username`,
      [id, userId, message || null, attachment_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
