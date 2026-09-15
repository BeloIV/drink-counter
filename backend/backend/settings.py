"""Django settings for the Drink Counter backend."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# The fallback key is for local development only; production sets SECRET_KEY.
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-o!wu-wv1!5^)*vvlmf&s6cop9e3le%tr2upd(#5qn8vmr)9dvl')
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"

ALLOWED_HOSTS = [
    "192.168.1.250", "localhost", "127.0.0.1",
    "drinkcounter.bytboyzserver.xyz",
    "backend",
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'core',
    'drf_spectacular',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'core.middleware.GoogleAuthMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "drinkdb"),
        "USER": os.environ.get("POSTGRES_USER", "drinkuser"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "drinkpass"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 600,
        # The migration history cannot build a fresh database (0001 already
        # creates Item.color, 0002 adds it again), so tests use the models.
        "TEST": {"MIGRATE": False},
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# /static belongs to the React build, so Django's own assets get a separate prefix.
STATIC_URL = '/django-static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
DATA_UPLOAD_MAX_MEMORY_SIZE = 15 * 1024 * 1024  # 15 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 15 * 1024 * 1024  # 15 MB

# nginx fronts gunicorn, behind NPM and Cloudflare.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://192.168.1.250:5173",
    "http://localhost:5173",
    "https://drinkcounter.bytboyzserver.xyz",
]
CSRF_TRUSTED_ORIGINS = [
    "http://192.168.1.250:5173",
    "http://192.168.1.250:8001",
    "http://192.168.1.250",
    "http://localhost:5173",
    "https://drinkcounter.bytboyzserver.xyz",
]

# Lax cookies keep the session working on the plain-HTTP LAN address.
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
_HTTPS = os.environ.get("HTTPS", "false").lower() == "true"
CSRF_COOKIE_SECURE = _HTTPS
SESSION_COOKIE_SECURE = _HTTPS

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {
        'admin_login': '10/hour',
        'google_login': '30/hour',
        'transactions': '120/minute',
    },
}
SPECTACULAR_SETTINGS = {
    'TITLE': 'Drink Counter API',
    'VERSION': '1.0.0',
}

ADMIN_PIN = os.getenv("ADMIN_PIN", "1234")
PAYMENT_IBAN = os.getenv("PAYMENT_IBAN", "SK9365000000003650622489")
PUBLIC_HOST = os.getenv("PUBLIC_HOST", "drinkcounter.bytboyzserver.xyz")
# Google sign-in on PUBLIC_HOST. Without a client ID nobody can sign in there.
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
# Comma-separated emails that are always admins of the access page.
BOOTSTRAP_ADMIN_EMAILS = os.getenv("BOOTSTRAP_ADMIN_EMAILS", "")
