import shutil
import tempfile
from io import BytesIO
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from .models import Person


def photo_upload(width, height, name="photo.jpg"):
    buffer = BytesIO()
    Image.new("RGB", (width, height), "orange").save(buffer, "JPEG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


class AvatarThumbnailTests(APITestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        media_override = override_settings(MEDIA_ROOT=self.media_root)
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, ignore_errors=True)

    def thumbnail_of(self, person):
        rows = self.client.get("/api/persons/").data
        return next(row for row in rows if row["id"] == person.id)["avatar_thumbnail"]

    def thumbnail_size(self, url):
        with Image.open(Path(self.media_root) / url.removeprefix("/media/")) as thumbnail:
            return thumbnail.size

    def test_large_photo_is_scaled_down_to_the_short_side(self):
        person = Person.objects.create(name="Alice", avatar=photo_upload(3000, 2000))

        url = self.thumbnail_of(person)

        self.assertTrue(url.startswith("/media/avatars/thumbs/"))
        self.assertEqual(self.thumbnail_size(url), (600, 400))

    def test_small_photo_is_not_upscaled(self):
        person = Person.objects.create(name="Bob", avatar=photo_upload(300, 200))

        self.assertEqual(self.thumbnail_size(self.thumbnail_of(person)), (300, 200))

    def test_person_without_photo_has_no_thumbnail(self):
        person = Person.objects.create(name="Carol")

        self.assertIsNone(self.thumbnail_of(person))

    def test_unreadable_photo_has_no_thumbnail(self):
        broken = SimpleUploadedFile("broken.jpg", b"not an image", content_type="image/jpeg")
        person = Person.objects.create(name="Dave", avatar=broken)

        self.assertIsNone(self.thumbnail_of(person))
