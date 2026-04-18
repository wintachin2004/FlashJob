import pool from './database';

const seed = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Categories matching your frontend nav bar
    const categories = [
      { name: 'Popular Jobs', name_th: 'งานยอดนิยม', icon: 'star', slug: 'popular' },
      { name: 'Programming & Tech', name_th: 'โปรแกรมเมอร์และเทคโนโลยี', icon: 'code', slug: 'programming' },
      { name: 'Graphic Design', name_th: 'ออกแบบกราฟิก', icon: 'palette', slug: 'design' },
      { name: 'General Tasks', name_th: 'รับจ้างทั่วไป', icon: 'tools', slug: 'general' },
      { name: 'Marketing', name_th: 'การตลาด', icon: 'megaphone', slug: 'marketing' },
      { name: 'Writing & Translation', name_th: 'เขียนและแปลภาษา', icon: 'pen', slug: 'writing' },
      { name: 'Video & Animation', name_th: 'วิดีโอและแอนิเมชั่น', icon: 'video', slug: 'video' },
      { name: 'Music & Audio', name_th: 'ดนตรีและเสียง', icon: 'music', slug: 'music' },
    ];

    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (name, name_th, icon, slug)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.name_th, cat.icon, cat.slug]
      );
    }

    console.log('✅ Categories seeded');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
