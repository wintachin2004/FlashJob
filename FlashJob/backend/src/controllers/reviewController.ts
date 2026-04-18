import { Request, Response } from 'express';
import { prisma } from '../config/database';

// 1. สร้างรีวิว (ใช้ Prisma Transaction)
export const createReview = async (req: Request, res: Response) => {
  const { order_id, rating, comment } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ตรวจสอบว่า Order นี้มีจริงและเสร็จสมบูรณ์แล้ว
      const order = await tx.order.findFirst({
        where: { 
          id: order_id, 
          buyer_id: req.user?.userId, 
          status: 'completed' 
        }
      });

      if (!order) {
        throw new Error('Order not found or not completed');
      }

      // บันทึกรีวิว
      const review = await tx.review.create({
        data: {
          order_id: order_id,
          gig_id: order.gig_id,
          reviewer_id: req.user!.userId,
          reviewee_id: order.seller_id,
          rating: Number(rating),
          comment: comment
        }
      });

      // คำนวณค่าเฉลี่ย Rating ของผู้ขายใหม่
      const stats = await tx.review.aggregate({
        where: { reviewee_id: order.seller_id },
        _avg: { rating: true },
        _count: { rating: true }
      });

      // อัปเดตข้อมูลผู้ขาย
      await tx.user.update({
        where: { id: order.seller_id },
        data: {
          rating_avg: stats._avg.rating || 0,
          rating_count: stats._count.rating
        }
      });

      return review;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Cannot create review' });
  }
};

// 2. ดึงรีวิวของแต่ละ Gig (เพิ่มฟังก์ชันนี้เพื่อให้ indexR หายแดง)
export const getGigReviews = async (req: Request, res: Response) => {
  const { gigId } = req.params;

  try {
    const reviews = await prisma.review.findMany({
      where: { gig_id: gigId },
      include: {
        reviewer: {
          select: {
            username: true,
            avatar_url: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};