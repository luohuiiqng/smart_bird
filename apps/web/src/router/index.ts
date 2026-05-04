import { createRouter, createWebHistory } from 'vue-router'
import { authReady, getAuthState } from '../auth/store'
import AppShell from '../layout/AppShell.vue'
import AuditView from '../views/AuditView.vue'
import DashboardView from '../views/DashboardView.vue'
import ExamView from '../views/ExamView.vue'
import FilesView from '../views/FilesView.vue'
import LoginView from '../views/LoginView.vue'
import MarkingView from '../views/MarkingView.vue'
import OrgView from '../views/OrgView.vue'
import AnalysisView from '../views/AnalysisView.vue'
import DownloadsView from '../views/DownloadsView.vue'
import DutiesView from '../views/DutiesView.vue'
import GuideView from '../views/GuideView.vue'
import LiankaoView from '../views/LiankaoView.vue'
import SheetDesignPlaceholderView from '../views/SheetDesignPlaceholderView.vue'
import SheetToolView from '../views/SheetToolView.vue'
import SubjectSplitView from '../views/SubjectSplitView.vue'
import ScoresView from '../views/ScoresView.vue'
import StudentsView from '../views/StudentsView.vue'
import TeachersView from '../views/TeachersView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth', top: 80 }
    }
    return { left: 0, top: 0 }
  },
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    /** 与 xfkj 管理端一致：/manage 进入后台首页（应用中心） */
    { path: '/manage', redirect: '/manage/index' },
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'manage/index',
          name: 'manageIndex',
          component: DashboardView,
          meta: { title: '应用中心', breadcrumb: '大数据精准教学 应用中心' },
        },
        {
          path: '',
          name: 'dashboard',
          redirect: { name: 'manageIndex' },
        },
        { path: 'org', name: 'org', component: OrgView, meta: { title: '基础档案', breadcrumb: '基础档案管理' } },
        {
          path: 'teachers',
          name: 'teachers',
          component: TeachersView,
          meta: { title: '教师管理', breadcrumb: '教师管理' },
        },
        {
          path: 'students',
          name: 'students',
          component: StudentsView,
          meta: { title: '学生档案', breadcrumb: '学生档案' },
        },
        {
          path: 'exam',
          name: 'exam',
          component: ExamView,
          meta: { title: '本校考试管理', breadcrumb: '本校考试管理' },
        },
        { path: 'marking', name: 'marking', component: MarkingView, meta: { title: '阅卷任务', breadcrumb: '阅卷任务' } },
        { path: 'scores', name: 'scores', component: ScoresView, meta: { title: '成绩查询', breadcrumb: '成绩查询' } },
        { path: 'analysis', name: 'analysis', component: AnalysisView, meta: { title: '成绩分析', breadcrumb: '成绩分析' } },
        { path: 'files', name: 'files', component: FilesView, meta: { title: '文件中心', breadcrumb: '文件中心' } },
        { path: 'audit', name: 'audit', component: AuditView, meta: { title: '系统日志', breadcrumb: '系统日志' } },
        {
          path: 'sheet/design',
          name: 'sheet-design',
          component: SheetDesignPlaceholderView,
          meta: { title: '新建答题卡', breadcrumb: '答题卡工具 > 新建答题卡' },
        },
        /** 与小帆一致：https://hubei.xfkj.cc/manage/sheet_list */
        {
          path: 'manage/sheet_list',
          name: 'sheet',
          component: SheetToolView,
          meta: {
            title: '答题卡工具',
            breadcrumb: '答题卡模板管理',
          },
        },
        { path: 'sheet', redirect: { name: 'sheet' } },
        {
          path: 'guide',
          name: 'guide',
          component: GuideView,
          meta: { title: '用户指南', breadcrumb: '用户指南' },
        },
        {
          path: 'downloads',
          name: 'downloads',
          component: DownloadsView,
          meta: { title: '下载中心', breadcrumb: '下载中心' },
        },
        {
          path: 'liankao',
          name: 'liankao',
          component: LiankaoView,
          meta: { title: '多校联考', breadcrumb: '多校联考' },
        },
        {
          path: 'split',
          name: 'split',
          component: SubjectSplitView,
          meta: { title: '科目拆分', breadcrumb: '科目拆分' },
        },
        {
          path: 'duties',
          name: 'duties',
          component: DutiesView,
          meta: { title: '职务设置', breadcrumb: '职务设置' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  await authReady
  const { user } = getAuthState()
  if (to.meta.public) {
    if (user && to.name === 'login') {
      return { name: 'manageIndex' }
    }
    return true
  }
  if (to.meta.requiresAuth && !user) {
    return { name: 'login' }
  }
  return true
})

export default router
