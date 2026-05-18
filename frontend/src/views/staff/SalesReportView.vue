<template>
  <section class="grid min-h-[calc(100vh-64px)] content-start gap-5 bg-amber-50 p-4 sm:p-6">
    <header>
      <h1 class="m-0 text-2xl font-bold text-amber-950">銷售報表</h1>
      <p class="m-0 text-stone-600">依日/週/月/年查詢銷售紀錄。</p>
    </header>

    <!-- Period selector + date picker -->
    <section class="flex flex-wrap items-end gap-4 rounded-lg border border-stone-300 bg-white p-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in periods"
          :key="p.value"
          class="min-h-9 rounded-md border px-4 font-bold transition-colors"
          :class="
            selectedPeriod === p.value
              ? 'border-amber-900 bg-amber-900 text-white'
              : 'border-stone-400 bg-white text-amber-950 hover:border-amber-900 hover:bg-amber-50'
          "
          type="button"
          @click="switchPeriod(p.value)"
        >
          {{ p.label }}
        </button>
      </div>

      <div class="flex flex-wrap items-end gap-3">
        <template v-if="selectedPeriod === 'day'">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-stone-500">選擇日期</span>
            <input
              v-model="selectedDate"
              class="rounded-md border border-stone-400 px-3 py-1.5 text-amber-950"
              type="date"
              :max="maxDate"
              @change="loadReport"
            />
          </label>
        </template>

        <template v-else-if="selectedPeriod === 'week'">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-stone-500">選擇週內任一日</span>
            <input
              v-model="selectedDate"
              class="rounded-md border border-stone-400 px-3 py-1.5 text-amber-950"
              type="date"
              :max="maxDate"
              @change="loadReport"
            />
          </label>
        </template>

        <template v-else-if="selectedPeriod === 'month'">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-stone-500">選擇月份</span>
            <input
              v-model="selectedMonth"
              class="rounded-md border border-stone-400 px-3 py-1.5 text-amber-950"
              type="month"
              :max="maxMonth"
              @change="loadReport"
            />
          </label>
        </template>

        <template v-else>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-stone-500">選擇年份</span>
            <select
              v-model="selectedYear"
              class="rounded-md border border-stone-400 px-3 py-1.5 text-amber-950"
              @change="loadReport"
            >
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
            </select>
          </label>
        </template>
      </div>
    </section>

    <!-- Loading / error -->
    <p
      v-if="isLoading"
      class="m-0 rounded-lg border border-stone-300 bg-white p-4 text-stone-600"
    >
      載入中...
    </p>
    <p
      v-else-if="errorMessage"
      class="m-0 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700"
    >
      {{ errorMessage }}
    </p>

    <template v-else-if="report">
      <!-- Summary cards -->
      <section class="grid gap-3 sm:grid-cols-3">
        <article class="rounded-lg border border-stone-300 bg-white p-4">
          <p class="m-0 text-sm font-bold uppercase text-stone-500">總營收</p>
          <strong class="text-2xl text-amber-950">NT$ {{ report.totalRevenue.toLocaleString() }}</strong>
        </article>
        <article class="rounded-lg border border-stone-300 bg-white p-4">
          <p class="m-0 text-sm font-bold uppercase text-stone-500">已付款訂單</p>
          <strong class="text-2xl text-amber-950">{{ report.totalOrders }}</strong>
        </article>
        <article class="rounded-lg border border-stone-300 bg-white p-4">
          <p class="m-0 text-sm font-bold uppercase text-stone-500">已售品項</p>
          <strong class="text-2xl text-amber-950">{{ report.totalItems }}</strong>
        </article>
      </section>

      <!-- Breakdown table -->
      <section
        v-if="report.breakdown.length > 1"
        class="overflow-x-auto rounded-lg border border-stone-300 bg-white"
      >
        <div class="p-4 pb-2">
          <h2 class="m-0 text-lg font-bold text-amber-950">
            {{ periodBreakdownTitle }}
            <span class="ml-2 text-sm font-normal text-stone-500">{{ report.label }}</span>
          </h2>
        </div>
        <table class="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr class="border-t border-stone-200 bg-stone-50 text-left text-xs font-bold uppercase text-stone-500">
              <th class="px-4 py-2">{{ periodColLabel }}</th>
              <th class="px-4 py-2 text-right">營收 (NT$)</th>
              <th class="px-4 py-2 text-right">訂單數</th>
              <th class="px-4 py-2 text-right">品項數</th>
              <th class="px-4 py-2 text-right">佔比</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="bucket in report.breakdown"
              :key="bucket.date"
              class="border-t border-stone-200 text-amber-950 hover:bg-amber-50"
            >
              <td class="px-4 py-2 font-bold">{{ bucket.label }}</td>
              <td class="px-4 py-2 text-right">{{ bucket.revenue.toLocaleString() }}</td>
              <td class="px-4 py-2 text-right">{{ bucket.orders }}</td>
              <td class="px-4 py-2 text-right">{{ bucket.items }}</td>
              <td class="px-4 py-2 text-right text-stone-500">
                {{ report.totalRevenue > 0 ? Math.round((bucket.revenue / report.totalRevenue) * 100) : 0 }}%
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-stone-300 bg-stone-50 font-bold text-amber-950">
              <td class="px-4 py-2">合計</td>
              <td class="px-4 py-2 text-right">{{ report.totalRevenue.toLocaleString() }}</td>
              <td class="px-4 py-2 text-right">{{ report.totalOrders }}</td>
              <td class="px-4 py-2 text-right">{{ report.totalItems }}</td>
              <td class="px-4 py-2 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <!-- Sold items breakdown -->
      <section class="rounded-lg border border-stone-300 bg-white p-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="m-0 text-lg font-bold text-amber-950">銷售品項明細</h2>
          <span class="text-sm font-bold text-stone-500">共 {{ report.soldItems.length }} 種商品</span>
        </div>
        <p v-if="report.soldItems.length === 0" class="m-0 pt-3 text-stone-600">
          此期間無已付款品項。
        </p>
        <div v-else class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[400px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-stone-200 text-left text-xs font-bold uppercase text-stone-500">
                <th class="pb-2 pr-4">商品名稱</th>
                <th class="pb-2 pr-4 text-right">數量</th>
                <th class="pb-2 text-right">營收 (NT$)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in report.soldItems"
                :key="item.productId"
                class="border-t border-stone-200 text-amber-950"
              >
                <td class="py-2 pr-4 font-bold">{{ item.name }}</td>
                <td class="py-2 pr-4 text-right">{{ item.quantity }}</td>
                <td class="py-2 text-right">{{ item.revenue.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import * as orderApi from '../../api/order.api';
import type { SalesReport } from '../../api/order.api';

const periods = [
  { value: 'day' as const, label: '日' },
  { value: 'week' as const, label: '週' },
  { value: 'month' as const, label: '月' },
  { value: 'year' as const, label: '年' }
];

function taipeiToday(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function taipeiThisMonth(): string {
  return taipeiToday().slice(0, 7);
}

function taipeiThisYear(): number {
  return Number(taipeiToday().slice(0, 4));
}

const selectedPeriod = ref<'day' | 'week' | 'month' | 'year'>('day');
const selectedDate = ref(taipeiToday());
const selectedMonth = ref(taipeiThisMonth());
const selectedYear = ref(taipeiThisYear());

const maxDate = taipeiToday();
const maxMonth = taipeiThisMonth();
const yearOptions = computed(() => {
  const current = taipeiThisYear();
  return Array.from({ length: 5 }, (_, i) => current - i);
});

const report = ref<SalesReport | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const periodBreakdownTitle = computed(() => {
  const map: Record<string, string> = {
    week: '每日明細',
    month: '每日明細',
    year: '每月明細'
  };
  return map[selectedPeriod.value] ?? '';
});

const periodColLabel = computed(() => {
  const map: Record<string, string> = { week: '星期', month: '日期', year: '月份' };
  return map[selectedPeriod.value] ?? '期間';
});

function buildParams() {
  if (selectedPeriod.value === 'day' || selectedPeriod.value === 'week') {
    return { period: selectedPeriod.value, date: selectedDate.value };
  }
  if (selectedPeriod.value === 'month') {
    const [y, m] = selectedMonth.value.split('-').map(Number);
    return { period: selectedPeriod.value, year: y, month: m };
  }
  return { period: selectedPeriod.value, year: selectedYear.value };
}

async function loadReport() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    report.value = await orderApi.getSalesReport(buildParams());
  } catch {
    errorMessage.value = '無法載入銷售報表。';
  } finally {
    isLoading.value = false;
  }
}

function switchPeriod(p: 'day' | 'week' | 'month' | 'year') {
  selectedPeriod.value = p;
  loadReport();
}

onMounted(loadReport);
</script>
