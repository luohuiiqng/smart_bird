<template>
  <div class="H_yj xfkj-dash">
    <!-- 第一行：本校考试、答题卡（大图标） -->
    <div class="xfkj-dash__tier xfkj-dash__tier--large clearfix">
      <div class="top_li">
        <router-link v-if="canExam" to="/exam">
          <p class="img"><i class="layui-icon">&#xe62a;</i></p>
          <p class="name">本校考试</p>
          <p class="text">方便快捷的创建与管理考试。一键生成考生、试卷等</p>
        </router-link>
        <div v-else class="xfkj-dash__disabled">
          <p class="img"><i class="layui-icon">&#xe62a;</i></p>
          <p class="name">本校考试</p>
          <p class="text">当前账号无本校考试管理权限</p>
        </div>
      </div>
      <div class="top_li">
        <router-link v-if="canSheet" to="/manage/sheet_list">
          <p class="img"><i class="layui-icon">&#xe6b2;</i></p>
          <p class="name">答题卡设计</p>
          <p class="text">轻松创建功能灵活全面的答题卡模板</p>
        </router-link>
        <div v-else class="xfkj-dash__disabled">
          <p class="img"><i class="layui-icon">&#xe6b2;</i></p>
          <p class="name">答题卡设计</p>
          <p class="text">当前账号无答题卡模板管理权限</p>
        </div>
      </div>
    </div>

    <!-- 中间 6 宫格：顺序与 example/小帆智能阅卷系统.html .top_right 一致 -->
    <div class="xfkj-dash__tier xfkj-dash__tier--medium clearfix">
      <div v-for="card in tierCenterCards" :key="`${card.toPath}-${card.name}`" class="btm_li">
        <router-link v-if="card.show" :to="card.toPath">
          <p class="name">{{ card.name }}</p>
          <p class="text">{{ card.text }}</p>
          <p class="icon"><i class="layui-icon" :class="card.iconClass" v-html="card.iconHtml"></i></p>
        </router-link>
        <div v-else class="xfkj-dash__disabled-inner">
          <p class="name">{{ card.name }}</p>
          <p class="text">无权限或未开放</p>
        </div>
      </div>
    </div>

    <!-- 第三行：年级档案、科目档案、科目拆分（横卡，对齐小帆底栏） -->
    <div class="xfkj-dash__tier xfkj-dash__tier--bottom-wide clearfix">
      <div v-for="card in tier3BottomCards" :key="`${card.toPath}-${card.name}`" class="btm_li">
        <router-link v-if="card.show" :to="card.toPath">
          <p class="name">{{ card.name }}</p>
          <p class="text">{{ card.text }}</p>
          <p class="icon"><i class="layui-icon" :class="card.iconClass" v-html="card.iconHtml"></i></p>
        </router-link>
        <div v-else class="xfkj-dash__disabled-inner">
          <p class="name">{{ card.name }}</p>
          <p class="text">无权限或未开放</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../auth/store'
import type { UserRole } from '../types'

const { user } = useAuth()

function hasRole(roles: UserRole[]) {
  const r = user.value?.role
  return r ? roles.includes(r) : false
}

const canExam = computed(() => hasRole(['SCHOOL_ADMIN', 'SYSTEM_ADMIN']))
const canSheet = computed(() => hasRole(['SCHOOL_ADMIN', 'SYSTEM_ADMIN']))
const canOrg = computed(() => hasRole(['SCHOOL_ADMIN', 'SYSTEM_ADMIN']))
const canScores = computed(() => hasRole(['SCHOOL_ADMIN', 'TEACHER', 'SYSTEM_ADMIN']))
const canSplit = computed(() => hasRole(['SCHOOL_ADMIN', 'SYSTEM_ADMIN']))
const canMarking = computed(() => hasRole(['SCHOOL_ADMIN', 'TEACHER', 'SYSTEM_ADMIN']))
const canTeachers = computed(() => hasRole(['SCHOOL_ADMIN', 'SYSTEM_ADMIN']))
const canLiankao = computed(() => hasRole(['SCHOOL_ADMIN', 'SYSTEM_ADMIN']))

/** 与 xfkj 示例页中间 6 卡顺序一致：成绩分析→学生→班级→联考→阅卷→教师 */
const tierCenterCards = computed(() => [
  {
    toPath: '/analysis',
    name: '成绩分析',
    text: '基于考试数据生成丰富的分析报表，方便直观',
    iconClass: 'icon1',
    iconHtml: '&#xe629;',
    show: canScores.value,
  },
  {
    toPath: '/students',
    name: '学生档案',
    text: '提供学生档案的导入导出及资料编辑',
    iconClass: 'icon2',
    iconHtml: '&#xe63c;',
    show: canOrg.value,
  },
  {
    toPath: '/org#org-class',
    name: '班级档案',
    text: '班级设置，一键创建年级班别数据',
    iconClass: 'icon3',
    iconHtml: '&#xe630;',
    show: canOrg.value,
  },
  {
    toPath: '/liankao',
    name: '多校联考',
    text: '管理员可轻松创建与管理多校联考，一键生成考试数据',
    iconClass: 'icon4',
    iconHtml: '&#xe857;',
    show: canLiankao.value,
  },
  {
    toPath: '/marking',
    name: '阅卷任务',
    text: '一键化智能阅卷，自动分析学生知识薄弱点',
    iconClass: 'icon5',
    iconHtml: '&#xe705;',
    show: canMarking.value,
  },
  {
    toPath: '/teachers',
    name: '教师管理',
    text: '教师信息管理',
    iconClass: 'icon6',
    iconHtml: '&#xe770;',
    show: canTeachers.value,
  },
])

/** 底排顺序与 xfkj .a_btm 一致：科目档案、年级档案、科目拆分 */
const tier3BottomCards = computed(() => [
  {
    toPath: '/org#org-subject',
    name: '科目档案',
    text: '提供科目的导入以及资料编辑',
    iconClass: 'icon1',
    iconHtml: '&#xe656;',
    show: canOrg.value,
  },
  {
    toPath: '/org#org-grade',
    name: '年级档案',
    text: '提供年级资料的编辑',
    iconClass: 'icon2',
    iconHtml: '&#xe857;',
    show: canOrg.value,
  },
  {
    toPath: '/split',
    name: '科目拆分',
    text: '综合试卷可拆分为多个项目试卷',
    iconClass: 'icon3',
    iconHtml: '&#xe630;',
    show: canSplit.value,
  },
])
</script>
