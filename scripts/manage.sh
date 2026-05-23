#!/bin/bash
# Beehive Agent Management Script
# 一键管理蜂巢后端服务

set -e

# 配置
APP_DIR="/home/joyandjoe/beehive-agent"
API_SCRIPT="saas/api/main.py"
PORT=8000
HOST="127.0.0.1"
PID_FILE="/tmp/beehive-agent.pid"
LOG_FILE="/tmp/beehive-agent.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取进程PID
get_pid() {
    pgrep -f "python.*${API_SCRIPT}" 2>/dev/null | head -1 || echo ""
}

# 检查端口是否被占用
check_port() {
    if command -v ss &> /dev/null; then
        ss -tuln | grep -q ":${PORT} " && return 0
    elif command -v netstat &> /dev/null; then
        netstat -tuln | grep -q ":${PORT} " && return 0
    fi
    # 备用方法：直接测试连接
    timeout 1 bash -c "echo > /dev/tcp/${HOST}/${PORT}" 2>/dev/null && return 0
    return 1
}

# 获取进程运行时间
get_uptime() {
    local pid="$1"
    if [[ -n "$pid" ]] && [[ -d "/proc/$pid" ]]; then
        local start_time=$(stat -c %Y /proc/$pid 2>/dev/null || echo 0)
        local now=$(date +%s)
        local elapsed=$((now - start_time))
        if [[ $elapsed -ge 86400 ]]; then
            echo "$((elapsed / 86400))天 $(( (elapsed % 86400) / 3600 ))小时"
        elif [[ $elapsed -ge 3600 ]]; then
            echo "$((elapsed / 3600))小时 $(( (elapsed % 3600) / 60 ))分钟"
        elif [[ $elapsed -ge 60 ]]; then
            echo "$((elapsed / 60))分钟 $((elapsed % 60))秒"
        else
            echo "${elapsed}秒"
        fi
    else
        echo "N/A"
    fi
}

# 启动服务
do_start() {
    echo -e "${YELLOW}正在启动蜂巢后端服务...${NC}"
    
    # 检查端口是否已被占用
    if check_port; then
        echo -e "${RED}错误: 端口 ${PORT} 已被占用${NC}"
        echo -e "${YELLOW}请先停止现有服务或检查端口占用情况${NC}"
        ss -tuln | grep ":${PORT} " || netstat -tuln | grep ":${PORT} " || true
        return 1
    fi
    
    # 启动后端
    cd "${APP_DIR}"
    nohup env BEEHIVE_APP_DEBUG=true python "${API_SCRIPT}" > "${LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo $new_pid > "${PID_FILE}"
    
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 3
    
    # 检查服务是否启动成功
    if check_port; then
        local health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://${HOST}:${PORT}/health" 2>/dev/null || echo "000")
        if [[ "$health_status" == "200" ]]; then
            echo -e "${GREEN}✓ 蜂巢后端服务启动成功 (PID: $(get_pid))${NC}"
        else
            echo -e "${GREEN}✓ 蜂巢后端服务已启动 (PID: $(get_pid), 端口: ${PORT})${NC}"
        fi
    else
        echo -e "${RED}✗ 服务启动失败，请检查日志: ${LOG_FILE}${NC}"
        cat "${LOG_FILE}" | tail -20
        return 1
    fi
}

# 停止服务
do_stop() {
    echo -e "${YELLOW}正在停止蜂巢后端服务...${NC}"
    
    local pid=$(get_pid)
    if [[ -z "$pid" ]]; then
        echo -e "${GREEN}✓ 服务未运行${NC}"
        return 0
    fi
    
    # 优雅停止
    kill "$pid" 2>/dev/null || true
    
    # 等待进程结束
    local count=0
    while [[ -d "/proc/$pid" ]] && [[ $count -lt 10 ]]; do
        sleep 1
        ((count++))
    done
    
    # 强制kill如果还在运行
    if [[ -d "/proc/$pid" ]]; then
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
    
    # 确认端口已释放
    if check_port; then
        echo -e "${RED}✗ 警告: 端口仍未释放${NC}"
        return 1
    else
        rm -f "${PID_FILE}"
        echo -e "${GREEN}✓ 服务已停止${NC}"
    fi
}

