CREATE TABLE IF NOT EXISTS seller_admins (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    hex_code CHAR(7) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    target_audience TEXT NOT NULL CHECK (target_audience IN ('men', 'women', 'kids', 'unisex')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES colors(id) ON DELETE RESTRICT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, color_id)
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_color_id UUID NOT NULL REFERENCES product_colors(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE,
    size TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(12, 2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, product_color_id, size)
);

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_color_id UUID REFERENCES product_colors(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_admins_user_id ON seller_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_target_audience ON products(target_audience);
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_color_id ON product_images(product_color_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id_sort ON product_images(product_id, sort_order);

INSERT INTO categories(name, slug)
VALUES
  ('Clothing', 'clothing'),
  ('Footwear', 'footwear'),
  ('Upperwear', 'upperwear'),
  ('Bottomwear', 'bottomwear'),
  ('Ethnic', 'ethnic'),
  ('Sneakers', 'sneakers')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO colors(name, hex_code)
VALUES
  ('Black', '#000000'),
  ('White', '#FFFFFF'),
  ('Red', '#FF0000'),
  ('Blue', '#0000FF'),
  ('Green', '#008000'),
  ('Grey', '#808080'),
  ('Navy', '#000080'),
  ('Beige', '#F5F5DC')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users(name, email, password_hash)
VALUES (
  'admin_seller',
  'wearwithvesture@gmail.com',
  crypt('12345678', gen_salt('bf'))
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO seller_admins(user_id)
SELECT id
FROM users
WHERE email = 'wearwithvesture@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
