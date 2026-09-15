"""Avatar thumbnails: screens show many people at once, and phone photos are several MB each."""
import os
from pathlib import Path

from django.conf import settings
from PIL import Image, ImageOps, UnidentifiedImageError

# The largest avatar on screen is a ~200 px person card; twice that stays sharp on HiDPI screens.
THUMBNAIL_SHORT_SIDE = 400
THUMBNAIL_QUALITY = 82
THUMBNAIL_DIR = "avatars/thumbs"


def thumbnail_url(avatar):
    """URL of a small JPEG copy of the avatar, created on first use; None when it cannot be made."""
    if not avatar:
        return None
    relative_name = f"{THUMBNAIL_DIR}/{Path(avatar.name).name}.jpg"
    target = Path(settings.MEDIA_ROOT) / relative_name
    try:
        source = Path(avatar.path)
        if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
            _write_thumbnail(source, target)
    except (OSError, UnidentifiedImageError):
        return None
    return f"{settings.MEDIA_URL}{relative_name}"


def _write_thumbnail(source, target):
    with Image.open(source) as original:
        # Phone photos store their rotation in EXIF; browsers apply it, so the thumbnail must too.
        image = ImageOps.exif_transpose(original).convert("RGB")
    scale = THUMBNAIL_SHORT_SIDE / min(image.size)
    if scale < 1:
        size = (round(image.width * scale), round(image.height * scale))
        image = image.resize(size, Image.Resampling.LANCZOS)

    target.parent.mkdir(parents=True, exist_ok=True)
    # Write to a per-process temporary file and rename it, so a request served by another
    # gunicorn worker never reads a half-written thumbnail.
    temporary = target.with_name(f".{target.name}.{os.getpid()}.tmp")
    image.save(temporary, "JPEG", quality=THUMBNAIL_QUALITY, optimize=True)
    temporary.replace(target)
