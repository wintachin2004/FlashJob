import { Request, Response } from 'express';
import { supabaseAuth, prisma } from '../config/database';

export const register = async (req: Request, res: Response) => {
  const { email, password, username, full_name, role = 'buyer' } = req.body;

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { 
      data: { username, full_name, role } 
    }
  });

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ 
    token: data.session?.access_token, 
    user: data.user 
  });
};

// เพิ่มฟังก์ชัน getMe (เพื่อให้ indexR หายแดง)
export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// เพิ่มฟังก์ชัน updateProfile (เพื่อให้ indexR หายแดง)
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { full_name, bio, avatar_url } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user?.userId },
      data: { full_name, bio, avatar_url }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
};