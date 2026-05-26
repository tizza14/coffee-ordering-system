<template>
  <section class="min-h-[calc(100vh-64px)] bg-amber-50 p-4 sm:p-6">
    <header
      class="mb-5 flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-amber-950">
          使用者管理
        </h1>
        <p class="m-0 text-stone-600">
          檢視並管理使用者角色。
        </p>
      </div>
      <button
        class="min-h-10 rounded-md border border-stone-500 bg-white px-4 font-bold text-amber-950"
        type="button"
        @click="loadUsers()"
      >
        重新整理
      </button>
    </header>

    <p
      v-if="errorMessage"
      class="mb-4 font-bold text-red-700"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="userStore.isLoading"
      class="rounded-lg border border-stone-300 bg-white p-4"
    >
      載入使用者中...
    </p>

    <div
      v-else
      class="grid gap-3"
    >
      <div
        v-for="user in userStore.users"
        :key="user.id"
        class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-300 bg-white p-4"
      >
        <div>
          <p class="m-0 font-bold text-amber-950">
            {{ user.name }}
          </p>
          <p class="m-0 text-sm text-stone-500">
            {{ user.email }}
          </p>
          <p class="m-0 text-sm text-stone-500">
            點數：{{ user.points }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-2 py-1 text-xs font-extrabold uppercase"
            :class="roleBadgeClass(user.role)"
          >
            {{ updatingUserId === user.id ? '更新中...' : roleLabel(user.role) }}
          </span>
          <select
            class="min-h-9 rounded-md border border-stone-400 px-2 text-sm disabled:opacity-60"
            :value="user.role"
            :disabled="updatingUserId === user.id"
            @change="
              onRoleChange(
                user.id,
                ($event.target as HTMLSelectElement).value as
                  | 'user'
                  | 'staff'
                  | 'admin'
              )
            "
          >
            <option value="user">
              一般使用者
            </option>
            <option value="staff">
              員工
            </option>
            <option value="admin">
              管理者
            </option>
          </select>
        </div>
      </div>

      <div
        v-if="!userStore.isLoading && userStore.users.length === 0"
        class="rounded-lg border border-stone-300 bg-white p-4 text-stone-500"
      >
        尚未找到使用者。
      </div>
    </div>

    <div
      v-if="userStore.pagination.total > userStore.pagination.limit"
      class="mt-4 flex flex-wrap items-center gap-3"
    >
      <button
        class="min-h-9 rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950 disabled:opacity-60"
        :disabled="userStore.pagination.page <= 1"
        type="button"
        @click="goToPage(userStore.pagination.page - 1)"
      >
        上一頁
      </button>
      <span class="text-sm text-stone-600">
        第 {{ userStore.pagination.page }} 頁 / 共 {{ totalPages }} 頁
      </span>
      <button
        class="min-h-9 rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950 disabled:opacity-60"
        :disabled="userStore.pagination.page >= totalPages"
        type="button"
        @click="goToPage(userStore.pagination.page + 1)"
      >
        下一頁
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { User } from '../../api/user.api';
import { useConfirmStore } from '../../stores/confirm.store';
import { useToastStore } from '../../stores/toast.store';
import { useUserAdminStore } from '../../stores/user-admin.store';

const userStore = useUserAdminStore();
const confirmStore = useConfirmStore();
const toastStore = useToastStore();
const errorMessage = ref('');
const updatingUserId = ref('');

const totalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(userStore.pagination.total / userStore.pagination.limit)
  )
);

function roleLabel(role: User['role']) {
  if (role === 'admin') return '管理者';
  if (role === 'staff') return '員工';
  return '一般使用者';
}

function roleBadgeClass(role: User['role']) {
  if (role === 'admin') return 'bg-purple-100 text-purple-800';
  if (role === 'staff') return 'bg-blue-100 text-blue-800';
  return 'bg-stone-200 text-amber-900';
}

async function onRoleChange(id: string, role: User['role']) {
  const user = userStore.users.find((u) => u.id === id);
  const ok = await confirmStore.confirm({
    title: '變更使用者角色',
    message: `確定要將 ${user?.name ?? '此使用者'} 的角色變更為「${roleLabel(role)}」嗎？`,
    confirmLabel: '確認變更',
    cancelLabel: '取消',
    danger: false
  });
  if (!ok) return;

  errorMessage.value = '';
  updatingUserId.value = id;
  try {
    await userStore.updateRole(id, role);
    toastStore.success(`已將 ${user?.name ?? '使用者'} 的角色更新為「${roleLabel(role)}」`);
  } catch {
    errorMessage.value = '無法更新角色。';
  } finally {
    updatingUserId.value = '';
  }
}

async function loadUsers(page = 1) {
  errorMessage.value = '';
  try {
    await userStore.loadUsers(page);
  } catch {
    errorMessage.value = '無法載入使用者。';
  }
}

async function goToPage(page: number) {
  await loadUsers(page);
}

onMounted(() => loadUsers());
</script>
