<template>
  <section class="min-h-[calc(100vh-64px)] bg-stone-100 p-6">
    <header class="mb-5 flex items-center justify-between gap-4">
      <div>
        <h1 class="m-0 text-2xl font-bold text-slate-800">
          Admin Users
        </h1>
        <p class="m-0 text-slate-600">
          View and manage user roles.
        </p>
      </div>
      <button
        class="min-h-10 rounded-md border border-stone-500 bg-white px-4 font-bold text-slate-800"
        type="button"
        @click="loadUsers()"
      >
        Refresh
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
      Loading users...
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
          <p class="m-0 font-bold text-slate-800">
            {{ user.name }}
          </p>
          <p class="m-0 text-sm text-slate-500">
            {{ user.email }}
          </p>
          <p class="m-0 text-sm text-slate-500">
            Points: {{ user.points }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span
            class="rounded-full px-2 py-1 text-xs font-extrabold uppercase"
            :class="roleBadgeClass(user.role)"
          >
            {{ user.role }}
          </span>
          <select
            class="min-h-9 rounded-md border border-stone-400 px-2 text-sm"
            :value="user.role"
            @change="onRoleChange(user.id, ($event.target as HTMLSelectElement).value as 'user' | 'staff' | 'admin')"
          >
            <option value="user">
              user
            </option>
            <option value="staff">
              staff
            </option>
            <option value="admin">
              admin
            </option>
          </select>
        </div>
      </div>

      <div
        v-if="!userStore.isLoading && userStore.users.length === 0"
        class="rounded-lg border border-stone-300 bg-white p-4 text-slate-500"
      >
        No users found.
      </div>
    </div>

    <div
      v-if="userStore.pagination.total > userStore.pagination.limit"
      class="mt-4 flex items-center gap-3"
    >
      <button
        class="min-h-9 rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800 disabled:opacity-50"
        :disabled="userStore.pagination.page <= 1"
        type="button"
        @click="goToPage(userStore.pagination.page - 1)"
      >
        Prev
      </button>
      <span class="text-sm text-slate-600">
        Page {{ userStore.pagination.page }} / {{ totalPages }}
      </span>
      <button
        class="min-h-9 rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800 disabled:opacity-50"
        :disabled="userStore.pagination.page >= totalPages"
        type="button"
        @click="goToPage(userStore.pagination.page + 1)"
      >
        Next
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { User } from '../../api/user.api';
import { useUserAdminStore } from '../../stores/user-admin.store';

const userStore = useUserAdminStore();
const errorMessage = ref('');

const totalPages = computed(() =>
  Math.max(1, Math.ceil(userStore.pagination.total / userStore.pagination.limit))
);

function roleBadgeClass(role: User['role']) {
  if (role === 'admin') return 'bg-purple-100 text-purple-800';
  if (role === 'staff') return 'bg-blue-100 text-blue-800';
  return 'bg-stone-200 text-slate-700';
}

async function onRoleChange(id: string, role: User['role']) {
  errorMessage.value = '';
  try {
    await userStore.updateRole(id, role);
  } catch {
    errorMessage.value = 'Unable to update role.';
  }
}

async function loadUsers(page = 1) {
  errorMessage.value = '';
  try {
    await userStore.loadUsers(page);
  } catch {
    errorMessage.value = 'Unable to load users.';
  }
}

async function goToPage(page: number) {
  await loadUsers(page);
}

onMounted(() => loadUsers());
</script>
