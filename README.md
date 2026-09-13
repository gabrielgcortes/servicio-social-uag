# Mapa Curricular

Sistema web para crear, visualizar, editar y administrar los mapas curriculares
de las carreras universitarias, con exportación a Excel. Monolito modular:
**FastAPI** (backend) + **SPA React (JavaScript)** (frontend) + **PostgreSQL**.

Ver el plan técnico completo en la conversación de diseño; el backlog de tareas
(TASK-001 .. TASK-051) se implementa de forma incremental.

## ⚠️ Estado del entorno de desarrollo de este repo

Este código fue escrito **sin ejecutar ningún comando** (no hay Node.js ni
Docker instalados en el entorno donde se generó). Eso significa:

- No existen `node_modules/`, ni se corrió `npm install`.
- No se corrió `alembic upgrade head` ni ninguna migración.
- No se corrió `docker compose up`, ni se construyó ninguna imagen.
- Todas las dependencias están **fijadas con versión exacta** en
  `backend/requirements.txt` y `frontend/package.json`, pero no fueron
  instaladas ni verificadas contra un entorno real.

**Tú (el usuario) eres quien debe ejecutar y probar.** Los pasos abajo indican
exactamente qué correr.

## Estructura

```
mapa-curricular/ (raíz de este workspace)
├── backend/        # FastAPI, SQLAlchemy, Alembic
├── frontend/        # React + JavaScript (Vite)
├── templates/        # Plantillas Excel institucionales
├── docker/        # Scripts de inicialización de infraestructura
├── scripts/        # Scripts auxiliares (seed, inspección de Excel, etc.)
├── docker-compose.yml
├── .env.example
└── README.md
```

## Cómo levantar el entorno (a correr por ti)

1. Copia el archivo de variables de entorno:
   ```
   copy .env.example .env
   ```
   Ajusta `SECRET_KEY`, `POSTGRES_PASSWORD` y `SEED_ADMIN_PASSWORD`.

2. Levanta todo con Docker Compose:
   ```
   docker compose up --build
   ```
   Esto construye las imágenes de `backend` y `frontend`, levanta `db`
   (Postgres 16) y aplica las migraciones de Alembic automáticamente al
   iniciar el contenedor del backend (ver `backend/entrypoint.sh`).

3. Backend disponible en `http://localhost:8000` (docs interactivas en
   `http://localhost:8000/docs`). Frontend en `http://localhost:5173`.

4. (Opcional) Cargar datos de ejemplo — carrera, semestres, materias y un
   usuario admin — dentro del contenedor del backend:
   ```
   docker compose exec backend python -m scripts.seed
   ```

### Desarrollo sin Docker (alternativa)

Backend:
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:
```
cd frontend
npm install
npm run dev
```

### Tests (a correr por ti, no se ejecutaron durante la implementación)

Los tests de integración y de API requieren una base PostgreSQL de pruebas
(las migraciones deben estar aplicadas ahí también):

```
createdb mapa_curricular_test   -- o crea la BD por el medio que prefieras
cd backend
set TEST_DATABASE_URL=postgresql+psycopg://mapa_user:change_me@localhost:5432/mapa_curricular_test
alembic upgrade head
pytest
```

Frontend:
```
cd frontend
npm test
```

## Producción

`docker-compose.prod.yml` levanta una variante sin bind mounts, sin
`--reload`, sin exponer PostgreSQL fuera de la red interna, y con el
frontend servido por nginx (build estático) en vez del servidor de
desarrollo de Vite:

```
docker compose -f docker-compose.prod.yml up --build -d
```

Antes de usarlo en un entorno real:
- Genera un `SECRET_KEY` largo y aleatorio, y credenciales de Postgres fuertes.
- Sirve la aplicación detrás de HTTPS (terminación TLS en un reverse proxy).
- Considera mover el rate limiting de `/auth/login` al reverse proxy si vas
  a correr más de un worker/réplica del backend.

## Notas de seguridad implementadas

- Autenticación local con Argon2id; JWT de acceso corto (30 min) + refresh
  token opaco en cookie `httpOnly`/`Secure`/`SameSite=Lax` con rotación.
- Autorización por recurso resuelta siempre en el backend (`auth/policies.py`),
  nunca solo ocultando botones en el frontend.
- Rate limiting básico en memoria para `/auth/login` (ver nota de producción).
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- CORS restringido a los orígenes configurados en `CORS_ORIGINS`.

## Roles

- **USUARIO**: consulta de lectura de su propia carrera.
- **DIRECTOR**: administra el mapa curricular y el catálogo de optativas de su carrera.
- **ADMIN**: administra todas las carreras y usuarios.

<!-- write-access verification -->
