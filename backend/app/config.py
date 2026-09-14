import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "KijaniAI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "kijani-secret-key-production-change-in-env-928472918"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Spatial Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://kijani:KijaniPgSecure2026@localhost:5442/kijani_db")

    # Redis / Celery Broker
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://:KijaniRedisSecure2026@localhost:6783/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://:KijaniRedisSecure2026@localhost:6783/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://:KijaniRedisSecure2026@localhost:6783/0")

    # S3 / MinIO Object Storage
    STORAGE_ENDPOINT: str = os.getenv("STORAGE_ENDPOINT", "http://localhost:9012")
    STORAGE_ACCESS_KEY: str = os.getenv("STORAGE_ACCESS_KEY", "kijanistorageadmin")
    STORAGE_SECRET_KEY: str = os.getenv("STORAGE_SECRET_KEY", "KijaniMinioSecure2026")
    STORAGE_BUCKET_RAW: str = "satellite-raw"
    STORAGE_BUCKET_COGS: str = "satellite-cogs"
    STORAGE_BUCKET_MRV: str = "mrv-certificates"
    STORAGE_BUCKET_REPLAYS: str = "telemetry-replays"
    STORAGE_BUCKET_WATER: str = "water-rasters"
    STORAGE_BUCKET_IRRIGATION: str = "irrigation-maps"
    STORAGE_BUCKET_PHOTOS: str = "field-photos"
    LOCAL_STORAGE_DIR: str = os.getenv("LOCAL_STORAGE_DIR", "/tmp/kijani_storage")
    
    # Local LLM (Ollama Gemma 4)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11444")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma2:2b")
    
    # SMTP / Email Notifications (Gmail Relay via suanet.ac.tz)
    SMTP_PROTOCOL: str = os.getenv("SMTP_PROTOCOL", "smtp")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp-relay.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "noreply@suanet.ac.tz")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_CRYPTO: str = os.getenv("SMTP_CRYPTO", "tls")           # tls | ssl | none
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@suanet.ac.tz")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "KijaniAI Platform")
    SMTP_MAILTYPE: str = os.getenv("SMTP_MAILTYPE", "html")
    SMTP_CHARSET: str = os.getenv("SMTP_CHARSET", "utf8")
    EMAILS_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@suanet.ac.tz")  # legacy compat alias

    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Verification Base URL
    PUBLIC_VERIFY_URL: str = os.getenv("PUBLIC_VERIFY_URL", "https://kijani.ai/verify")

    # Satellite Provider APIs (Tiers 1 - 4)
    # Tier 1: Public / Free (Google Earth Engine, Planetary Computer & CDSE)
    FREE_TIER_PROVIDER: str = os.getenv("FREE_TIER_PROVIDER", "GEE") # GEE, PLANETARY_COMPUTER, CDSE
    GEE_PROJECT_ID: str = os.getenv("GEE_PROJECT_ID", "")
    GEE_SERVICE_ACCOUNT: str = os.getenv("GEE_SERVICE_ACCOUNT", "")
    GEE_PRIVATE_KEY_JSON: str = os.getenv("GEE_PRIVATE_KEY_JSON", "")
    CHIRPS_DATASET_ID: str = os.getenv("CHIRPS_DATASET_ID", "UCSB-CHG/CHIRPS/DAILY")
    OPENWEATHERMAP_API_KEY: str = os.getenv("OPENWEATHERMAP_API_KEY", "")
    OPENWEATHERMAP_BASE_URL: str = os.getenv("OPENWEATHERMAP_BASE_URL", "https://api.openweathermap.org/data/2.5")
    OPENWEATHERMAP_GEOCODING_URL: str = os.getenv("OPENWEATHERMAP_GEOCODING_URL", "https://api.openweathermap.org/geo/1.0")
    OPENWEATHERMAP_UNITS: str = os.getenv("OPENWEATHERMAP_UNITS", "metric")
    TANZANIA_SHAPEFILES_DIR: str = os.getenv("TANZANIA_SHAPEFILES_DIR", "data/shapefiles/tanzania_2022_wards")

    PLANETARY_COMPUTER_STAC_URL: str = os.getenv("PLANETARY_COMPUTER_STAC_URL", "https://planetarycomputer.microsoft.com/api/stac/v1")
    PLANETARY_COMPUTER_SAS_URL: str = os.getenv("PLANETARY_COMPUTER_SAS_URL", "https://planetarycomputer.microsoft.com/api/sas/v1/token")
    PLANETARY_COMPUTER_API_KEY: str = os.getenv("PLANETARY_COMPUTER_API_KEY", "")
    CDSE_STAC_URL: str = os.getenv("CDSE_STAC_URL", "https://catalogue.dataspace.copernicus.eu/stac")
    CDSE_TOKEN_URL: str = os.getenv("CDSE_TOKEN_URL", "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token")
    CDSE_ODATA_URL: str = os.getenv("CDSE_ODATA_URL", "https://catalogue.dataspace.copernicus.eu/odata/v1/Products")
    CDSE_CLIENT_ID: str = os.getenv("CDSE_CLIENT_ID", "")
    CDSE_CLIENT_SECRET: str = os.getenv("CDSE_CLIENT_SECRET", "")

    # Tier 2: PlanetScope (3m - 5m)
    PLANET_DATA_API_URL: str = os.getenv("PLANET_DATA_API_URL", "https://api.planet.com/data/v1")
    PLANET_ORDERS_API_URL: str = os.getenv("PLANET_ORDERS_API_URL", "https://api.planet.com/compute/ops/orders/v2")
    PLANET_API_KEY: str = os.getenv("PLANET_API_KEY", "")

    # Tier 3: Very High Resolution (50cm UP42 / Airbus)
    UP42_API_URL: str = os.getenv("UP42_API_URL", "https://api.up42.com/v2")
    UP42_OAUTH_URL: str = os.getenv("UP42_OAUTH_URL", "https://api.up42.com/oauth/token")
    UP42_PROJECT_ID: str = os.getenv("UP42_PROJECT_ID", "")
    UP42_API_KEY: str = os.getenv("UP42_API_KEY", "")
    AIRBUS_ONEATLAS_API_URL: str = os.getenv("AIRBUS_ONEATLAS_API_URL", "https://api.oneatlas.airbus.com/api/v1")
    AIRBUS_ONEATLAS_TOKEN_URL: str = os.getenv("AIRBUS_ONEATLAS_TOKEN_URL", "https://api.oneatlas.airbus.com/api/v1/token")
    AIRBUS_API_KEY: str = os.getenv("AIRBUS_API_KEY", "")

    # Tier 4: Ultra VHR (30cm Maxar / Pléiades Neo)
    MAXAR_DISCOVERY_API_URL: str = os.getenv("MAXAR_DISCOVERY_API_URL", "https://api.maxar.com/discovery/v1")
    MAXAR_TOKEN_URL: str = os.getenv("MAXAR_TOKEN_URL", "https://api.maxar.com/token")
    MAXAR_API_KEY: str = os.getenv("MAXAR_API_KEY", "")
    PLEIADES_NEO_API_URL: str = os.getenv("PLEIADES_NEO_API_URL", "https://api.up42.com/v2/catalog/hosts/oneatlas")
    PLEIADES_NEO_API_KEY: str = os.getenv("PLEIADES_NEO_API_KEY", "")
    # System Operational Mode: "TESTING" (high-fidelity calibrated demo datasets) vs "PRODUCTION" (DeepForest neural networks & live APIs)
    SYSTEM_MODE: str = os.getenv("SYSTEM_MODE", "TESTING")
    DEEPFOREST_MODEL_PATH: str = os.getenv("DEEPFOREST_MODEL_PATH", "")
    DEEPFOREST_CONFIDENCE_THRESHOLD: float = float(os.getenv("DEEPFOREST_CONFIDENCE_THRESHOLD", "0.25"))

    # Official National Bureau of Statistics (NBS Tanzania) 2022 Census Ward Boundaries
    TANZANIA_NBS_WARD_SHAPEFILES_URL: str = os.getenv(
        "TANZANIA_NBS_WARD_SHAPEFILES_URL",
        "https://www.nbs.go.tz/uploads/statistics/documents/en-1714652282-TANZANIA_2022PHC_WARD_SHAPEFILES.zip"
    )

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

