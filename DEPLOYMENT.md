# 🚀 EQAP Deployment Guide

## การ Deploy ระบบ EduQuality Assessment Platform

---

## 📋 ตัวเลือกการ Deploy

### 1. Docker Deployment (แนะนำ)

**ข้อดี:**
- ง่าย รวดเร็ว และสามารถทำซ้ำได้
- Isolated environment
- รองรับทั้ง Development และ Production

**ขั้นตอน:**

```bash
# 1. Clone repository
git clone <repository-url>
cd evalTeacher

# 2. Copy และแก้ไข environment variables
cp .env.example .env
# แก้ไข .env ตามความต้องการ

# 3. Build และ Run ด้วย Docker Compose
docker-compose up -d

# 4. Run database migrations
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed

# 5. เข้าใช้งานที่
# http://localhost:3000
```

**หยุดการทำงาน:**
```bash
docker-compose down

# ลบข้อมูลด้วย (ระวัง!)
docker-compose down -v
```

---

### 2. Ubuntu Server Deployment

**Requirements:**
- Ubuntu 20.04 LTS ขึ้นไป
- Node.js 18+
- MySQL 8.0+
- Nginx (recommended)

**ขั้นตอน:**

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install MySQL
sudo apt-get update
sudo apt-get install -y mysql-server
sudo mysql_secure_installation

# 3. สร้าง database
sudo mysql -u root -p
CREATE DATABASE eqap;
CREATE USER 'eqap_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON eqap.* TO 'eqap_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 4. Clone และ setup project
git clone <repository-url>
cd evalTeacher
npm install
cp .env.example .env
# แก้ไข .env

# 5. Setup Prisma
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# 6. Build application
npm run build

# 7. Install PM2 (Process Manager)
sudo npm install -g pm2

# 8. Start application
pm2 start npm --name "eqap" -- start
pm2 save
pm2 startup

# 9. Setup Nginx (optional but recommended)
sudo apt-get install -y nginx
sudo cp nginx.conf /etc/nginx/sites-available/eqap
sudo ln -s /etc/nginx/sites-available/eqap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 3. Vercel Deployment (สำหรับ Frontend)

**Note:** ต้องใช้ External Database (PlanetScale, Supabase, etc.)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Set environment variables in Vercel Dashboard
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - etc.

# 5. Deploy production
vercel --prod
```

---

## 🔐 Environment Variables (Production)

สร้างไฟล์ `.env.production`:

```env
# Database
DATABASE_URL="mysql://user:password@host:3306/database"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# App
NODE_ENV="production"
NEXT_PUBLIC_API_URL="https://your-domain.com"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="EQAP <noreply@your-domain.com>"
```

---

## 📊 Database Migration

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy

# Reset database (ระวัง!)
npx prisma migrate reset

# Seed data
npm run db:seed
```

---

## 🔧 Performance Optimization

### 1. Next.js Build Optimization
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  output: 'standalone', // For Docker
  compress: true,
  images: {
    domains: ['localhost', 'your-domain.com'],
  },
}
```

### 2. Enable Caching
- ระบบมี in-memory cache built-in
- สำหรับ production แนะนำใช้ Redis

### 3. Database Indexing
- Prisma schema มี indexes สำหรับ queries ที่ใช้บ่อย

---

## 🔒 Security Checklist

- [ ] เปลี่ยน JWT secrets ใน production
- [ ] ใช้ HTTPS (SSL/TLS certificate)
- [ ] Setup rate limiting
- [ ] Enable CORS อย่างเหมาะสม
- [ ] Setup firewall rules
- [ ] Regular database backups
- [ ] Monitor logs และ errors
- [ ] Keep dependencies updated

---

## 📈 Monitoring & Logging

### Recommended Tools:
- **PM2 Monitoring**: `pm2 monit`
- **Logs**: `pm2 logs eqap`
- **System Monitor**: htop, netdata
- **Error Tracking**: Sentry (optional)
- **Uptime Monitoring**: UptimeRobot (optional)

```bash
# PM2 Commands
pm2 status
pm2 restart eqap
pm2 stop eqap
pm2 logs eqap
pm2 monit
```

---

## 🔄 Updates & Maintenance

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Restart application
pm2 restart eqap

# Or with Docker
docker-compose down
docker-compose up -d --build
```

---

## 📞 Troubleshooting

### Problem: Application won't start
```bash
# Check logs
pm2 logs eqap
# or
docker-compose logs app

# Check port availability
sudo netstat -tulpn | grep 3000
```

### Problem: Database connection failed
```bash
# Test MySQL connection
mysql -u eqap_user -p -h localhost eqap

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Problem: Prisma Client errors
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset and reseed
npx prisma migrate reset
npm run db:seed
```

---

## 📱 Health Check Endpoints

- **API Health**: `GET /api/health`
- **Database Health**: `GET /api/health/db`

---

## 🎯 Production Checklist

- [ ] Setup production database
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Seed initial data
- [ ] Build application
- [ ] Setup process manager (PM2)
- [ ] Configure web server (Nginx)
- [ ] Setup SSL certificate
- [ ] Configure firewall
- [ ] Setup monitoring
- [ ] Setup backup strategy
- [ ] Test all functionality
- [ ] Load testing
- [ ] Security audit

---

## 📝 Notes

- Default Super Admin: `superadmin@example.com` / `password123`
- **เปลี่ยนรหัสผ่านทันทีหลัง deploy!**
- ใช้ strong passwords และ JWT secrets
- Backup database เป็นประจำ
