#!/bin/sh
set -e

echo "=== PayloadOps Entrypoint ==="

# Wait for database to be ready
echo ">> Waiting for database..."
python -c "
import time, os, psycopg
for i in range(30):
    try:
        conn = psycopg.connect(
            dbname=os.environ.get('POSTGRES_DB', 'payloadops'),
            user=os.environ.get('POSTGRES_USER', 'payloadops'),
            password=os.environ.get('POSTGRES_PASSWORD', 'payloadops_secret'),
            host=os.environ.get('POSTGRES_HOST', 'db'),
            port=os.environ.get('POSTGRES_PORT', '5432'),
        )
        conn.close()
        print('Database is ready!')
        break
    except Exception as e:
        print(f'Attempt {i+1}/30 - DB not ready: {e}')
        time.sleep(2)
else:
    print('ERROR: Database not available after 60 seconds')
    exit(1)
"

# Apply migrations
echo ">> Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo ">> Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo ">> Starting application..."
exec "$@"
