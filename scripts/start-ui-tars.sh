#!/bin/bash
# UI-TARS视觉模型启动脚本
# 蜂巢项目 - 阿杰
# 
# 注意：此脚本需要网络连接以下载模型权重
# RTX 3050 Ti 4GB - 需要量化版本
#
# 使用方式:
#   bash start-ui-tars.sh          # 前台运行
#   nohup bash start-ui-tars.sh &  # 后台运行

set -e

# 配置
MODEL_NAME="ByteDance-Seed/UI-TARS-1.5-2B"
PORT=${UI_TARS_PORT:-8006}
API_PORT=8006
VENV_PATH="/home/joyandjoe/venv"
MAX_MODEL_LEN=${MAX_MODEL_LEN:-2048}
GPU_MEMORY_UTIL=${GPU_MEMORY_UTIL:-0.85}

# 可选：设置HF Mirror（如果需要）
# export HF_ENDPOINT=https://hf-mirror.com

# 检查vLLM
if [ ! -f "$VENV_PATH/bin/vllm" ]; then
    echo "ERROR: vLLM not found at $VENV_PATH"
    echo "Please install: python3 -m venv $VENV_PATH && $VENV_PATH/bin/pip install vllm"
    exit 1
fi

# 检查端口
if ss -tlnp | grep -q ":$PORT "; then
    echo "WARNING: Port $PORT is already in use"
fi

# 启动vLLM服务
echo "Starting UI-TARS model service..."
echo "Model: $MODEL_NAME"
echo "Port: $PORT"
echo "Max Model Length: $MAX_MODEL_LEN"
echo "GPU Memory Utilization: $GPU_MEMORY_UTIL"

$VENV_PATH/bin/vllm serve "$MODEL_NAME" \
    --port $PORT \
    --max-model-len $MAX_MODEL_LEN \
    --gpu-memory-utilization $GPU_MEMORY_UTIL \
    --host 0.0.0.0 \
    --trust-remote-code

echo "UI-TARS API started at http://localhost:$PORT/v1/chat/completions"
