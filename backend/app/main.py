from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth, parcels, imagery, modules, mrv, sync, copilot, telemetry, tiles, admin, forest_reserves
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Geospatial Land, Ecosystem, Water & Irrigation Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(parcels.router, prefix=settings.API_V1_STR)
app.include_router(imagery.router, prefix=settings.API_V1_STR)
app.include_router(modules.router, prefix=settings.API_V1_STR)
app.include_router(mrv.router, prefix=settings.API_V1_STR)
app.include_router(sync.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(telemetry.router, prefix=settings.API_V1_STR)
app.include_router(tiles.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(forest_reserves.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    from app.seed.seed_data import seed_database
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seeder warning: {e}")

@app.get("/health")
@app.get("/api/health")
def healthcheck():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": "production"
    }
