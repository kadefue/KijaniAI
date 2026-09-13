import os
import io

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    boto3 = None
    ClientError = Exception
    HAS_BOTO3 = False

from app.config import settings

class StorageService:
    """
    Object storage service interfacing MinIO / AWS S3 with local disk fallback.
    """
    def __init__(self):
        self.use_s3 = False
        self.s3_client = None
        if HAS_BOTO3:
            try:
                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.STORAGE_ENDPOINT,
                    aws_access_key_id=settings.STORAGE_ACCESS_KEY,
                    aws_secret_access_key=settings.STORAGE_SECRET_KEY,
                    region_name="us-east-1"
                )
                self.s3_client.list_buckets()
                self.use_s3 = True
                self._ensure_buckets()
            except Exception:
                self.use_s3 = False
        
        os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)

    def _ensure_buckets(self):
        buckets = [
            settings.STORAGE_BUCKET_RAW,
            settings.STORAGE_BUCKET_COGS,
            settings.STORAGE_BUCKET_MRV,
            settings.STORAGE_BUCKET_REPLAYS,
            settings.STORAGE_BUCKET_WATER,
            settings.STORAGE_BUCKET_IRRIGATION,
            settings.STORAGE_BUCKET_PHOTOS,
        ]
        for b in buckets:
            try:
                self.s3_client.head_bucket(Bucket=b)
            except ClientError:
                try:
                    self.s3_client.create_bucket(Bucket=b)
                except Exception:
                    pass

    def put_object(self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        if self.use_s3 and self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=data,
                    ContentType=content_type
                )
                return f"{bucket}/{key}"
            except Exception:
                pass

        # Local disk fallback
        bucket_dir = os.path.join(settings.LOCAL_STORAGE_DIR, bucket)
        os.makedirs(bucket_dir, exist_ok=True)
        file_path = os.path.join(bucket_dir, key.replace("/", "_"))
        with open(file_path, "wb") as f:
            f.write(data)
        return f"{bucket}/{key}"

    def get_object(self, bucket: str, key: str) -> bytes:
        if self.use_s3 and self.s3_client:
            try:
                resp = self.s3_client.get_object(Bucket=bucket, Key=key)
                return resp["Body"].read()
            except Exception:
                pass

        bucket_dir = os.path.join(settings.LOCAL_STORAGE_DIR, bucket)
        file_path = os.path.join(bucket_dir, key.replace("/", "_"))
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                return f.read()
        return b""

storage_service = StorageService()
