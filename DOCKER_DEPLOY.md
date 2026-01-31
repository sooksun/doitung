# EQAP Docker Deployment Guide
## สำหรับ Ubuntu 24.x.x

---

## ข้อมูลพื้นฐาน

| รายการ | ค่า |
|--------|-----|
| **Application Path** | `/DATA/AppData/www/doitung` |
| **Application Port** | `9901` |
| **Database Port** | `3306` |
| **Repository** | https://github.com/sooksun/doitung |

---

## วิธีติดตั้งอัตโนมัติ (Recommended)

### 1. ดาวน์โหลด Script และรัน

```bash
# Download deployment script
curl -O https://raw.githubusercontent.com/sooksun/doitung/main/deploy-ubuntu.sh

# Make executable
chmod +x deploy-ubuntu.sh

# Run with sudo
sudo ./deploy-ubuntu.sh
```

---

## วิธีติดตั้งแบบ Manual

### 1. อัปเดตระบบและติดตั้ง Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release git

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version
```

### 2. สร้างโครงสร้าง Directory

```bash
# Create directories
sudo mkdir -p /DATA/AppData/www/doitung
sudo mkdir -p /DATA/AppData/www/doitung/uploads/evidence
sudo mkdir -p /DATA/AppData/www/doitung/logs
sudo mkdir -p /DATA/AppData/www/doitung/backups

# Set permissions
sudo chown -R $USER:$USER /DATA/AppData/www/doitung
```

### 3. Clone Repository

```bash
cd /DATA/AppData/www
git clone https://github.com/sooksun/doitung.git
cd doitung
```

### 4. สร้างไฟล์ .env

```bash
# Copy template
cp .env.docker .env

# Edit configuration
nano .env
```

แก้ไขค่าต่างๆ ใน `.env`:
```env
DB_ROOT_PASSWORD=YourSecureRootPassword123
DB_PASSWORD=YourSecureDbPassword123
JWT_SECRET=YourSuperSecretJWTKey123456789
JWT_REFRESH_SECRET=YourSuperSecretRefreshKey123456789
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:9901
```

### 5. Build และ Start Containers

```bash
cd /DATA/AppData/www/doitung

# Build containers
docker compose build --no-cache

# Start containers
docker compose up -d

# Check status
docker compose ps
```

### 6. รอให้ Database พร้อม และ Run Migrations

```bash
# Wait for database (ประมาณ 30 วินาที)
sleep 30

# Check database health
docker compose exec db mysqladmin ping -h localhost -u root -p

# Run Prisma migrations
docker compose exec app npx prisma db push

# Seed database
docker compose exec app npx prisma db seed
```

### 7. ตั้งค่า Firewall

```bash
# Allow port 9901
sudo ufw allow 9901/tcp comment 'EQAP Application'
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw enable
sudo ufw status
```

---

## การใช้งาน

### เข้าใช้งานระบบ

เปิด Browser และไปที่:
```
http://YOUR_SERVER_IP:9901
```

### บัญชีทดสอบ

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@eqap.local | password123 |
| Office Admin | office1@eqap.local | password123 |
| Network Admin | network1@eqap.local | password123 |
| School Director | director1@eqap.local | password123 |
| Teacher | teacher1@eqap.local | password123 |
| Viewer | viewer1@eqap.local | password123 |

---

## คำสั่งที่ใช้บ่อย

### Docker Compose Commands

```bash
cd /DATA/AppData/www/doitung

# ดู status
docker compose ps

# ดู logs
docker compose logs -f

# ดู logs เฉพาะ app
docker compose logs -f app

# Restart ทั้งหมด
docker compose restart

# Stop ทั้งหมด
docker compose down

# Start ทั้งหมด
docker compose up -d

# Rebuild และ Start
docker compose up -d --build
```

### Database Commands

```bash
# เข้า MySQL shell
docker compose exec db mysql -u root -p

# Backup database
docker compose exec db mysqldump -u root -p eqap_db > backup_$(date +%Y%m%d).sql

# Restore database
docker compose exec -T db mysql -u root -p eqap_db < backup_file.sql
```

### Application Commands

```bash
# เข้า app shell
docker compose exec app sh

# Run Prisma Studio (Database GUI)
docker compose exec app npx prisma studio

# Re-seed database
docker compose exec app npx prisma db seed
```

---

## การ Backup

### Backup Database

```bash
cd /DATA/AppData/www/doitung

# Backup
docker compose exec db mysqldump -u root -p"$(grep DB_ROOT_PASSWORD .env | cut -d '=' -f2)" eqap_db > backups/db_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup Uploads

```bash
# Backup uploads folder
tar -czvf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /DATA/AppData/www/doitung public/uploads
```

---

## Troubleshooting

### Container ไม่ Start

```bash
# ดู logs
docker compose logs

# ตรวจสอบ disk space
df -h

# ตรวจสอบ memory
free -m
```

### Database Connection Error

```bash
# ตรวจสอบ database container
docker compose ps db

# ตรวจสอบ database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Application Error

```bash
# ตรวจสอบ app logs
docker compose logs app

# Rebuild app
docker compose build --no-cache app
docker compose up -d app
```

### Port 9901 ถูกใช้งาน

```bash
# ตรวจสอบ process ที่ใช้ port
sudo lsof -i :9901

# หรือ
sudo netstat -tulpn | grep 9901
```

---

## อัปเดต Application

```bash
cd /DATA/AppData/www/doitung

# Pull latest code
git pull origin main

# Rebuild containers
docker compose build --no-cache

# Restart
docker compose down
docker compose up -d

# Run migrations (if any)
docker compose exec app npx prisma db push
```

---

## System Requirements

| รายการ | ขั้นต่ำ | แนะนำ |
|--------|--------|-------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB | 50 GB |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

---

## Support

หากพบปัญหา กรุณาสร้าง Issue ที่:
https://github.com/sooksun/doitung/issues
