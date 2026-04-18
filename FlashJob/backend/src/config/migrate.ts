import pool from './database';

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Users ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        avatar_url VARCHAR(500),
        bio TEXT,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
        is_verified BOOLEAN DEFAULT false,
        rating_avg DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Categories ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        name_th VARCHAR(100),
        icon VARCHAR(100),
        slug VARCHAR(100) UNIQUE NOT NULL,
        parent_id UUID REFERENCES categories(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Gigs (งานที่ freelancer โพสต์) ──────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS gigs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        tags TEXT[],
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
        rating_avg DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        order_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Gig Packages (Basic / Standard / Premium) ──────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS gig_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
        package_type VARCHAR(20) CHECK (package_type IN ('basic', 'standard', 'premium')),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        delivery_days INTEGER NOT NULL,
        revisions INTEGER DEFAULT 1,
        features TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Gig Images ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS gig_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        is_cover BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Orders ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID NOT NULL REFERENCES users(id),
        seller_id UUID NOT NULL REFERENCES users(id),
        gig_id UUID NOT NULL REFERENCES gigs(id),
        package_id UUID NOT NULL REFERENCES gig_packages(id),
        status VARCHAR(30) DEFAULT 'pending'
          CHECK (status IN ('pending', 'in_progress', 'revision', 'delivered', 'completed', 'cancelled')),
        price DECIMAL(10,2) NOT NULL,
        delivery_days INTEGER NOT NULL,
        requirements TEXT,
        deadline TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Order Messages ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id),
        message TEXT,
        attachment_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Reviews ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID UNIQUE NOT NULL REFERENCES orders(id),
        gig_id UUID NOT NULL REFERENCES gigs(id),
        reviewer_id UUID NOT NULL REFERENCES users(id),
        reviewee_id UUID NOT NULL REFERENCES users(id),
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Saved Gigs (Bookmarks) ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_gigs (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, gig_id)
      );
    `);

    // ── Indexes ────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gigs_seller ON gigs(seller_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reviews_gig ON reviews(gig_id);`);

    await client.query('COMMIT');
    console.log('✅ All tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

createTables();
