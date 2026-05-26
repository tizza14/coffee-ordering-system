import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { OrderModel } from '../modules/orders/order.model';
import { ProductModel } from '../modules/products/product.model';
import { UserModel } from '../modules/users/user.model';
import { NotificationModel } from '../modules/notifications/notification.model';

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coffee_ordering';

// ── Static seed data ─────────────────────────────────────────────────────────

const USERS = [
  { name: '系統管理員', email: 'admin@demo.com', password: 'demo1234', role: 'admin' as const, points: 0 },
  { name: '店員 小明',  email: 'staff@demo.com', password: 'demo1234', role: 'staff' as const, points: 0 },
  { name: '會員 小花',  email: 'user@demo.com',  password: 'demo1234', role: 'user'  as const, points: 0 }
];

const PRODUCTS = [
  { name: '美式咖啡',     category: 'coffee',  price: 65,  isAvailable: true, isRedeemable: true,  redeemPoints: 3, description: '濃郁黑咖啡，清爽不苦澀' },
  { name: '拿鐵咖啡',     category: 'coffee',  price: 85,  isAvailable: true, isRedeemable: true,  redeemPoints: 3, description: '義式濃縮加上香滑牛奶' },
  { name: '卡布奇諾',     category: 'coffee',  price: 85,  isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '濃縮咖啡與綿密奶泡的完美比例' },
  { name: '焦糖瑪奇朵',   category: 'coffee',  price: 110, isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '香甜焦糖搭配濃縮咖啡' },
  { name: '冰滴咖啡',     category: 'coffee',  price: 120, isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '長時間低溫萃取，口感滑順' },
  { name: '抹茶拿鐵',     category: 'dessert', price: 95,  isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '日本宇治抹茶粉，香氣濃郁' },
  { name: '黑糖珍珠鮮奶', category: 'dessert', price: 100, isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '手工黑糖珍珠，Q彈有嚼勁' },
  { name: '奶油可頌',     category: 'dessert', price: 55,  isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '法式千層麵團，外酥內軟' },
  { name: '起司蛋糕',     category: 'dessert', price: 90,  isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '紐約式重乳酪，濃郁滑順' },
  { name: '巧克力布朗尼', category: 'dessert', price: 75,  isAvailable: true, isRedeemable: false, redeemPoints: 3, description: '比利時巧克力，濕潤扎實' }
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function lookupCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

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

// ── Historical orders (past 60 days, all completed) ───────────────────────────

function buildHistoricalOrders(
  products: Array<{ _id: mongoose.Types.ObjectId; name: string; price: number }>,
  userIds: mongoose.Types.ObjectId[],
  daysBack: number
) {
  const orders: Record<string, unknown>[] = [];
  const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
  const DOW_MULT = [1.2, 1.0, 0.9, 1.0, 1.1, 1.3, 1.5];

  for (let ago = daysBack; ago >= 1; ago--) {
    const dayStart = taipeiDayStart(ago);
    const dayMsIntoTaipei = new Date(dayStart.getTime() + TAIPEI_OFFSET_MS);
    const dow = dayMsIntoTaipei.getUTCDay();
    const mult = DOW_MULT[dow];
    const rand = rng(ago * 7919 + 31337);
    const count = Math.round(6 * mult * (0.7 + rand() * 0.6));

    for (let i = 0; i < count; i++) {
      const r = rng(ago * 1000 + i * 37 + 1);
      const offsetMs = Math.floor(r() * 10 * 60 * 60 * 1000);
      const createdAt = new Date(dayStart.getTime() + offsetMs);
      const isGuest = r() < 0.35;
      const numItems = Math.floor(r() * 3) + 1;
      const items = Array.from({ length: numItems }, () => {
        const p = pick(products, r);
        return { productId: p._id, name: p.name, price: p.price, quantity: Math.floor(r() * 2) + 1 };
      });
      const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const cancelled = r() < 0.05;
      const status = cancelled ? 'cancelled' : 'completed';
      const paymentStatus = cancelled && r() < 0.5 ? 'refunded' : 'paid';
      const userId = isGuest ? undefined : pick(userIds, r);

      orders.push({
        ...(isGuest
          ? { guestInfo: { name: pick(GUEST_NAMES, r), phone: pick(GUEST_PHONES, r) } }
          : { userId, guestInfo: { phone: pick(GUEST_PHONES, r) } }),
        orderLookupCode: lookupCode(),
        items,
        totalAmount,
        orderType: 'purchase',
        paymentStatus,
        paidAmount: paymentStatus === 'paid' ? totalAmount : 0,
        pointsEarned: (!isGuest && paymentStatus === 'paid') ? Math.floor(totalAmount / 100) : 0,
        status,
        createdAt,
        updatedAt: createdAt
      });
    }
  }

  return orders;
}

// ── Today's live orders (for staff demo) ─────────────────────────────────────

function buildTodayOrders(
  products: Array<{ _id: mongoose.Types.ObjectId; name: string; price: number }>,
  memberId: mongoose.Types.ObjectId,
  staffId: mongoose.Types.ObjectId
) {
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

  const latte  = products.find(p => p.name === '拿鐵咖啡')!;
  const ameri  = products.find(p => p.name === '美式咖啡')!;
  const brownie = products.find(p => p.name === '巧克力布朗尼')!;
  const croissant = products.find(p => p.name === '奶油可頌')!;

  return [
    // 1. 待處理 — 訪客剛下單
    {
      guestInfo: { name: '陳小明', phone: '0912345678' },
      orderLookupCode: 'DEMO0001',
      items: [
        { productId: latte._id, name: latte.name, price: latte.price, quantity: 2 },
        { productId: brownie._id, name: brownie.name, price: brownie.price, quantity: 1 }
      ],
      totalAmount: latte.price * 2 + brownie.price,
      orderType: 'purchase', paymentStatus: 'paid', paidAmount: latte.price * 2 + brownie.price,
      pointsEarned: 0, status: 'pending', createdAt: minutesAgo(5), updatedAt: minutesAgo(5)
    },
    // 2. 製作中 — 會員
    {
      userId: memberId,
      guestInfo: { phone: '0912345678' },
      orderLookupCode: 'DEMO0002',
      items: [{ productId: ameri._id, name: ameri.name, price: ameri.price, quantity: 1 }],
      totalAmount: ameri.price,
      orderType: 'purchase', paymentStatus: 'paid', paidAmount: ameri.price,
      pointsEarned: 0, status: 'preparing', createdAt: minutesAgo(12), updatedAt: minutesAgo(8)
    },
    // 3. 可取餐 — 訪客
    {
      guestInfo: { name: '林雅婷', phone: '0934567890' },
      orderLookupCode: 'DEMO0003',
      items: [
        { productId: latte._id, name: latte.name, price: latte.price, quantity: 1 },
        { productId: croissant._id, name: croissant.name, price: croissant.price, quantity: 2 }
      ],
      totalAmount: latte.price + croissant.price * 2,
      orderType: 'purchase', paymentStatus: 'paid', paidAmount: latte.price + croissant.price * 2,
      pointsEarned: 0, status: 'ready', createdAt: minutesAgo(20), updatedAt: minutesAgo(3)
    },
    // 4. 已完成今日早些時候 — 會員
    {
      userId: memberId,
      guestInfo: { phone: '0912345678' },
      orderLookupCode: 'DEMO0004',
      items: [{ productId: latte._id, name: latte.name, price: latte.price, quantity: 1 }],
      totalAmount: latte.price,
      orderType: 'purchase', paymentStatus: 'paid', paidAmount: latte.price,
      pointsEarned: 0, status: 'completed', createdAt: minutesAgo(90), updatedAt: minutesAgo(75)
    },
    // 5. 店員自己下的訂單 — 今日已完成
    {
      userId: staffId,
      guestInfo: { phone: '0923456789' },
      orderLookupCode: 'DEMO0005',
      items: [
        { productId: ameri._id, name: ameri.name, price: ameri.price, quantity: 1 },
        { productId: croissant._id, name: croissant.name, price: croissant.price, quantity: 1 }
      ],
      totalAmount: ameri.price + croissant.price,
      orderType: 'purchase', paymentStatus: 'paid', paidAmount: ameri.price + croissant.price,
      pointsEarned: 0, status: 'completed', createdAt: minutesAgo(130), updatedAt: minutesAgo(115)
    }
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🔗 連接資料庫: ${MONGODB_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ 連接成功');

  await NotificationModel.deleteMany({});
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

  // Historical orders (60 days back, skip today)
  const memberUser = createdUsers.find(u => u.role === 'user')!;
  const staffUser  = createdUsers.find(u => u.role === 'staff')!;
  const memberIds = [
    memberUser._id as mongoose.Types.ObjectId,
    staffUser._id  as mongoose.Types.ObjectId
  ];
  const histOrders = buildHistoricalOrders(createdProducts, memberIds, 60);
  await OrderModel.collection.insertMany(histOrders);
  console.log(`📦 建立 ${histOrders.length} 筆歷史訂單（最近 60 天）`);

  // Today's live demo orders
  const todayOrders = buildTodayOrders(
    createdProducts,
    memberUser._id as mongoose.Types.ObjectId,
    staffUser._id  as mongoose.Types.ObjectId
  );
  await OrderModel.collection.insertMany(todayOrders);
  console.log(`📋 建立 ${todayOrders.length} 筆今日展示訂單`);

  // Sync member points from historical paid orders
  const memberOrders = histOrders.filter(
    (o) => String(o.userId) === memberUser._id.toString() && o.paymentStatus === 'paid'
  );
  const totalPoints = memberOrders.reduce((sum, o) => sum + (Number(o.pointsEarned) || 0), 0);
  // Give demo user a nice starting balance (min 5 points for easy redeem demo)
  const demoPoints = Math.max(totalPoints, 5);
  await UserModel.findByIdAndUpdate(memberUser._id, { points: demoPoints });
  console.log(`⭐ 會員點數設為 ${demoPoints} 點`);

  // Summary
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║              展示帳號                         ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log('║  角色    Email              密碼              ║');
  console.log('║  管理員  admin@demo.com     demo1234          ║');
  console.log('║  店員    staff@demo.com     demo1234          ║');
  console.log('║  會員    user@demo.com      demo1234          ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log('║  訪客訂單查詢碼 (lookup)                      ║');
  console.log('║  DEMO0001  phone: 0912345678  待處理          ║');
  console.log('║  DEMO0003  phone: 0934567890  可取餐          ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  console.log('✅ Seed 完成\n');
}

seed().catch((err) => {
  console.error('❌ Seed 失敗:', err.message);
  process.exit(1);
});
