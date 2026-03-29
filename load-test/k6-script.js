/**
 * ELO - Load Test Script (k6)
 *
 * Variáveis de ambiente configuráveis:
 *   BASE_URL   URL base da API         (padrão: http://localhost:8081)
 *   VUS        Virtual Users (usuários simultâneos)  (padrão: 10)
 *   DURATION   Duração do teste principal           (padrão: 30s)
 *   RAMP_UP    Tempo de rampa de subida/descida     (padrão: 10s)
 *   SCENARIO   Cenário a executar: all | read | write | stress | spike (padrão: all)
 *
 * Exemplos de uso:
 *   k6 run -e VUS=50 -e DURATION=60s k6-script.js
 *   k6 run -e VUS=200 -e DURATION=2m -e SCENARIO=stress k6-script.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Configurações via environment variables
// ---------------------------------------------------------------------------
const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:8081';
const VUS       = parseInt(__ENV.VUS       || '10');
const DURATION  = __ENV.DURATION  || '30s';
const RAMP_UP   = __ENV.RAMP_UP   || '10s';
const SCENARIO  = __ENV.SCENARIO  || 'all';

// ---------------------------------------------------------------------------
// Métricas customizadas
// ---------------------------------------------------------------------------
const errorRate        = new Rate('elo_errors');
const createUserTrend  = new Trend('elo_create_user_ms',  true);
const createLivroTrend = new Trend('elo_create_livro_ms', true);
const listTrend        = new Trend('elo_list_ms',         true);
const emprestimoTrend  = new Trend('elo_emprestimo_ms',   true);
const recomendacaoTrend= new Trend('elo_recomendacao_ms', true);
const opsCounter       = new Counter('elo_operations_total');

// ---------------------------------------------------------------------------
// Definição de cenários por SCENARIO
// ---------------------------------------------------------------------------
function buildStages() {
  if (SCENARIO === 'stress') {
    // Sobe progressivamente até 5x o VUS configurado
    return [
      { duration: RAMP_UP,   target: Math.ceil(VUS * 0.5) },
      { duration: DURATION,  target: VUS },
      { duration: RAMP_UP,   target: VUS * 2 },
      { duration: DURATION,  target: VUS * 2 },
      { duration: RAMP_UP,   target: VUS * 5 },
      { duration: DURATION,  target: VUS * 5 },
      { duration: RAMP_UP,   target: 0 },
    ];
  }

  if (SCENARIO === 'spike') {
    // Pico repentino de carga
    return [
      { duration: RAMP_UP,   target: VUS },
      { duration: '10s',     target: VUS * 10 },  // spike!
      { duration: '20s',     target: VUS * 10 },
      { duration: '10s',     target: VUS },        // volta ao normal
      { duration: DURATION,  target: VUS },
      { duration: RAMP_UP,   target: 0 },
    ];
  }

  // Padrão: rampa suave
  return [
    { duration: RAMP_UP,  target: VUS },
    { duration: DURATION, target: VUS },
    { duration: RAMP_UP,  target: 0 },
  ];
}

export const options = {
  stages: buildStages(),
  thresholds: {
    http_req_duration:  ['p(95)<3000', 'p(99)<5000'],   // 95% abaixo de 3s
    http_req_failed:    ['rate<0.15'],                   // menos de 15% de falhas
    elo_errors:         ['rate<0.10'],                   // menos de 10% de erros de negócio
    elo_list_ms:        ['p(95)<2000'],
    elo_create_user_ms: ['p(95)<3000'],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HEADERS = { 'Content-Type': 'application/json' };

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomEmail() {
  return `user_${Date.now()}_${randomInt(1000, 9999)}@loadtest.com`;
}

function randomPhone() {
  return `(${randomInt(11, 99)}) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

function checkResponse(res, name) {
  const ok = check(res, {
    [`${name}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  opsCounter.add(1);
  return ok;
}

// ---------------------------------------------------------------------------
// SETUP — roda uma vez antes do teste, cria dados base
// ---------------------------------------------------------------------------
export function setup() {
  console.log(`\n=== ELO Load Test ===`);
  console.log(`URL:      ${BASE_URL}`);
  console.log(`VUs:      ${VUS}`);
  console.log(`Duração:  ${DURATION}`);
  console.log(`Cenário:  ${SCENARIO}`);
  console.log(`========================\n`);

  // Cria categorias base
  const categorias = ['FANTASIA', 'ROMANCE', 'CIENCIA', 'HISTORIA', 'TECNOLOGIA', 'FICCAO'];
  const categoriaIds = [];

  for (const nome of categorias) {
    const res = http.post(`${BASE_URL}/api/categoria`, JSON.stringify({ nome }), { headers: HEADERS });
    if (res.status === 200 || res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        if (body.id) categoriaIds.push(body.id);
      } catch (_) {}
    }
  }

  // Garante ao menos uma categoria via GET caso todas já existam
  if (categoriaIds.length === 0) {
    const res = http.get(`${BASE_URL}/api/categoria`);
    if (res.status === 200) {
      try {
        const lista = JSON.parse(res.body);
        lista.forEach(c => categoriaIds.push(c.id));
      } catch (_) {}
    }
  }

  // Cria usuários base para empréstimos
  const usuarioIds = [];
  for (let i = 0; i < 5; i++) {
    const res = http.post(`${BASE_URL}/api/usuario`, JSON.stringify({
      nome:     `LoadTest User ${i}`,
      email:    `loadtest_base_${i}@test.com`,
      telefone: randomPhone(),
    }), { headers: HEADERS });

    if (res.status === 200 || res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        if (body.id) usuarioIds.push(body.id);
      } catch (_) {}
    }
  }

  // Garante ao menos um usuário via GET caso todos já existam
  if (usuarioIds.length === 0) {
    const res = http.get(`${BASE_URL}/api/usuario`);
    if (res.status === 200) {
      try {
        const lista = JSON.parse(res.body);
        lista.slice(0, 10).forEach(u => usuarioIds.push(u.id));
      } catch (_) {}
    }
  }

  // Cria livros base
  const livroIds = [];
  for (let i = 0; i < 10; i++) {
    const cat = randomItem(categoriaIds);
    if (!cat) continue;

    const res = http.post(`${BASE_URL}/api/livro`, JSON.stringify({
      titulo:         `Livro de Carga ${i} - ${Date.now()}`,
      autor:          `Autor Teste ${i}`,
      isbn:           `978000000${String(i).padStart(4, '0')}`,
      dataPublicacao: randomInt(1980, 2024),
      status:         'DISPONIVEL',
      categoria:      { id: cat },
    }), { headers: HEADERS });

    if (res.status === 200 || res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        if (body.id) livroIds.push(body.id);
      } catch (_) {}
    }
  }

  if (livroIds.length === 0) {
    const res = http.get(`${BASE_URL}/api/livro`);
    if (res.status === 200) {
      try {
        const lista = JSON.parse(res.body);
        lista.slice(0, 10).forEach(l => livroIds.push(l.id));
      } catch (_) {}
    }
  }

  console.log(`Setup concluído: ${categoriaIds.length} categorias, ${usuarioIds.length} usuários, ${livroIds.length} livros`);

  return { categoriaIds, usuarioIds, livroIds };
}

// ---------------------------------------------------------------------------
// Funções de cenário
// ---------------------------------------------------------------------------

function scenarioRead(data) {
  group('Leituras', () => {
    // Lista usuários
    let res = http.get(`${BASE_URL}/api/usuario`);
    listTrend.add(res.timings.duration);
    checkResponse(res, 'GET /usuario');
    sleep(0.1);

    // Lista livros
    res = http.get(`${BASE_URL}/api/livro`);
    listTrend.add(res.timings.duration);
    checkResponse(res, 'GET /livro');
    sleep(0.1);

    // Lista categorias
    res = http.get(`${BASE_URL}/api/categoria`);
    listTrend.add(res.timings.duration);
    checkResponse(res, 'GET /categoria');
    sleep(0.1);

    // Lista empréstimos
    res = http.get(`${BASE_URL}/api/emprestimo`);
    listTrend.add(res.timings.duration);
    checkResponse(res, 'GET /emprestimo');
    sleep(0.1);

    // Recomendações para usuário aleatório
    if (data.usuarioIds.length > 0) {
      const uid = randomItem(data.usuarioIds);
      res = http.get(`${BASE_URL}/api/recomendacao/${uid}`);
      recomendacaoTrend.add(res.timings.duration);
      checkResponse(res, 'GET /recomendacao');
      sleep(0.1);
    }

    // Livros disponíveis para usuário (usado pelo frontend no empréstimo)
    if (data.usuarioIds.length > 0) {
      const uid = randomItem(data.usuarioIds);
      res = http.get(`${BASE_URL}/api/livro/${uid}`);
      listTrend.add(res.timings.duration);
      checkResponse(res, 'GET /livro/{usuarioId}');
    }
  });
}

function scenarioWrite(data) {
  group('Escritas', () => {
    // Cria usuário
    const res = http.post(`${BASE_URL}/api/usuario`, JSON.stringify({
      nome:     `VU_${__VU}_iter_${__ITER}`,
      email:    randomEmail(),
      telefone: randomPhone(),
    }), { headers: HEADERS });

    createUserTrend.add(res.timings.duration);
    checkResponse(res, 'POST /usuario');

    // Cria livro (se houver categoria)
    if (data.categoriaIds.length > 0) {
      const catId = randomItem(data.categoriaIds);
      const livroRes = http.post(`${BASE_URL}/api/livro`, JSON.stringify({
        titulo:         `Livro VU${__VU} I${__ITER} T${Date.now()}`,
        autor:          `Autor VU ${__VU}`,
        isbn:           `97800${randomInt(10000000, 99999999)}`,
        dataPublicacao: randomInt(1990, 2025),
        status:         'DISPONIVEL',
        categoria:      { id: catId },
      }), { headers: HEADERS });

      createLivroTrend.add(livroRes.timings.duration);
      checkResponse(livroRes, 'POST /livro');
    }
  });
}

function scenarioEmprestimo(data) {
  group('Empréstimos', () => {
    if (data.usuarioIds.length === 0 || data.livroIds.length === 0) return;

    const usuarioId = randomItem(data.usuarioIds);

    // Busca livros disponíveis para o usuário
    const livrosRes = http.get(`${BASE_URL}/api/livro/${usuarioId}`);
    listTrend.add(livrosRes.timings.duration);

    let livroId = null;
    if (livrosRes.status === 200) {
      try {
        const livros = JSON.parse(livrosRes.body);
        const disponiveis = livros.filter(l => l.status === 'DISPONIVEL');
        if (disponiveis.length > 0) {
          livroId = randomItem(disponiveis).id;
        }
      } catch (_) {}
    }

    // Tenta criar empréstimo com livro disponível
    if (livroId) {
      const res = http.post(`${BASE_URL}/api/emprestimo`, JSON.stringify({
        livro:   livroId,
        usuario: usuarioId,
      }), { headers: HEADERS });

      emprestimoTrend.add(res.timings.duration);
      checkResponse(res, 'POST /emprestimo');
    }

    // Consulta empréstimos do usuário
    const empRes = http.get(`${BASE_URL}/api/emprestimo/usuario/${usuarioId}`);
    listTrend.add(empRes.timings.duration);
    checkResponse(empRes, 'GET /emprestimo/usuario/{id}');
  });
}

// ---------------------------------------------------------------------------
// Função principal — executada por cada VU em cada iteração
// ---------------------------------------------------------------------------
export default function (data) {
  const roll = Math.random();

  if (SCENARIO === 'read') {
    scenarioRead(data);
    sleep(randomInt(1, 3));
    return;
  }

  if (SCENARIO === 'write') {
    scenarioWrite(data);
    sleep(randomInt(1, 3));
    return;
  }

  // 'all', 'stress', 'spike' — mix de operações com pesos
  if (roll < 0.50) {
    // 50%: leituras (mais baratas)
    scenarioRead(data);
  } else if (roll < 0.80) {
    // 30%: escritas
    scenarioWrite(data);
  } else {
    // 20%: empréstimos (operação mais custosa — atualiza status do livro)
    scenarioEmprestimo(data);
  }

  sleep(randomInt(1, 2));
}

// ---------------------------------------------------------------------------
// TEARDOWN — roda uma vez após o teste
// ---------------------------------------------------------------------------
export function teardown(data) {
  console.log(`\nTeste finalizado. Dados de setup mantidos no banco para inspeção.`);
  console.log(`Categorias criadas: ${data.categoriaIds.length}`);
  console.log(`Usuários criados:   ${data.usuarioIds.length}`);
  console.log(`Livros criados:     ${data.livroIds.length}`);
}
