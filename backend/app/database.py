import os
import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger("kijani.database")
logging.basicConfig(level=logging.INFO)

db_url = settings.DATABASE_URL
is_sqlite = "sqlite" in db_url

def init_engine(url: str):
    """
    Initializes database engine. For PostgreSQL, includes connection retry logic
    to wait for PostGIS container readiness when starting under Docker Compose.
    """
    if "sqlite" in url:
        return create_engine(
            url,
            echo=False,
            connect_args={"check_same_thread": False}
        )

    # PostgreSQL / PostGIS configuration
    max_retries = int(os.getenv("DB_MAX_RETRIES", "15"))
    retry_delay = float(os.getenv("DB_RETRY_DELAY", "2.0"))
    engine_kwargs = {
        "echo": False,
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 10,
        "pool_recycle": 3600
    }

    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Connecting to PostgreSQL spatial database (attempt {attempt}/{max_retries})...")
            eng = create_engine(url, **engine_kwargs)
            with eng.connect() as conn:
                # Ensure PostGIS and UUID extensions are enabled
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
                conn.commit()
            logger.info(f"Connected to PostgreSQL database with PostGIS enabled at {url.split('@')[-1] if '@' in url else url}")
            return eng
        except Exception as exc:
            last_exc = exc
            logger.warning(f"PostgreSQL connection attempt {attempt} failed: {exc}. Retrying in {retry_delay:.1f}s...")
            if attempt < max_retries:
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 1.3, 8.0)

    # If Postgres is unreachable (e.g. running quick isolated unit test without Docker running)
    if os.getenv("ALLOW_SQLITE_FALLBACK", "1") == "1":
        logger.warning(f"PostgreSQL unavailable after {max_retries} attempts ({last_exc}). Using local SQLite for tests.")
        fallback_url = "sqlite:////tmp/kijani_local.db"
        return create_engine(fallback_url, echo=False, connect_args={"check_same_thread": False})
    
    raise RuntimeError(f"Could not connect to PostgreSQL database at {url}: {last_exc}")

engine = init_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
