import hashlib
import io
from typing import Tuple

from PIL import Image

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_DIMENSION = 2048


def validate_and_resize(image_data: bytes) -> Tuple[bytes, str]:
    if len(image_data) > MAX_IMAGE_SIZE:
        raise ValueError("Image exceeds maximum size of 10MB")

    image = Image.open(io.BytesIO(image_data))
    if image.format not in ALLOWED_FORMATS:
        raise ValueError(f"Unsupported image format: {image.format}")

    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    width, height = image.size
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue(), "image/jpeg"


def compute_image_hash(image_data: bytes) -> str:
    return hashlib.md5(image_data).hexdigest()
