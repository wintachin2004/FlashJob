import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// ใช้สำหรับจัดการข้อมูลในตาราง
export const prisma = new PrismaClient();

// ใช้สำหรับระบบ Auth (Register/Login)
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);