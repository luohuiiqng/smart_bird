<template>
  <div class="xfkj-placeholder xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">{{ title }}</div>
    <div class="xfkj-placeholder-panel">
      <div class="xfkj-placeholder-panel__icon" aria-hidden="true">
        <i class="layui-icon layui-icon-component"></i>
      </div>
      <p class="xfkj-placeholder-panel__hint">{{ hint }}</p>
      <div v-if="externalUrl" class="xfkj-placeholder-panel__actions">
        <a
          class="layui-btn layui-btn-normal layui-btn-radius"
          :href="externalUrl"
          target="_blank"
          rel="noopener noreferrer"
          >打开参考链接</a
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() =>
  typeof route.meta.placeholderTitle === 'string' ? route.meta.placeholderTitle : '功能建设中',
)
const hint = computed(() =>
  typeof route.meta.placeholderHint === 'string'
    ? route.meta.placeholderHint
    : '本地系统将逐步对齐该模块；当前可先使用左侧菜单中的已实现功能。',
)
const externalUrl = computed(() =>
  typeof route.meta.externalUrl === 'string' ? route.meta.externalUrl : '',
)
</script>
