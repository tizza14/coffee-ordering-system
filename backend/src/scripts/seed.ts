import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ProductModel } from '../modules/products/product.model';
import { UserModel } from '../modules/users/user.model';

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coffee_ordering';

const users = [
  { name: '系統管理員', email: 'admin@demo.com', password: 'demo1234', role: 'admin' },
  { name: '店員 小明', email: 'staff@demo.com', password: 'demo1234', role: 'staff' },
  { name: '會員 小花', email: 'user@demo.com', password: 'demo1234', role: 'user' }
];

const products = [
  // Coffee
  {
    name: '美式咖啡',
    category: 'coffee',
    price: 65,
    description: '濃郁黑咖啡，清爽不苦澀',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: true
  },
  {
    name: '拿鐵咖啡',
    category: 'coffee',
    price: 85,
    description: '義式濃縮加上香滑牛奶',
    imageUrl: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: true
  },
  {
    name: '卡布奇諾',
    category: 'coffee',
    price: 85,
    description: '濃縮咖啡與綿密奶泡的完美比例',
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  },
  {
    name: '焦糖瑪奇朵',
    category: 'coffee',
    price: 110,
    description: '香甜焦糖搭配濃縮咖啡',
    imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  },
  {
    name: '冰滴咖啡',
    category: 'coffee',
    price: 120,
    description: '長時間低溫萃取，口感滑順',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  },
  // Dessert
  {
    name: '抹茶拿鐵',
    category: 'dessert',
    price: 95,
    description: '日本宇治抹茶粉，香氣濃郁',
    imageUrl: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  },
  {
    name: '黑糖珍珠鮮奶',
    category: 'dessert',
    price: 100,
    description: '手工黑糖珍珠，Q彈有嚼勁',
    imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  },
  {
    name: '奶油可頌',
    category: 'dessert',
    price: 55,
    description: '法式千層麵團，外酥內軟',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  },
  {
    name: '起司蛋糕',
    category: 'dessert',
    price: 90,
    description: '紐約式重乳酪，濃郁滑順',
    imageUrl: 'https://images.unsplash.com/photo-1567327613485-fbc7bf196198?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  },
  {
    name: '巧克力布朗尼',
    category: 'dessert',
    price: 75,
    description: '比利時巧克力，濕潤扎實',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop&q=80',
    isAvailable: true,
    isRedeemable: false
  }
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ 連接資料庫成功');

  await UserModel.deleteMany({});
  await ProductModel.deleteMany({});
  console.log('🗑️  清除舊資料');

  for (const u of users) {
    await UserModel.create({
      ...u,
      password: await bcrypt.hash(u.password, 10)
    });
  }
  console.log(`👤 建立 ${users.length} 個測試帳號`);

  await ProductModel.insertMany(products);
  console.log(`☕ 建立 ${products.length} 個商品`);

  console.log('\n========== 展示帳號 ==========');
  console.log('角色       Email              密碼');
  console.log('管理員     admin@demo.com     demo1234');
  console.log('店員       staff@demo.com     demo1234');
  console.log('會員       user@demo.com      demo1234');
  console.log('===============================\n');

  await mongoose.disconnect();
  console.log('✅ Seed 完成');
}

seed().catch((err) => {
  console.error('❌ Seed 失敗:', err);
  process.exit(1);
});
