import type { Product } from '../schemas/product.schema';

type ProductSeed = Omit<Product, 'createdAt' | 'updatedAt'>;

export const PRODUCT_SEED: ProductSeed[] = [
  {
    id: 1,
    brand: 'Aurevia',
    name: 'Conjunto Ivory',
    price: 180.7,
    originalPrice: 240.9,
    badge: 'NEW\n25% OFF',
    image:
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=520&q=80',
    images: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=520&q=80',
    ],
    subcategories: ['conjuntos', 'blusas y camisas', 'pantalones'],
    category: 'beachwear',
    isOffer: true,
    stockBySize: [
      { size: 'S', stock: 2 },
      { size: 'M', stock: 4 },
      { size: 'L', stock: 5 },
      { size: 'XL', stock: 3 },
    ],
    stock: 14,
  },
  {
    id: 2,
    brand: 'Lost',
    name: 'Blue Cristalia',
    price: 229.4,
    originalPrice: 289.9,
    badge: 'NEW\n21% OFF',
    image:
      'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=520&q=80',
    images: [
      'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=520&q=80',
    ],
    subcategories: ['blusas y camisas'],
    category: 'ropa',
    isOffer: true,
    stockBySize: [
      { size: 'S', stock: 1 },
      { size: 'M', stock: 2 },
      { size: 'L', stock: 3 },
      { size: 'XL', stock: 2 },
    ],
    stock: 8,
  },
  {
    id: 3,
    brand: 'Simorra',
    name: 'Vestido Astra',
    price: 277.2,
    originalPrice: 421.9,
    badge: 'NEW\n45% OFF',
    image:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=520&q=80',
    images: [
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1464863979621-258859e62245?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=520&q=80',
    ],
    subcategories: ['vestidos'],
    category: 'ropa',
    isOffer: true,
    stockBySize: [
      { size: 'S', stock: 0 },
      { size: 'M', stock: 0 },
      { size: 'L', stock: 0 },
    ],
    stock: 0,
  },
  {
    id: 4,
    brand: 'Liore',
    name: 'Conjunto Monaco',
    price: 310.3,
    originalPrice: 399.9,
    badge: 'NEW\n21% OFF',
    image:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=520&q=80',
    images: [
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1462989857672-1112e6f62f5a?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=520&q=80',
    ],
    subcategories: ['enterizos', 'pantalones'],
    category: 'nightwear',
    isOffer: true,
    stockBySize: [
      { size: 'S', stock: 1 },
      { size: 'M', stock: 2 },
      { size: 'L', stock: 2 },
    ],
    stock: 5,
  },
  {
    id: 5,
    brand: 'Aurevia',
    name: 'Vestido Peonia',
    price: 190.2,
    originalPrice: 225,
    badge: 'NEW\n15% OFF',
    image:
      'https://images.unsplash.com/photo-1542295669297-4d352b042bca?auto=format&fit=crop&w=520&q=80',
    images: [
      'https://images.unsplash.com/photo-1542295669297-4d352b042bca?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=520&q=80',
      'https://images.unsplash.com/photo-1464863979621-258859e62245?auto=format&fit=crop&w=520&q=80',
    ],
    subcategories: ['vestidos'],
    category: 'beachwear',
    isOffer: true,
    stockBySize: [
      { size: 'S', stock: 3 },
      { size: 'M', stock: 4 },
      { size: 'L', stock: 3 },
      { size: 'XL', stock: 2 },
    ],
    stock: 12,
  },
];
