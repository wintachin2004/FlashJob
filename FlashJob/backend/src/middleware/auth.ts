import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/database';
import { JwtPayload } from '../types/indexT'; // Import interface ที่คุณเขียนไว้มาใช้

// ── ส่วนสำคัญ: บอกให้ TS รู้จัก req.user ──────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // ใช้ JwtPayload ที่มี userId, email, role
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // ตอนนี้ req.user จะไม่แดงแล้ว เพราะเรา declare ไว้ข้างบน
    req.user = {
      userId: user.id,
      email: user.email!,
      role: user.user_metadata.role || 'buyer'
    };

    next();
  } catch (err) {
    res.status(401).json({ message: 'Auth error' });
  }
};

// Middleware ตรวจสอบสิทธิ์อื่นๆ
export const requireSeller = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Seller access required' });
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};