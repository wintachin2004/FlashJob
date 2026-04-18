import { Request, Response } from 'express';
import { prisma } from '../config/database'; 

// 1. ดึงโปรไฟล์สาธารณะ (ไม่ต้องใช้ Token)
export const getPublicProfile = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        full_name: true,
        avatar_url: true,
        bio: true,
        role: true,
        is_verified: true,
        rating_avg: true,
        rating_count: true,
        created_at: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// 2. บันทึกงานที่สนใจ (Saved Gig)
export const saveGig = async (req: Request, res: Response) => {
  const { gigId } = req.params;
  const userId = req.user!.userId;

  try {
    const saved = await prisma.savedGig.upsert({
      where: {
        user_id_gig_id: {
          user_id: userId,
          gig_id: gigId,
        },
      },
      update: {}, // ถ้ามีอยู่แล้วไม่ต้องแก้ไขอะไร
      create: {
        user_id: userId,
        gig_id: gigId,
      },
    });

    res.json({ message: 'Gig saved', data: saved });
  } catch (error: any) {
    res.status(500).json({ message: 'Could not save gig' });
  }
};

// 3. ดึงรายการงานที่บันทึกไว้ทั้งหมด
export const getSavedGigs = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const savedGigs = await prisma.savedGig.findMany({
      where: { user_id: userId },
      include: {
        gig: {
          include: {
            seller: {
              select: { username: true, avatar_url: true }
            },
            packages: {
              take: 1,
              orderBy: { price: 'asc' }
            }
          }
        }
      }
    });

    res.json(savedGigs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

// 4. ยกเลิกการบันทึกงาน
export const unsaveGig = async (req: Request, res: Response) => {
  const { gigId } = req.params;
  const userId = req.user!.userId;

  try {
    await prisma.savedGig.delete({
      where: {
        user_id_gig_id: {
          user_id: userId,
          gig_id: gigId
        }
      }
    });
    res.json({ message: 'Unsaved success' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error unsaving gig or gig not found' });
  }
};