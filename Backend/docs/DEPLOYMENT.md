# Deployment Guide

Production deployment guide for MorphPost Backend.

---

## Prerequisites

- **Server**: Linux (Ubuntu 20.04+ recommended)
- **Python**: 3.11+
- **PostgreSQL**: 14+
- **Redis**: 6+
- **Nginx**: Latest stable
- **SSL Certificate**: Let's Encrypt or similar

---

## Architecture

```mermaid
graph TB
    Internet[Internet] --> Nginx[Nginx Reverse Proxy]
    Nginx --> Gunicorn[Gunicorn + Uvicorn Workers]
    Gunicorn --> FastAPI[FastAPI Application]
    FastAPI --> PostgreSQL[(PostgreSQL)]
    FastAPI --> Redis[(Redis)]
    Dramatiq[Dramatiq Workers] --> Redis
    Dramatiq --> PostgreSQL
    Dramatiq --> Platforms[Platform APIs]
```

---

## Server Setup

### 1. Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Dependencies

```bash
# Python
sudo apt install python3.11 python3.11-venv python3-pip -y

# PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Redis
sudo apt install redis-server -y

# Nginx
sudo apt install nginx -y

# System dependencies
sudo apt install build-essential libpq-dev -y
```

---

## Database Setup

### 1. Create Database

```bash
sudo -u postgres psql

CREATE DATABASE morphpost;
CREATE USER morphpost WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE morphpost TO morphpost;
\q
```

### 2. Configure PostgreSQL

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## Redis Setup

### Configure Redis

Edit `/etc/redis/redis.conf`:

```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Enable and start:
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## Application Deployment

### 1. Create Application User

```bash
sudo useradd -m -s /bin/bash morphpost
sudo su - morphpost
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/morphpost.git
cd morphpost/Backend
```

### 3. Create Virtual Environment

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Environment

Create `.env` file:

```bash
nano .env
```

**Production .env:**

```env
# Environment
ENVIRONMENT=production
DEBUG=false

# Database
DATABASE_URL=postgresql+asyncpg://morphpost:your-password@localhost:5432/morphpost

# JWT
JWT_SECRET_KEY=your-very-secure-secret-key-min-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-your-production-key
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.7

# Tavily
TAVILY_API_KEY=your-tavily-key

# Platform APIs
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
X_API_KEY=your-x-api-key
X_API_SECRET=your-x-api-secret

# CORS
CORS_ORIGINS=["https://yourdomain.com"]

# Logging
LOG_LEVEL=INFO

# API
API_PREFIX=/api/v1
```

### 5. Run Migrations

```bash
alembic upgrade head
```

---

## Gunicorn Setup

### 1. Install Gunicorn

```bash
pip install gunicorn
```

### 2. Create Gunicorn Config

Create `gunicorn.conf.py`:

```python
import multiprocessing

# Server socket
bind = "127.0.0.1:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = "/var/log/morphpost/access.log"
errorlog = "/var/log/morphpost/error.log"
loglevel = "info"

# Process naming
proc_name = "morphpost"

# Server mechanics
daemon = False
pidfile = "/var/run/morphpost.pid"
user = "morphpost"
group = "morphpost"
```

### 3. Create Log Directory

```bash
sudo mkdir -p /var/log/morphpost
sudo chown morphpost:morphpost /var/log/morphpost
```

### 4. Create Systemd Service

Create `/etc/systemd/system/morphpost.service`:

```ini
[Unit]
Description=MorphPost FastAPI Application
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=morphpost
Group=morphpost
WorkingDirectory=/home/morphpost/morphpost/Backend
Environment="PATH=/home/morphpost/morphpost/Backend/venv/bin"
ExecStart=/home/morphpost/morphpost/Backend/venv/bin/gunicorn src.main:app -c gunicorn.conf.py
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable morphpost
sudo systemctl start morphpost
sudo systemctl status morphpost
```

---

## Dramatiq Workers Setup

### 1. Create Worker Service

Create `/etc/systemd/system/morphpost-worker.service`:

```ini
[Unit]
Description=MorphPost Dramatiq Worker
After=network.target redis.service

[Service]
Type=simple
User=morphpost
Group=morphpost
WorkingDirectory=/home/morphpost/morphpost/Backend
Environment="PATH=/home/morphpost/morphpost/Backend/venv/bin"
ExecStart=/home/morphpost/morphpost/Backend/venv/bin/dramatiq src.workers.publisher --processes 4 --threads 8
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Enable and Start Worker

