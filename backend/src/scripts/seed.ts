import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { OrderModel } from '../modules/orders/order.model';
import { ProductModel } from '../modules/products/product.model';
import { UserModel } from '../modules/users/user.model';

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coffee_ordering';

// ── Static seed data ────────────────────────────────────────────────────────

const USERS = [
  { name: '系統管理員', email: 'admin@demo.com', password: 'demo1234', role: 'admin' as const },
  { name: '店員 小明',  email: 'staff@demo.com', password: 'demo1234', role: 'staff' as const },
  { name: '會員 小花',  email: 'user@demo.com',  password: 'demo1234', role: 'user'  as const }
];

const PRODUCTS = [
  { name: '美式咖啡',     category: 'coffee',  price: 65,  isAvailable: true, isRedeemable: true,  description: '濃郁黑咖啡，清爽不苦澀' },
  { name: '拿鐵咖啡',     category: 'coffee',  price: 85,  isAvailable: true, isRedeemable: true,  description: '義式濃縮加上香滑牛奶' },
  { name: '卡布奇諾',     category: 'coffee',  price: 85,  isAvailable: true, isRedeemable: false, description: '濃縮咖啡與綿密奶泡的完美比例' },
  { name: '焦糖瑪奇朵',   category: 'coffee',  price: 110, isAvailable: true, isRedeemable: false, description: '香甜焦糖搭配濃縮咖啡' },
  { name: '冰滴咖啡',     category: 'coffee',  price: 120, isAvailable: true, isRedeemable: false, description: '長時間低溫萃取，口感滑順' },
  { name: '抹茶拿鐵',     category: 'dessert', price: 95,  isAvailable: true, isRedeemable: false, description: '日本宇治抹茶粉，香氣濃郁' },
  { name: '黑糖珍珠鮮奶', category: 'dessert', price: 100, isAvailable: true, isRedeemable: false, description: '手工黑糖珍珠，Q彈有嚼勁' },
  { name: '奶油可頌',     category: 'dessert', price: 55,  isAvailable: true, isRedeemable: false, description: '法式千層麵團，外酥內軟' },
  { name: '起司蛋糕',     category: 'dessert', price: 90,  isAvailable: true, isRedeemable: false, description: '紐約式重乳酪，濃郁滑順' },
  { name: '巧克力布朗尼', category: 'dessert', price: 75,  isAvailable: true, isRedeemable: false, description: '比利時巧克力，濕潤扎實' }
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Taipei midnight expressed as UTC Date for a given calendar date offset */
function taipeiDayStart(daysAgo: number): Date {
  const OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowTaipei = new Date(Date.now() + OFFSET_MS);
  const y = nowTaipei.getUTCFullYear();
  const m = nowTaipei.getUTCMonth();
  const d = nowTaipei.getUTCDate() - daysAgo;
  return new Date(Date.UTC(y, m, d) - OFFSET_MS);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

const GUEST_NAMES  = ['王小明', '陳小華', '李美玲', '張志偉', '林雅婷', '黃建宏', '吳淑芬', '劉俊賢'];
const GUEST_PHONES = ['0912345678', '0923456789', '0934567890', '0945678901', '0956789012'];

// ── Order factory ────────────────────────────────────────────────────────────

function buildOrders(
  products: Array<{ _id: mongoose.Types.ObjectId; name: string; price: number }>,
  userIds: mongoose.Types.ObjectId[],
  daysBack: number
) {
  const orders: object[] = [];
  const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

  // Week-day multipliers: Mon=1.0 Tue=0.9 Wed=1.0 Thu=1.1 Fri=1.3 Sat=1.5 Sun=1.2
  const DOW_MULT = [1.2, 1.0, 0.9, 1.0, 1.1, 1.3, 1.5];

  for (let ago = daysBack; ago >= 0; ago--) {
    const dayStart = taipeiDayStart(ago);
    const dayMsIntoTaipei = new Date(dayStart.getTime() + TAIPEI_OFFSET_MS);
    const dow = dayMsIntoTaipei.getUTCDay();
    const mult = DOW_MULT[dow];

    const rand = rng(ago * 7919 + 31337);
    const baseOrders = 6;
    const count = Math.round(baseOrders * mult * (0.7 + rand() * 0.6));

    for (let i = 0; i < count; i++) {
      const r = rng(ago * 1000 + i * 37 + 1);
      const offsetMs = Math.floor(r() * 10 * 60 * 60 * 1000); // 0–10h into day
      const createdAt = new Date(dayStart.getTime() + offsetMs);

      const isGuest = r() < 0.35;
      const numItems = Math.floor(r() * 3) + 1;
      const items = Array.from({ length: numItems }, () => {
        const p = pick(products, r);
        const qty = Math.floor(r() * 2) + 1;
        return { productId: p._id, name: p.name, price: p.price, quantity: qty };
      });
      const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const statusRoll = r();
      const status =
        ago === 0
          ? statusRoll < 0.3
            ? 'pending'
            : statusRoll < 0.6
            ? 'preparing'
            : 'completed'
          : statusRoll < 0.05
          ? 'cancelled'
          : 'completed';
      const paymentStatus =
        status === 'cancelled' && r() < 0.5 ? 'refunded' : 'paid';

      orders.push({
        ...(isGuest
          ? { guestInfo: { name: pick(GUEST_NAMES, r), phone: pick(GUEST_PHONES, r) } }
          : { userId: pick(userIds, r) }),
        items,
        totalAmount,
        orderType: 'purchase',
        paymentStatus,
        paidAmount: totalAmount,
        pointsEarned: isGuest ? 0 : Math.floor(totalAmount / 100),
        status,
        createdAt,
        updatedAt: createdAt
      });
    }
  }

  return orders;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🔗 連接資料庫: ${MONGODB_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ 連接成功');

  await OrderModel.deleteMany({});
  await ProductModel.deleteMany({});
  await UserModel.deleteMany({});
  console.log('🗑️  清除舊資料');

  // Users
  const createdUsers = await Promise.all(
    USERS.map(async (u) =>
      UserModel.create({ ...u, password: await bcrypt.hash(u.password, 10) })
    )
  );
  console.log(`👤 建立 ${createdUsers.length} 個帳號`);

  // Products
  const createdProducts = await ProductModel.insertMany(PRODUCTS) as Array<{ _id: mongoose.Types.ObjectId; name: string; price: number }>;
  console.log(`☕ 建立 ${createdProducts.length} 個商品`);

  // Historical orders (60 days)
  const memberIds = createdUsers
    .filter((u) => u.role === 'user')
    .map((u) => u._id as mongoose.Types.ObjectId);
  const orders = buildOrders(createdProducts, memberIds, 60);
  // Cast to any to bypass Mongoose's strict type on insertMany — createdAt is intentionally set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (OrderModel as any).collection.insertMany(
    orders.map((o) => ({ ...o, updatedAt: (o as any).createdAt }))
  );
  console.log(`📦 建立 ${orders.length} 筆歷史訂單（最近 60 天）`);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           展示帳號                   ║');
  console.log('╠══════════════════════════════════════╣');
  console.log('║ 角色    Email             密碼       ║');
  console.log('║ 管理員  admin@demo.com    demo1234   ║');
  console.log('║ 店員    staff@demo.com    demo1234   ║');
  console.log('║ 會員    user@demo.com     demo1234   ║');
  console.log('╚══════════════════════════════════════╝\n');

  await mongoose.disconnect();
  console.log('✅ Seed 完成\n');
}

seed().catch((err) => {
  console.error('❌ Seed 失敗:', err.message);
  process.exit(1);
});
