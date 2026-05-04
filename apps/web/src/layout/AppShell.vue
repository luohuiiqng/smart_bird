<template>
  <div v-if="initializing" class="loading">加载中...</div>
  <div v-else-if="user" class="xfkj-shell">
    <div
      class="xfkj-shell__menu main_menu"
      :class="{ 'xfkj-shell__menu--expanded': menuExpanded }"
    >
      <div class="xfkj-shell__logo main_menu_logo">
        <img :src="LogoUrl" alt="" width="160" />
      </div>
      <nav class="menu_list">
        <ul>
          <li
            v-for="item in visibleSideMenus"
            :key="item.to"
            :class="{ active: isSideActive(item.to) }"
          >
            <router-link :to="item.to" :class="{ cur: isSideActive(item.to) }">{{ item.label }}</router-link>
          </li>
        </ul>
      </nav>

      <div class="admin_sz">
        <div class="user">
          <p>管理员</p>
          <ul class="setmenu">
            <li v-if="showAdminLinks">
              <router-link to="/teachers"><i class="layui-icon layui-icon-user"></i>教师管理</router-link>
            </li>
            <li v-if="showAdminLinks">
              <router-link to="/students"><i class="layui-icon layui-icon-user"></i>学生档案</router-link>
            </li>
            <li v-if="showAdminLinks">
              <router-link to="/org"><i class="layui-icon layui-icon-component"></i>基础档案</router-link>
            </li>
            <li v-if="showAdminLinks">
              <router-link to="/duties"><i class="layui-icon layui-icon-user"></i>职务设置</router-link>
            </li>
            <li>
              <a href="javascript:void(0)" @click.prevent="onChangePwd"
                ><i class="layui-icon layui-icon-about"></i>修改密码</a
              >
            </li>
          </ul>
        </div>
        <span class="out" role="button" tabindex="0" @click="onLogout">退出</span>
      </div>

      <div class="zd_btn" role="button" tabindex="0" @click="toggleMenu">
        <img :src="menuExpanded ? foldImgOpen : foldImgClosed" width="50" height="50" alt="" />
      </div>
    </div>

    <div class="xfkj-shell__right main_right right" :class="{ 'xfkj-shell__right--expanded': menuExpanded }">
      <div class="main_right_dh">
        <router-link to="/manage/index">
          <img :src="LogoUrl" id="weblogo" width="120" height="auto" alt="" />
        </router-link>
        &nbsp;&nbsp;&nbsp;&nbsp;
        <router-link to="/manage/index">首页</router-link>
        &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        {{ breadcrumbTrail }}

        <div class="xfkj-shell__userbar">
          <span class="xfkj-shell__username">
            用户名称：{{ roleShort(user.role) }} {{ user.realName
            }}<template v-if="user.schoolName"> · {{ user.schoolName }}</template
            ><template v-else-if="user.schoolId !== null"> · 学校 ID {{ user.schoolId }}</template>
          </span>
          <span class="xfkj-shell__sep">丨</span>
          <button type="button" class="layui-btn layui-btn-sm layui-btn-radius layui-btn-normal xfkj-shell__logout-btn" @click="onLogout">
            <i class="layui-icon layui-icon-logout"></i> 退出
          </button>
        </div>
      </div>

      <div class="main_box xfkj-shell__body">
        <router-view />
      </div>

      <div id="icp" class="xfkj-shell__icp">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">皖ICP备2022012916号-2</a>
      </div>
    </div>

    <div v-if="pwdOpen" class="xfkj-modal-mask" role="dialog" aria-modal="true" @click.self="closePwd">
      <div class="xfkj-modal">
        <h3 class="xfkj-modal__title">修改密码</h3>
        <p class="xfkj-modal__hint">修改成功后需重新登录。</p>
        <form class="xfkj-modal__form" @submit.prevent="submitPwd">
          <label class="xfkj-modal__field">
            <span>当前密码</span>
            <input v-model="pwdCurrent" type="password" autocomplete="current-password" required />
          </label>
          <label class="xfkj-modal__field">
            <span>新密码（≥6 位）</span>
            <input v-model="pwdNew" type="password" autocomplete="new-password" required minlength="6" />
          </label>
          <label class="xfkj-modal__field">
            <span>确认新密码</span>
            <input v-model="pwdNew2" type="password" autocomplete="new-password" required minlength="6" />
          </label>
          <p v-if="pwdError" class="error-tip">{{ pwdError }}</p>
          <div class="xfkj-modal__actions">
            <button type="button" class="layui-btn layui-btn-primary" @click="closePwd">取消</button>
            <button type="submit" class="layui-btn layui-btn-normal" :disabled="pwdSaving">
              {{ pwdSaving ? '提交中…' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changePassword } from '../lib/api'
import { useAuth } from '../auth/store'
import type { UserRole } from '../types'

const LogoUrl = 'https://www.xfkj.cc/images/v1/images/logo2.png'
const foldImgClosed = 'https://www.xfkj.cc/images/v1/images/zhedie_1.png'
const foldImgOpen = 'https://www.xfkj.cc/images/v1/images/zhedie_2.png'

const { user, initializing, logout } = useAuth()
const route = useRoute()
const router = useRouter()

/** 与小帆一致：侧栏默认收起，点击褶皱按钮展开 */
const menuExpanded = ref(false)

function toggleMenu() {
  menuExpanded.value = !menuExpanded.value
}

type SideItem = { to: string; label: string; roles: UserRole[] }

const SIDE_ITEMS: SideItem[] = [
  { to: '/manage/index', label: '应用中心', roles: ['SCHOOL_ADMIN', 'TEACHER', 'SYSTEM_ADMIN'] },
  { to: '/marking', label: '阅卷任务', roles: ['SCHOOL_ADMIN', 'TEACHER', 'SYSTEM_ADMIN'] },
  { to: '/exam', label: '本校考试管理', roles: ['SCHOOL_ADMIN', 'SYSTEM_ADMIN'] },
  { to: '/manage/sheet_list', label: '答题卡工具', roles: ['SCHOOL_ADMIN', 'SYSTEM_ADMIN'] },
  { to: '/guide', label: '用户指南', roles: ['SCHOOL_ADMIN', 'TEACHER', 'SYSTEM_ADMIN'] },
  { to: '/downloads', label: '下载中心', roles: ['SCHOOL_ADMIN', 'TEACHER', 'SYSTEM_ADMIN'] },
  { to: '/audit', label: '系统日志', roles: ['SCHOOL_ADMIN', 'SYSTEM_ADMIN'] },
]

const TEACHER_SIDE: SideItem[] = [
  { to: '/manage/index', label: '应用中心', roles: ['TEACHER'] },
  { to: '/marking', label: '阅卷任务', roles: ['TEACHER'] },
  { to: '/scores', label: '成绩查询', roles: ['TEACHER'] },
  { to: '/analysis', label: '成绩分析', roles: ['TEACHER'] },
  { to: '/files', label: '文件中心', roles: ['TEACHER'] },
  { to: '/guide', label: '用户指南', roles: ['TEACHER'] },
  { to: '/downloads', label: '下载中心', roles: ['TEACHER'] },
]

const visibleSideMenus = computed(() => {
  const r = user.value?.role
  if (!r) return []
  if (r === 'TEACHER') return TEACHER_SIDE
  return SIDE_ITEMS.filter((x) => x.roles.includes(r))
})

const showAdminLinks = computed(() => {
  const r = user.value?.role
  return r === 'SCHOOL_ADMIN' || r === 'SYSTEM_ADMIN'
})

const breadcrumbTrail = computed(() => {
  const last = route.matched[route.matched.length - 1]
  const br = last?.meta?.breadcrumb
  if (typeof br === 'string' && br.length) return br
  const t = last?.meta?.title
  return typeof t === 'string' ? t : '应用中心'
})

function roleShort(role: UserRole) {
  const map: Record<UserRole, string> = {
    SYSTEM_ADMIN: '系统管理员',
    SCHOOL_ADMIN: '管理员',
    TEACHER: '教师',
  }
  return map[role]
}

function isSideActive(to: string) {
  if (to === '/manage/index') {
    return route.path === '/manage/index' || route.path === '/' || route.path === ''
  }
  if (to === '/manage/sheet_list') {
    return (
      route.path === '/manage/sheet_list' ||
      route.path.startsWith('/sheet/') ||
      route.path === '/sheet'
    )
  }
  return route.path === to || route.path.startsWith(`${to}/`)
}

const pwdOpen = ref(false)
const pwdCurrent = ref('')
const pwdNew = ref('')
const pwdNew2 = ref('')
const pwdError = ref('')
const pwdSaving = ref(false)

function onChangePwd() {
  pwdError.value = ''
  pwdCurrent.value = ''
  pwdNew.value = ''
  pwdNew2.value = ''
  pwdOpen.value = true
}

function closePwd() {
  pwdOpen.value = false
}

async function submitPwd() {
  pwdError.value = ''
  if (pwdNew.value !== pwdNew2.value) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  pwdSaving.value = true
  try {
    await changePassword(pwdCurrent.value, pwdNew.value)
    closePwd()
    logout()
    void router.push({ name: 'login' })
  } catch (e) {
    pwdError.value = e instanceof Error ? e.message : '修改失败'
  } finally {
    pwdSaving.value = false
  }
}

function onLogout() {
  logout()
  void router.push({ name: 'login' })
}
</script>
