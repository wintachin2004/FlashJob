import { Request, Response } from 'express';
import { prisma } from '../config/database';

export const getCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { parent_id: null },
    include: {
      _count: {
        select: { gigs: { where: { status: 'active' } } }
      }
    }
  });
  res.json(categories);
};

// เพิ่มฟังก์ชันตาม indexR
export const getCategoryBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return res.status(404).json({ message: 'Not found' });
  res.json(category);
};

export const createCategory = async (req: Request, res: Response) => {
  const data = req.body;
  const newCat = await prisma.category.create({ data });
  res.status(201).json(newCat);
};