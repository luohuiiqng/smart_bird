/// <reference types="vite/client" />

export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    breadcrumb?: string
    placeholderTitle?: string
    placeholderHint?: string
    externalUrl?: string
    public?: boolean
    requiresAuth?: boolean
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
