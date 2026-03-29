# 📚 Elo-Project - Sistema de Gerenciamento de Biblioteca

Sistema completo de gerenciamento de biblioteca composto por **Frontend Angular**, **Backend Spring Boot** e *
*PostgreSQL**, orquestrados via **Docker Compose**.

## Introdução

Esse projeto foi iniciado pelo desafio técnico da empresa Elotech, porém durante o desenvolvimento ele foi utilizado
para meu aprendizado próprio, utilizando técnologias de DevOps, desenvolvimento back-end e desenvolvimento front-end.

Considerações:
 - Tem algumas coisas no projeto que o requisito não específicava inteiramente, então foi improvisado.
 - O sistema foi pensado numa visão de administrador gerenciando uma biblioteca, então não tem login / autenticação

---
## 📋 Índice

- [Arquitetura](#-arquitetura)
- [Pré-requisitos](#-pré-requisitos)
- [Quick Start](#-quick-start)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Portas e URLs](#-portas-e-urls)
- [Comandos Úteis](#-comandos-úteis)

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    elo-front (Angular 21)                   │
│                       http://localhost:8080                 │
├─────────────────────────────────────────────────────────────┤
│                    elo-back (Spring Boot 3. 5)              │
│                       http://localhost:8081                 │
├─────────────────────────────────────────────────────────────┤
│                      PostgreSQL 17. 7                       │
│                       localhost:5432                        │
└─────────────────────────────────────────────────────────────┘
```

### Stack Tecnológica

| Camada            | Tecnologia     | Versão    |
|-------------------|----------------|-----------|
| Frontend          | Angular        | 21.x      |
| UI Components     | PrimeNG        | 21.0.2    |
| Estilização       | TailwindCSS    | 4.x       |
| Backend           | Spring Boot    | 3.5.9     |
| Linguagem Backend | Java           | 21 (LTS)  |
| Banco de Dados    | PostgreSQL     | 17.7      |
| Migrações         | Flyway         | Integrado |
| Containerização   | Docker Compose | 3.x       |

---

## 📦 Pré-requisitos

```bash
# Verificar instalações
docker --version         # Docker 20+
docker-compose --version # Docker Compose 2+
```

---

## 🚀 Quick Start

```bash
# 1. Clone o repositório
git clone https://github.com/Parisiiii/elo-project.git
cd elo-project

# 2. Configure as variáveis de ambiente
cp .env. example .env  # ou edite o . env existente

# 3. Clone os submodulos do projto
git clone https://github.com/Parisiiii/elo-back.git
git clone https://github.com/Parisiiii/elo-front.git

# 4. Suba todos os serviços
docker-compose up --build
```

Acesse: **http://localhost:8080**

---

## 🔧 Variáveis de Ambiente

O arquivo `.env` contém as configurações dos serviços:

```env
# Database
POSTGRES_DB=elodb
POSTGRES_USER=elouser
POSTGRES_PASSWORD=elopassword

# API Keys
GOOGLE_BOOKS_API_KEY=suaChaveAPI
```

### Configurando a API do Google Books

1. Acesse o [Google Cloud Console](https://console.cloud.google. com/)
2. Crie ou selecione um projeto
3. Ative a **Books API**
4. Crie uma **API Key**
5. Adicione no `.env`:

```env
GOOGLE_BOOKS_API_KEY=suaChaveAPI
```

---

## 🌐 Portas e URLs

| Serviço     | URL                   | Porta |
|-------------|-----------------------|-------|
| Frontend    | http://localhost:8080 | 8080  |
| Backend API | http://localhost:8081 | 8081  |
| PostgreSQL  | localhost             | 5432  |

---

## 🛠️ Comandos Úteis

### Acessar o banco de dados

```bash
# Via docker exec
docker exec -it elo-postgres psql -U elouser -d elodb

# Comandos SQL úteis
\dt          # Listar tabelas
\d usuario   # Descrever tabela usuario
SELECT * FROM usuario;
```

### Acessar logs do container

```bash
# Logs do backend
docker logs elo-back -f

# Logs do frontend
docker logs elo-front -f

# Logs do banco
docker logs elo-postgres -f
```

### Rebuild forçado

```bash
# Limpar cache e reconstruir
docker-compose build --no-cache
docker-compose up
```

### Limpar tudo

```bash
# Parar e remover containers, networks, volumes
docker-compose down -v --rmi all

# Remover volumes órfãos
docker volume prune
```

---

## 📂 Estrutura do Projeto

```
elo-project/
├── elo-back/              # Backend Spring Boot
│   ├── src/
│   ├── Dockerfile
│   └── pom.xml
├── elo-front/             # Frontend Angular
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml     # Orquestração
├── .env                   # Variáveis de ambiente
└── README.md
```

---

## 📄 Licença

Este projeto foi desenvolvido para fins de estudo e avaliação técnica. 
