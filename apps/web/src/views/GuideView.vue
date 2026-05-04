<template>
  <div class="org-page xfkj-subpage xfkj-guide">
    <div class="layui-card-header xfkj-yj-card-head">用户指南</div>

    <nav class="xfkj-guide__toc">
      <a href="#g-flow">阅卷流程</a>
      <a href="#g-org">基础档案</a>
      <a href="#g-score">成绩与发布</a>
      <a href="#g-file">文件与下载</a>
      <a href="https://www.xfkjedu.com/" target="_blank" rel="noopener noreferrer">小帆官网</a>
    </nav>

    <div id="g-flow" class="block-card xfkj-guide__section">
      <h3>阅卷流程（本校）</h3>
      <ol>
        <li>在「本校考试管理」创建考试，绑定参考班级与考试科目；在列表中可推进考试状态（进入阅卷、待发布、发布等）。</li>
        <li>发布阅卷任务后，教师在「阅卷任务」中领取并完成打分。</li>
        <li>成绩汇总后，在「成绩查询」中重算、发布成绩；师生即可在「成绩分析」查看统计。</li>
        <li>登录密码可在侧栏「管理员」→「修改密码」中自助修改，成功后需重新登录。</li>
      </ol>
    </div>

    <div id="g-org" class="block-card xfkj-guide__section">
      <h3>基础档案</h3>
      <p>
        年级、班级、科目、教师、学生等数据在「基础档案」「教师管理」「学生档案」维护；考试绑定班级前请先完成班级编排。
      </p>
    </div>

    <div id="g-score" class="block-card xfkj-guide__section">
      <h3>成绩与发布</h3>
      <p>
        「成绩查询」提供名单与单科明细；「成绩分析」提供班级对比与科目维度统计。发布前请确认阅卷已完成且总分已重算。
      </p>
    </div>

    <div id="g-file" class="block-card xfkj-guide__section">
      <h3>文件与下载</h3>
      <p>
        「答题卡模板管理」专注上传答题卡模板；「文件中心」支持多分类上传与签名下载；「下载中心」可按分类浏览本校文件。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.xfkj-guide__toc {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f5f9ff;
  border-radius: 8px;
  border: 1px solid #dbeafe;
}

.xfkj-guide__toc a {
  margin-right: 16px;
  color: #1274f8;
  text-decoration: none;
}

.xfkj-guide__toc a:hover {
  text-decoration: underline;
}

.xfkj-guide__section ol {
  margin: 8px 0 0;
  padding-left: 20px;
  line-height: 1.8;
  color: #555;
}

.xfkj-guide__section p {
  margin: 8px 0 0;
  line-height: 1.8;
  color: #555;
}
</style>
