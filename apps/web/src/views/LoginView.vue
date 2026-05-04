<template>
  <div class="xfkj-login">
    <div class="xfkj-login__section">
      <header id="loginHead" class="xfkj-login__head">
        <div class="xfkj-login__head-in clearfix">
          <a class="xfkj-login__logo fl" href="javascript:void(0)">
            <span><img :src="assetLogo" alt="logo" /></span>
          </a>
          <ul class="xfkj-login__nav fl">
            <li><a class="on" href="javascript:void(0)">首页</a></li>
            <li><a target="_blank" rel="noopener noreferrer" href="https://www.xfkjedu.com/">官网</a></li>
          </ul>
        </div>
      </header>

      <div id="imgPlay" class="xfkj-login__banner">
        <div class="xfkj-login__banner-inner">
          <div class="xfkj-login__hero">
            <h2 class="xfkj-login__hero-title">大数据精准教学&nbsp;&nbsp;易学易用</h2>
            <div class="xfkj-login__hero-art" role="presentation" aria-hidden="true" />
          </div>

          <div class="xfkj-login__card-col">
        <form id="loginForm" class="xfkj-login__box layui-form" novalidate @submit.prevent="onSubmit">
          <p v-if="error" id="errorMsg" class="xfkj-login__msg">{{ error }}</p>

          <div class="xfkj-login__box-head clearfix">
            <span>用户登录</span>
          </div>

          <div
            class="xfkj-login__switch"
            data-type="qr"
            aria-label="切换登录方式"
            @click="showQr = !showQr"
          >
            <div
              class="xfkj-login__switch-icon"
              :class="showQr ? 'pwd' : 'qr'"
              id="loginSwitchBtn"
            />
          </div>

          <div v-show="!showQr" id="divLogin" class="xfkj-login__fill cl_login_fill">
            <input
              id="code"
              v-model="username"
              type="text"
              name="code"
              autocomplete="username"
              placeholder="手机号/阅卷账号/邮箱"
              class="u_name"
            />
            <input
              id="pwd"
              v-model="password"
              type="password"
              name="pwd"
              autocomplete="current-password"
              placeholder="密码"
              class="u_pwd"
            />
            <div class="xfkj-login__pwd-row pwd_remember mt10 clearfix">
              <div class="fl">
                <a
                  class="par_reg"
                  href="javascript:void(0)"
                  @click.prevent="onForgot(1, '忘记密码请扫描二维码')"
                  >忘记密码</a
                >
              </div>
              <div class="lost_pwd fr">
                <a
                  id="forget_password"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://xiaofankeji.oss-cn-zhangjiakou.aliyuncs.com/questionfile.pdf"
                  >登录遇到问题？</a
                >
              </div>
            </div>
          </div>

          <div v-show="showQr" class="xfkj-login__qr qr_login_panel" role="region" aria-label="扫码登录">
            <p class="xfkj-login__qr-tip qr_login_tips">请使用微信扫一扫登录</p>
            <div class="xfkj-login__qr-placeholder qr_code_content">
              <div class="xfkj-login__qr-fake qr_code" />
            </div>
            <p class="xfkj-login__qr-info qr_login_info">
              演示环境未接入官方扫码服务，请切换账号密码登录。
            </p>
          </div>

          <button
            id="signup_button"
            type="submit"
            class="xfkj-login__submit"
            :disabled="loading"
          >
            {{ loading ? '登录中…' : '登 录' }}
          </button>

          <div class="xfkj-login__note note_msg">
            温馨提示: <span style="padding-left: 0">学生用户，请使用注册时的手机号登录。</span>
          </div>

          <div class="xfkj-login__thirdparty thirdparty_tips">
            <div class="line" />
          </div>

          <div class="xfkj-login__download download_app_box">
            <div class="d_app_name clearfix">
              <a
                class="teacher"
                href="javascript:void(0)"
                @click.prevent="onForgot(1, '请微信扫描二维码进入教师端')"
                >教师手机登录</a
              >
              <a
                class="student"
                href="javascript:void(0)"
                @click.prevent="onForgot(2, '请微信扫描二维码进入家长端')"
                >家长手机登录</a
              >
            </div>
          </div>
        </form>
          </div>
        </div>

        <footer class="xfkj-login__footer xfkj-login__footer--banner">
          <p class="xfkj-login__footer-line">安徽小帆智能科技有限公司</p>
          <p class="xfkj-login__footer-line">
            <a target="_blank" rel="noopener noreferrer" href="https://beian.miit.gov.cn/"
              >皖ICP备2022012916号-2</a
            >
          </p>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../auth/store'

const { loginWithPassword } = useAuth()
const router = useRouter()
const route = useRoute()

/** 与 xfkj 官网静态资源一致，便于一比一对齐视觉效果 */
const assetLogo = 'https://www.xfkj.cc/images/v1/images/logo2.png'

const username = ref('THZDXX01')
const password = ref('666888')
const loading = ref(false)
const error = ref('')
const showQr = ref(false)

function onForgot(_type: number, message: string) {
  window.alert(message)
}

async function onSubmit() {
  if (showQr.value) {
    error.value = '请先切换到账号密码登录'
    return
  }
  if (!username.value.trim() || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await loginWithPassword(username.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    void router.replace(redirect || '/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
