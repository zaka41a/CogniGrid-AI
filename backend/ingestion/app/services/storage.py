"""
StorageService — manages file storage in MinIO (S3-compatible).
Gracefully degrades if MinIO is unavailable (uploads are skipped but
the rest of the pipeline continues).
"""
import logging
from app.config import settings

logger = logging.getLogger(__name__)

try:
    import boto3
    from botocore.client import Config
    _BOTO3_AVAILABLE = True
except ImportError:
    _BOTO3_AVAILABLE = False
    logger.warning("boto3 not installed — file storage disabled")


class StorageService:

    def __init__(self):
        self.client = None
        if not _BOTO3_AVAILABLE:
            logger.warning("StorageService: boto3 unavailable, storage is a no-op")
            return
        try:
            self.client = boto3.client(
                "s3",
                endpoint_url=settings.minio_url,
                aws_access_key_id=settings.minio_root_user,
                aws_secret_access_key=settings.minio_root_password,
                config=Config(signature_version="s3v4"),
                region_name="us-east-1",
            )
            self._ensure_bucket()
        except Exception as e:
            logger.warning(f"MinIO not reachable — storage disabled: {e}")
            self.client = None

    def _ensure_bucket(self):
        try:
            self.client.head_bucket(Bucket=settings.minio_bucket)
        except Exception:
            try:
                self.client.create_bucket(Bucket=settings.minio_bucket)
            except Exception as e:
                logger.warning(f"Could not create bucket: {e}")

    def upload(self, file_path: str, object_name: str) -> str:
        if self.client is None:
            logger.warning("Storage unavailable — skipping upload")
            return f"local/{object_name}"
        try:
            self.client.upload_file(file_path, settings.minio_bucket, object_name)
            return f"{settings.minio_bucket}/{object_name}"
        except Exception as e:
            logger.warning(f"Upload to MinIO failed: {e}")
            return f"local/{object_name}"

    def download(self, object_name: str, dest_path: str):
        if self.client is None:
            return
        try:
            self.client.download_file(settings.minio_bucket, object_name, dest_path)
        except Exception as e:
            logger.warning(f"Download from MinIO failed: {e}")

    def delete(self, object_name: str):
        if self.client is None:
            return
        try:
            self.client.delete_object(Bucket=settings.minio_bucket, Key=object_name)
        except Exception as e:
            logger.warning(f"Delete from MinIO failed: {e}")

    def get_url(self, object_name: str, expires: int = 3600) -> str:
        if self.client is None:
            return ""
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.minio_bucket, "Key": object_name},
                ExpiresIn=expires,
            )
        except Exception as e:
            logger.warning(f"Presigned URL generation failed: {e}")
            return ""
