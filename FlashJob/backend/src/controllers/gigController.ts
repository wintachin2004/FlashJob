import { Request, Response } from "express";
import { prisma } from "../config/database";

export const listGigs = async (req: Request, res: Response) => {
  try {
    const gigs = await prisma.gig.findMany({
      where: { status: "active" },
      include: {
        seller: { select: { username: true, avatar_url: true } },
        packages: {
          select: { price: true },
          take: 1,
          orderBy: { price: "asc" },
        },
      },
    });
    res.json(gigs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createGig = async (req: Request, res: Response) => {
  const { title, description, category_id, packages } = req.body;

  const newGig = await prisma.gig.create({
    data: {
      title,
      description,
      category_id,
      seller_id: req.user!.userId,
      packages: {
        create: packages, // Prisma จัดการสร้าง package พ่วงให้ทันที (ไม่ต้องเขียนวนลูปเอง)
      },
    },
  });

  res.status(201).json(newGig);
};
export const getSellerGigs = async (req: Request, res: Response) => {
  const gigs = await prisma.gig.findMany({
    where: { seller_id: req.params.sellerId },
  });
  res.json(gigs);
};

export const getGig = async (req: Request, res: Response) => {
  const gig = await prisma.gig.findUnique({
    where: { id: req.params.id },
    include: { seller: true, packages: true },
  });
  res.json(gig);
};

export const updateGig = async (req: Request, res: Response) => {
  const updated = await prisma.gig.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(updated);
};

export const deleteGig = async (req: Request, res: Response) => {
  await prisma.gig.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
};
