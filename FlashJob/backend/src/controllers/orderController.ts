import { Request, Response } from 'express';
import { prisma } from '../config/database'; // เปลี่ยนมาใช้ prisma แทน

export const createOrder = async (req: Request, res: Response) => {
  const { gig_id, package_id, requirements } = req.body;

  const pkg = await prisma.gigPackage.findUnique({
    where: { id: package_id },
    include: { gig: true }
  });

  if (!pkg) return res.status(404).json({ message: 'Package not found' });

  const order = await prisma.order.create({
    data: {
      buyer_id: req.user!.userId,
      seller_id: pkg.gig.seller_id,
      gig_id,
      package_id,
      price: pkg.price,
      requirements
    }
  });

  res.status(201).json(order);
};

// เพิ่มฟังก์ชันตาม indexR
export const getMyOrders = async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyer_id: req.user?.userId }, { seller_id: req.user?.userId }] },
    include: { gig: true }
  });
  res.json(orders);
};

export const getOrder = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  res.json(order);
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: req.body.status }
  });
  res.json(order);
};

export const sendMessage = async (req: Request, res: Response) => {
  // ฟีเจอร์ข้อความ (ถ้ายังไม่มีตารางให้ return ไปก่อน)
  res.json({ message: 'Message sent' });
};