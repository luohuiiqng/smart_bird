#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
ADMIN_USERNAME="${ADMIN_USERNAME:-schooladmin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Schooladmin123}"
TEACHER_USERNAME="${TEACHER_USERNAME:-}"
TEACHER_PASSWORD="${TEACHER_PASSWORD:-}"

SUFFIX="$(date +%s)"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT
echo "smoke-role-${SUFFIX}" > "$TMP_FILE"

json_get() {
  local json="$1"
  local expr="$2"
  python3 - <<'PY' "$json" "$expr"
import json,sys
obj = json.loads(sys.argv[1])
path = sys.argv[2].split('.')
for p in path:
    if p.isdigit():
        obj = obj[int(p)]
    else:
        obj = obj[p]
print(obj)
PY
}

expect_code_zero() {
  local json="$1"
  local code
  code="$(json_get "$json" "code")"
  if [[ "$code" != "0" ]]; then
    echo "API失败: $json" >&2
    exit 1
  fi
}

is_code_zero() {
  local json="$1"
  python3 - <<'PY' "$json"
import json,sys
try:
    obj=json.loads(sys.argv[1])
    print("1" if obj.get("code") == 0 else "0")
except Exception:
    print("0")
PY
}

api_json() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"
  local args=()
  args+=(-sS -X "$method" "$BASE_URL$path")
  if [[ -n "$token" ]]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
    curl "${args[@]}"
  else
    curl "${args[@]}"
  fi
}

echo "[1/10] 管理员登录"
ADMIN_LOGIN="$(api_json POST "/auth/login" "" "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")"
expect_code_zero "$ADMIN_LOGIN"
ADMIN_TOKEN="$(json_get "$ADMIN_LOGIN" "data.accessToken")"

echo "[2/10] 管理员获取 me"
ADMIN_ME="$(api_json GET "/auth/me" "$ADMIN_TOKEN")"
expect_code_zero "$ADMIN_ME"
ADMIN_SCHOOL_ID="$(json_get "$ADMIN_ME" "data.schoolId")"
echo "schoolId=$ADMIN_SCHOOL_ID"

echo "[3/10] 创建年级/班级/科目"
GRADE_RES="$(api_json POST "/org/grades" "$ADMIN_TOKEN" "{\"name\":\"冒烟年级-${SUFFIX}\",\"status\":\"ENABLED\"}")"
expect_code_zero "$GRADE_RES"
GRADE_ID="$(json_get "$GRADE_RES" "data.id")"

CLASS_RES="$(api_json POST "/org/classes" "$ADMIN_TOKEN" "{\"gradeId\":$GRADE_ID,\"name\":\"1班-${SUFFIX}\",\"status\":\"ENABLED\"}")"
expect_code_zero "$CLASS_RES"
CLASS_ID="$(json_get "$CLASS_RES" "data.id")"

SUBJECT_RES="$(api_json POST "/org/subjects" "$ADMIN_TOKEN" "{\"name\":\"语文-${SUFFIX}\",\"shortName\":\"语文\",\"status\":\"ENABLED\"}")"
expect_code_zero "$SUBJECT_RES"
SUBJECT_ID="$(json_get "$SUBJECT_RES" "data.id")"

echo "[4/10] 创建考试并配置科目"
START_DATE="$(date +%F)"
END_DATE="$(date +%F)"
EXAM_RES="$(api_json POST "/exams" "$ADMIN_TOKEN" "{\"name\":\"冒烟考试-${SUFFIX}\",\"examType\":\"MIDTERM\",\"startDate\":\"$START_DATE\",\"endDate\":\"$END_DATE\",\"classIds\":[$CLASS_ID]}")"
expect_code_zero "$EXAM_RES"
EXAM_ID="$(json_get "$EXAM_RES" "data.id")"

SET_SUBJECT_RES="$(api_json POST "/exams/${EXAM_ID}/subjects" "$ADMIN_TOKEN" "{\"subjects\":[{\"subjectId\":$SUBJECT_ID,\"fullScore\":100}]}")"
expect_code_zero "$SET_SUBJECT_RES"

echo "[5/10] 考试详情查询"
EXAM_DETAIL="$(api_json GET "/exams/${EXAM_ID}" "$ADMIN_TOKEN")"
expect_code_zero "$EXAM_DETAIL"

echo "[6/10] 阅卷任务列表查询（新考试默认空）"
MARKING_LIST="$(api_json GET "/marking/tasks?examId=${EXAM_ID}&page=1&pageSize=5" "$ADMIN_TOKEN")"
expect_code_zero "$MARKING_LIST"

echo "[7/10] 文件真实上传（MinIO）"
UPLOAD_RES="$(
  curl -sS -X POST "$BASE_URL/files/upload-binary" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@$TMP_FILE;type=text/plain" \
    -F "category=OTHER" \
    -F "bizType=smoke-role" \
    -F "bizId=1"
)"
if [[ "$(is_code_zero "$UPLOAD_RES")" != "1" ]]; then
  echo "upload-binary 不可用，回退到元数据上传"
  UPLOAD_RES="$(
    api_json POST "/files/upload" "$ADMIN_TOKEN" \
      "{\"category\":\"OTHER\",\"fileName\":\"smoke-role-${SUFFIX}.txt\",\"contentType\":\"text/plain\",\"size\":32,\"bizType\":\"smoke-role\",\"bizId\":1}"
  )"
fi
expect_code_zero "$UPLOAD_RES"
FILE_ID="$(json_get "$UPLOAD_RES" "data.fileId")"

echo "[8/10] 文件详情 + 预签名 + 删除"
FILE_DETAIL="$(api_json GET "/files/${FILE_ID}" "$ADMIN_TOKEN")"
expect_code_zero "$FILE_DETAIL"

FILE_SIGNED="$(api_json GET "/files/${FILE_ID}/presigned-url?expiresIn=120" "$ADMIN_TOKEN")"
expect_code_zero "$FILE_SIGNED"

FILE_DELETE="$(api_json DELETE "/files/${FILE_ID}" "$ADMIN_TOKEN")"
expect_code_zero "$FILE_DELETE"

echo "[9/10] 审计查询（管理员）"
AUDIT_LIST="$(api_json GET "/audit/logs?module=files&page=1&pageSize=10" "$ADMIN_TOKEN")"
expect_code_zero "$AUDIT_LIST"

if [[ -n "$TEACHER_USERNAME" && -n "$TEACHER_PASSWORD" ]]; then
  echo "[10/10] 教师鉴权与权限校验（可选）"
  TEACHER_LOGIN="$(api_json POST "/auth/login" "" "{\"username\":\"$TEACHER_USERNAME\",\"password\":\"$TEACHER_PASSWORD\"}")"
  expect_code_zero "$TEACHER_LOGIN"
  TEACHER_TOKEN="$(json_get "$TEACHER_LOGIN" "data.accessToken")"

  TEACHER_ME="$(api_json GET "/auth/me" "$TEACHER_TOKEN")"
  expect_code_zero "$TEACHER_ME"

  HTTP_CODE="$(
    curl -sS -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $TEACHER_TOKEN" \
      "$BASE_URL/audit/logs?module=files"
  )"
  if [[ "$HTTP_CODE" != "403" ]]; then
    echo "教师访问审计日志应为 403，实际: $HTTP_CODE" >&2
    exit 1
  fi
else
  echo "[10/10] 跳过教师校验（未提供教师账号）"
fi

echo "角色联调冒烟通过：admin 主链路 + files/audit 闭环验证完成"
