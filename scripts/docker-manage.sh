#!/bin/bash
# ============================================
# 智能阅卷系统 - Docker Compose 快捷启动脚本
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助
show_help() {
    echo "智能阅卷系统 Docker 管理脚本"
    echo ""
    echo "用法: $0 <命令> [选项]"
    echo ""
    echo "命令:"
    echo "  up [服务名]      启动服务 (默认全部)"
    echo "  down [服务名]    停止服务 (默认全部)"
    echo "  restart [服务名] 重启服务"
    echo "  logs [服务名]    查看日志"
    echo "  status           查看服务状态"
    echo "  shell <服务名>   进入容器shell"
    echo "  db-backup        备份数据库"
    echo "  db-restore       恢复数据库"
    echo "  clean            清理所有数据(危险!)"
    echo "  prune            清理未使用的镜像/卷"
    echo ""
    echo "服务名:"
    echo "  all      所有服务 (默认)"
    echo "  db       数据库和缓存 (postgres, redis)"
    echo "  api      后端API服务"
    echo "  web      前端Web服务"
    echo "  storage  存储服务 (minio)"
    echo "  monitor  监控服务 (prometheus, grafana)"
    echo ""
    echo "示例:"
    echo "  $0 up db          # 只启动数据库"
    echo "  $0 up all         # 启动所有服务"
    echo "  $0 logs api       # 查看API服务日志"
    echo "  $0 db-backup      # 备份数据库"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未运行，请先启动 Docker Desktop"
        exit 1
    fi
}

# 启动服务
start_services() {
    local service=$1
    print_info "启动服务: ${service}..."

    case $service in
        all)
            docker-compose -f docker/docker-compose.yml --profile '*' up -d
            ;;
        db)
            docker-compose -f docker/docker-compose.yml --profile 'db' up -d postgres redis
            ;;
        api)
            docker-compose -f docker/docker-compose.yml --profile 'api' up -d api
            ;;
        web)
            docker-compose -f docker/docker-compose.yml --profile 'web' up -d web
            ;;
        storage)
            docker-compose -f docker/docker-compose.yml --profile 'storage' up -d minio
            ;;
        monitor)
            docker-compose -f docker/docker-compose.yml --profile 'monitor' up -d prometheus grafana
            ;;
        *)
            print_error "未知服务: $service"
            show_help
            exit 1
            ;;
    esac

    print_success "服务启动完成!"
}

# 停止服务
stop_services() {
    local service=$1
    print_info "停止服务: ${service}..."

    case $service in
        all)
            docker-compose -f docker/docker-compose.yml down
            ;;
        *)
            docker-compose -f docker/docker-compose.yml stop $service
            ;;
    esac

    print_success "服务停止完成!"
}

# 重启服务
restart_services() {
    local service=$1
    print_info "重启服务: ${service}..."
    docker-compose -f docker/docker-compose.yml restart $service
    print_success "服务重启完成!"
}

# 查看日志
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose -f docker/docker-compose.yml logs -f
    else
        docker-compose -f docker/docker-compose.yml logs -f $service
    fi
}

# 查看状态
show_status() {
    docker-compose -f docker/docker-compose.yml ps
}

# 进入容器
enter_container() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "请指定服务名"
        exit 1
    fi
    docker-compose -f docker/docker-compose.yml exec $service sh
}

# 数据库备份
backup_database() {
    print_info "备份数据库..."
    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/smartbird_backup_$TIMESTAMP.sql.gz"

    docker-compose -f docker/docker-compose.yml exec -T postgres pg_dump -U smartbird smartbird_dev | gzip > $BACKUP_FILE
    print_success "数据库备份完成: $BACKUP_FILE"
}

# 恢复数据库
restore_database() {
    local backup_file=$1
    if [ -z "$backup_file" ]; then
        print_error "请指定备份文件路径"
        echo "用法: $0 db-restore <backup_file.sql.gz>"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        print_error "备份文件不存在: $backup_file"
        exit 1
    fi

    print_info "恢复数据库..."
    gunzip -c $backup_file | docker-compose -f docker/docker-compose.yml exec -T postgres psql -U smartbird smartbird_dev
    print_success "数据库恢复完成!"
}

# 清理所有数据（危险！）
clean_all() {
    print_warning "即将删除所有数据（数据库、文件、配置）！"
    read -p "确认继续? (输入 'YES' 确认): " confirm
    if [ "$confirm" != "YES" ]; then
        print_info "操作已取消"
        exit 0
    fi

    print_info "停止所有服务..."
    docker-compose -f docker/docker-compose.yml down

    print_info "删除数据卷..."
    docker volume rm smartbird_postgres_data smartbird_redis_data smartbird_minio_data 2>/dev/null || true

    print_info "删除备份文件..."
    rm -rf ./backups

    print_success "清理完成!"
}

# 清理未使用的镜像和卷
prune_docker() {
    print_info "清理 Docker 未使用资源..."
    docker system prune -f
    docker volume prune -f
    print_success "清理完成!"
}

# ============================================
# 主程序入口
# ============================================
main() {
    check_docker

    local command=$1
    local arg=$2

    case $command in
        up)
            start_services "${arg:-all}"
            ;;
        down)
            stop_services "${arg:-all}"
            ;;
        restart)
            restart_services $arg
            ;;
        logs)
            show_logs $arg
            ;;
        status)
            show_status
            ;;
        shell)
            enter_container $arg
            ;;
        db-backup)
            backup_database
            ;;
        db-restore)
            restore_database $arg
            ;;
        clean)
            clean_all
            ;;
        prune)
            prune_docker
            ;;
        help|-h|--help)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"