```bash
sudo systemctl daemon-reload
sudo systemctl enable morphpost-worker
sudo systemctl start morphpost-worker
sudo systemctl status morphpost-worker
```

---

## Nginx Configuration

### 1. Create Nginx Config

Create `/etc/nginx/sites-available/morphpost`:

```nginx
upstream morphpost_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/morphpost-access.log;
    error_log /var/log/nginx/morphpost-error.log;

    # Max upload size
    client_max_body_size 10M;

    location / {
        proxy_pass http://morphpost_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://morphpost_backend;
    }
}
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/morphpost /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL Certificate

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## Monitoring

### 1. Application Logs

```bash
# FastAPI logs
sudo journalctl -u morphpost -f

# Worker logs
sudo journalctl -u morphpost-worker -f

# Nginx logs
sudo tail -f /var/log/nginx/morphpost-access.log
sudo tail -f /var/log/nginx/morphpost-error.log
```

### 2. System Monitoring

Install monitoring tools:

```bash
# htop for process monitoring
sudo apt install htop -y

# PostgreSQL monitoring
sudo apt install postgresql-contrib -y
```

### 3. Application Metrics

Consider adding:
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Sentry** - Error tracking

---

## Backup Strategy

### 1. Database Backup

Create backup script `/home/morphpost/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/morphpost/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="morphpost_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -U morphpost morphpost > $BACKUP_DIR/$FILENAME

# Compress
gzip $BACKUP_DIR/$FILENAME

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME.gz"
```

Make executable:
```bash
chmod +x /home/morphpost/backup.sh
```

### 2. Automated Backups

Add to crontab:
```bash
crontab -e

# Daily backup at 2 AM
0 2 * * * /home/morphpost/backup.sh >> /var/log/morphpost/backup.log 2>&1
```

### 3. Offsite Backup

Upload to S3 or similar:
```bash
# Install AWS CLI
pip install awscli

# Configure
aws configure

# Add to backup script
aws s3 cp $BACKUP_DIR/$FILENAME.gz s3://your-bucket/backups/
```

---

## Security Hardening

### 1. Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 2. Fail2Ban

```bash
# Install
sudo apt install fail2ban -y

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. PostgreSQL Security

Edit `/etc/postgresql/14/main/pg_hba.conf`:

```conf
# Only allow local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

### 4. Environment Variables

Never commit `.env` to version control:
```bash
echo ".env" >> .gitignore
```

---

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Add multiple app servers behind load balancer
2. **Database**: Use PostgreSQL replication
3. **Redis**: Use Redis Cluster
4. **Workers**: Scale Dramatiq workers independently

### Vertical Scaling

1. **CPU**: Increase Gunicorn workers
2. **Memory**: Increase PostgreSQL shared_buffers
3. **Storage**: Use SSD for database

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
sudo journalctl -u morphpost -n 50

# Check if port is in use
sudo lsof -i :8000

# Test configuration
source venv/bin/activate
uvicorn src.main:app --host 127.0.0.1 --port 8000
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U morphpost -d morphpost -h localhost

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Worker Issues

```bash
# Check worker status
sudo systemctl status morphpost-worker

# Check Redis
redis-cli ping

# Monitor queue
redis-cli
> KEYS *
```

---

## Updates & Maintenance

### Deploying Updates

```bash
# As morphpost user
cd /home/morphpost/morphpost/Backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# Restart services
sudo systemctl restart morphpost
sudo systemctl restart morphpost-worker
```

### Zero-Downtime Deployment

Use blue-green deployment or rolling updates with multiple app servers.

---

## Health Checks

### Application Health

Add health check endpoint in FastAPI:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### Monitoring Script

```bash
#!/bin/bash
curl -f http://localhost:8000/health || exit 1
```

---

## Performance Tuning

### Gunicorn Workers

```python
# Optimal workers = (2 x CPU cores) + 1
workers = multiprocessing.cpu_count() * 2 + 1
```

### PostgreSQL

```conf
shared_buffers = 25% of RAM
effective_cache_size = 50% of RAM
work_mem = RAM / (max_connections * 3)
```

### Redis

```conf
maxmemory = 256mb  # Adjust based on usage
maxmemory-policy = allkeys-lru
```

---

## Support

For deployment issues:
- Check logs first
- Review this guide
- Contact: devops@morphpost.com
