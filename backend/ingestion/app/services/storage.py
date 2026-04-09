"""
StorageService — gère le stockage des fichiers dans MinIO (S3-compatible).
Les fichiers uploadés sont stockés avant traitement, puis conservés pour
pouvoir être re-traités ou consultés.
"""
import boto3
from botocore.client import Config
from app.config import settings


class StorageService:

    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.minio_url,
            aws_access_key_id=settings.minio_root_user,
            aws_secret_access_key=settings.minio_root_password,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.client.head_bucket(Bucket=settings.minio_bucket)
        except Exception:
            self.client.create_bucket(Bucket=settings.minio_bucket)

    def upload(self, file_path: str, object_name: str) -> str:
        """Upload un fichier local vers MinIO. Retourne le chemin de stockage."""
        self.client.upload_file(
            file_path,
            settings.minio_bucket,
            object_name,
        )
        return f"{settings.minio_bucket}/{object_name}"

    def download(self, object_name: str, dest_path: str):
        """Télécharge un fichier de MinIO vers un chemin local."""
        self.client.download_file(settings.minio_bucket, object_name, dest_path)

    def delete(self, object_name: str):
        self.client.delete_object(Bucket=settings.minio_bucket, Key=object_name)

    def get_url(self, object_name: str, expires: int = 3600) -> str:
        """Génère une URL pré-signée pour téléchargement direct."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.minio_bucket, "Key": object_name},
            ExpiresIn=expires,
        )
