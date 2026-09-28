#!/bin/bash
# Moves the backend onto a database role that owns the data but is no superuser.
#   - creates role drinkdb_app if missing and makes it owner of the database and its tables
#   - sets a new random password for it and writes DB_USER/DB_PASSWORD into .env
#   - recreates the backend so it connects as that role
# drinkuser stays the superuser for backups (docker exec pg_dump) and maintenance.
# Run with the stack up, as your own user (not sudo): scripts/create-app-db-role.sh
# Safe to re-run: the second time it only rotates the app password. Data is not touched.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$(id -u)" = 0 ]; then
  echo "Run it without sudo: files it writes must stay owned by you." >&2
  exit 1
fi

DB_NAME=drinkdb
SUPERUSER=drinkuser
APP_USER=drinkdb_app
APP_PW=$(openssl rand -hex 24)
STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p ~/backups
docker compose exec -T db pg_dump -U "$SUPERUSER" -Fc "$DB_NAME" > ~/backups/"$DB_NAME-pre-app-role-$STAMP.dump"
cp .env ~/backups/"drink_counter-env.bak-$STAMP"
chmod 600 ~/backups/"drink_counter-env.bak-$STAMP"

docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U "$SUPERUSER" -d "$DB_NAME" \
  -v app_user="$APP_USER" -v db_name="$DB_NAME" -v app_pw="$APP_PW" <<'SQL'
SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') AS need_role \gset
\if :need_role
  CREATE ROLE :"app_user" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
\endif
ALTER ROLE :"app_user" PASSWORD :'app_pw';
BEGIN;
ALTER DATABASE :"db_name" OWNER TO :"app_user";
SELECT set_config('app_role.name', :'app_user', true) AS _ \gset
DO $$ DECLARE r record; BEGIN
  -- ALTER TABLE ... OWNER also moves the sequences the table owns.
  FOR r IN SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p') LOOP
    EXECUTE format('ALTER %s public.%I OWNER TO %I',
      CASE r.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,
      r.relname, current_setting('app_role.name'));
  END LOOP; END $$;
COMMIT;
SQL

python3 - "$APP_USER" "$APP_PW" <<'PY'
import re, sys
user, password = sys.argv[1:]
text = open('.env').read()
for key, value in (('DB_USER', user), ('DB_PASSWORD', password)):
    if re.search(rf'(?m)^{key}=', text):
        text = re.sub(rf'(?m)^{key}=.*$', f'{key}={value}', text)
    else:
        text = text.rstrip('\n') + f'\n{key}={value}\n'
open('.env', 'w').write(text)
PY
chmod 600 .env

docker compose up -d --force-recreate backend
sleep 10
docker compose exec -T backend python manage.py shell -c \
  "from django.db import connection; c=connection.cursor(); c.execute('select current_user, (select rolsuper from pg_roles where rolname=current_user)'); print('backend connects as', c.fetchone())"
