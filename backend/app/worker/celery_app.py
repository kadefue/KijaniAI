from app.config import settings

try:
    from celery import Celery
    HAS_CELERY = True
    celery_app = Celery(
        "kijani_worker",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
        include=["app.worker.tasks"]
    )

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="Africa/Dar_es_Salaam",
        enable_utc=True,
        task_track_started=True,
        beat_schedule={
            "retention-winback-hourly": {
                "task": "app.worker.tasks.retention_winback_evaluation_task",
                "schedule": 3600.0,
            }
        }
    )
except ImportError:
    HAS_CELERY = False
    class MockCelery:
        def task(self, *args, **kwargs):
            def decorator(fn):
                def delay(*d_args, **d_kwargs):
                    return fn(*d_args, **d_kwargs)
                fn.delay = delay
                return fn
            return decorator
    celery_app = MockCelery()
