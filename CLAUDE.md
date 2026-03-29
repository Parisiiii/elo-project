# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ELO** is a Library Management System (Sistema de Gerenciamento de Biblioteca) with no authentication — designed for admin use. It is a monorepo containing two Git submodules:
- `elo-back/` — Spring Boot REST API
- `elo-front/` — Angular SPA

After cloning, initialize submodules with:
```bash
git submodule update --init --recursive
```

## Running the Project

**Full stack via Docker (recommended):**
```bash
docker-compose up --build
```
- Frontend: http://localhost:8080
- Backend API: http://localhost:8081/api
- PostgreSQL: localhost:5432

**Local backend development:**
```bash
cd elo-back
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```
Requires a local PostgreSQL instance (see `elo-back/src/main/resources/application-local.yml`).

**Local frontend development:**
```bash
cd elo-front
npm install
npm start   # Angular dev server on http://localhost:4200
```

## Environment Variables

Copy `.env` and fill in values. Required variables:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `GOOGLE_BOOKS_API_KEY`

## Tests

**Backend:**
```bash
cd elo-back
./mvnw test                             # All tests
./mvnw test -Dtest=ClassName            # Single test class
./mvnw test -Dtest=ClassName#methodName # Single test method
```

**Frontend:**
```bash
cd elo-front
npm test   # Uses Vitest
```

## Architecture

### Backend (Java 21 + Spring Boot 3.5.9)

**Package structure:** `com.parisi.desafiotecnico`
- `controller/` — REST controllers (all routes under `/api/`)
- `model/` — JPA entities per domain module: `usuario`, `livro`, `categoria`, `emprestimo`, `recomendacao`, `google_books`
- `dto/` — Request/response DTOs
- `service/` — Business logic services
- `repository/` — Spring Data JPA repositories
- `client/` — External HTTP clients (`GoogleBooksClient` using Spring's `RestClient`)
- `config/` — CORS and Google Books configuration

All entities extend `Entidade` base class (UUID primary keys).

Database migrations are managed by Flyway at `src/main/resources/db/migration/`. The app uses `ddl-auto: validate` — schema must match migrations exactly.

### Frontend (Angular 21 + TypeScript 5.9)

**Key pattern:** All CRUD services extend `SuperService<T extends Entidade>` (generic base at `src/app/core/services/super-service.ts`), which provides standard HTTP CRUD methods.

- `src/app/components/` — Feature components: `usuario`, `livro`, `categoria`, `emprestimo`, `recomendacoes`, `google-books`
- `src/app/core/services/` — Feature services (7 total)
- `src/app/core/models/` — TypeScript interfaces/types

**UI stack:** PrimeNG 21 + TailwindCSS 4 + tailwindcss-primeui

In Docker, Nginx serves the Angular build and proxies `/api` to the backend service (`http://api:8081`). CORS allows `localhost:4200` (dev) and `localhost:8080` (production).

### Recommendation Algorithm

Content-based filtering: `GET /api/recomendacao/{usuarioId}` returns book recommendations based on categories of books the user has previously borrowed.

## Key API Endpoints

| Domain | Endpoints |
|--------|-----------|
| Usuario | `GET /api/usuario`, `POST /api/usuario`, `DELETE /api/usuario/{id}` |
| Livro | `GET /api/livro`, `GET /api/livro/{usuarioId}`, `POST /api/livro`, `DELETE /api/livro/{id}` |
| Categoria | `GET /api/categoria`, `POST /api/categoria`, `DELETE /api/categoria/{id}` |
| Emprestimo | `GET /api/emprestimo`, `GET /api/emprestimo/livro/{id}`, `GET /api/emprestimo/usuario/{id}`, `POST /api/emprestimo`, `PUT /api/emprestimo` |
| Recomendacao | `GET /api/recomendacao/{usuarioId}` |
| Google Books | `GET /api/google-books/pesquisar/{titulo}`, `POST /api/google-books/importar-livros` |