# 查看状态
do_status() {
    local pid=$(get_pid)
    
    if [[ -n "$pid" ]] && check_port; then
        echo -e "${GREEN}● 蜂巢后端服务运行中${NC}"
        echo -e "  ${GREEN}PID:${NC}    $pid"
        echo -e "  ${GREEN}端口:${NC}   ${PORT}"
        echo -e "  ${GREEN}运行时间:${NC} $(get_uptime $pid)"
        
        # 健康检查
        local health=$(curl -s "http://${HOST}:${PORT}/health" 2>/dev/null)
        if [[ -n "$health" ]]; then
            echo -e "  ${GREEN}健康状态:${NC} $health"
        else
            echo -e "  ${YELLOW}健康状态:${NC} 无法获取"
        fi
    else
        echo -e "${RED}● 蜂巢后端服务已停止${NC}"
    fi
}

# 查看日志
do_logs() {
    local pid=$(get_pid)
    
    if [[ -n "$pid" ]]; then
        # 尝试从进程fd读取实时输出
        if [[ -L "/proc/$pid/fd/1" ]]; then
            tail -f "/proc/$pid/fd/1" 2>/dev/null || do_logs_fallback
        else
            do_logs_fallback
        fi
    else
        do_logs_fallback
    fi
}

do_logs_fallback() {
    if [[ -f "${LOG_FILE}" ]]; then
        tail -100 "${LOG_FILE}"
    else
        echo -e "${RED}日志文件不存在${NC}"
    fi
}

# 查看路由
do_routes() {
    echo -e "${YELLOW}正在获取API路由列表...${NC}"
    
    local response=$(curl -s "http://${HOST}:${PORT}/openapi.json" 2>/dev/null)
    
    if [[ -z "$response" ]] || [[ "$response" == "null" ]]; then
        echo -e "${RED}✗ 无法获取路由列表，服务可能未启动或OpenAPI不可用${NC}"
        return 1
    fi
    
    echo -e "${GREEN}=== API 路由列表 ===${NC}"
    echo "$response" | python3 -c "
import sys, json

try:
    data = json.load(sys.stdin)
    paths = data.get('paths', {})
    
    for path, methods in sorted(paths.items()):
        for method, details in methods.items():
            if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                summary = details.get('summary', '')
                print(f'  {method.upper():6} {path}')
                if summary:
                    print(f'           └─ {summary}')
except Exception as e:
    print(f'解析错误: {e}')
" 2>/dev/null || echo "$response"
}

# 重启
do_restart() {
    echo -e "${YELLOW}=== 重启服务 ===${NC}"
    do_stop
    sleep 2
    do_start
}

# 主入口
main() {
    local action="${1:-status}"
    
    case "$action" in
        start)
            do_start
            ;;
        stop)
            do_stop
            ;;
        restart)
            do_restart
            ;;
        status)
            do_status
            ;;
        logs)
            do_logs
            ;;
        routes)
            do_routes
            ;;
        help|--help|-h)
            echo "蜂巢管理脚本"
            echo ""
            echo "用法: $0 {start|stop|restart|status|logs|routes}"
            echo ""
            echo "  start    启动所有服务"
            echo "  stop     停止所有服务"
            echo "  restart  重启服务"
            echo "  status   查看服务状态"
            echo "  logs     查看实时日志"
            echo "  routes   查看API路由列表"
            ;;
        *)
            echo -e "${RED}未知命令: $action${NC}"
            echo "使用 '$0 help' 查看帮助"
            exit 1
            ;;
    esac
}

main "$@"
