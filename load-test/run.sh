#!/usr/bin/env bash
# =============================================================================
# ELO - Load Test Runner
# =============================================================================
# Uso:
#   ./run.sh [VUs] [duração] [cenário] [base_url]
#
# Parâmetros (todos opcionais, na ordem):
#   VUs       Usuários simultâneos             (padrão: 10)
#   duração   Duração do teste principal       (padrão: 30s)
#   cenário   all | read | write | stress | spike  (padrão: all)
#   base_url  URL da API                       (padrão: http://localhost:8081)
#
# Exemplos:
#   ./run.sh                          # 10 VUs, 30s, all
#   ./run.sh 50                       # 50 VUs, 30s, all
#   ./run.sh 50 60s                   # 50 VUs, 60s, all
#   ./run.sh 100 2m stress            # stress test com 100 VUs base
#   ./run.sh 200 1m spike             # spike test com 200 VUs base
#   ./run.sh 20 30s read              # só leituras
#   ./run.sh 20 30s write             # só escritas
# =============================================================================

set -euo pipefail

VUS="${1:-10}"
DURATION="${2:-30s}"
SCENARIO="${3:-all}"
BASE_URL="${4:-http://localhost:8081}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_SCRIPT="${SCRIPT_DIR}/k6-script.js"

# Verifica se o Docker está disponível
if ! command -v docker &>/dev/null; then
  echo "Erro: Docker não encontrado. Instale o Docker e tente novamente."
  exit 1
fi

# Verifica se a API está respondendo
echo "Verificando conectividade com a API em ${BASE_URL}..."
if ! curl -sf "${BASE_URL}/api/categoria" > /dev/null 2>&1; then
  echo ""
  echo "ATENÇÃO: A API não respondeu em ${BASE_URL}/api/categoria"
  echo "Certifique-se que o stack está rodando:"
  echo "  docker compose up --build"
  echo ""
  read -rp "Deseja continuar mesmo assim? [s/N] " resposta
  [[ "${resposta,,}" == "s" ]] || exit 1
fi

echo ""
echo "============================================"
echo "  ELO Load Test"
echo "============================================"
echo "  VUs:      ${VUS}"
echo "  Duração:  ${DURATION}"
echo "  Cenário:  ${SCENARIO}"
echo "  API:      ${BASE_URL}"
echo "============================================"
echo ""

# Determina a rede Docker onde a API está, para o k6 poder alcançá-la
# (necessário quando BASE_URL aponta para localhost)
DOCKER_NET=""
DOCKER_HOST_ARG=""

# Se estiver usando localhost, usa host network do Docker
if [[ "${BASE_URL}" == *"localhost"* || "${BASE_URL}" == *"127.0.0.1"* ]]; then
  DOCKER_HOST_ARG="--network=host"
fi

# Executa k6 via Docker
docker run --rm -i \
  ${DOCKER_HOST_ARG} \
  -v "${SCRIPT_DIR}:/scripts" \
  -e "BASE_URL=${BASE_URL}" \
  -e "VUS=${VUS}" \
  -e "DURATION=${DURATION}" \
  -e "SCENARIO=${SCENARIO}" \
  grafana/k6:latest \
  run /scripts/k6-script.js

echo ""
echo "Teste finalizado!"
echo ""
echo "Dica: monitore o container da API em tempo real com:"
echo "  docker stats elo-back"
