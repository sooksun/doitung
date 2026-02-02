#!/bin/bash

# ==============================================
# TSQM-n แม่ฟ้าหลวง
# Deployment Script for Ubuntu 24.x.x
# Application Path: /DATA/AppData/www/doitung
# Application Port: 9901
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="eqap"
APP_PATH="/DATA/AppData/www/doitung"
APP_PORT="9901"
DB_PORT="3306"
REPO_URL="https://github.com/sooksun/doitung.git"

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "  TSQM-n แม่ฟ้าหลวง"
    echo "  Deployment Script for Ubuntu 24.x.x"
    echo "=============================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run this script as root (sudo ./deploy-ubuntu.sh)"
        exit 1
    fi
}

# Update system
update_system() {
    print_step "Updating system packages..."
    apt update && apt upgrade -y
}

# Install Docker
install_docker() {
    print_step "Installing Docker..."
    
    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        print_warning "Docker is already installed"
        docker --version
    else
        # Remove old versions
        apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
        
        # Install prerequisites
        apt install -y ca-certificates curl gnupg lsb-release
        
        # Add Docker's official GPG key
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        
        # Set up repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker
        apt update
        apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        # Start and enable Docker
        systemctl start docker
        systemctl enable docker
        
        print_success "Docker installed successfully"
    fi
}

# Install Docker Compose
install_docker_compose() {
    print_step "Checking Docker Compose..."
    
    if docker compose version &> /dev/null; then
        print_warning "Docker Compose is already installed"
        docker compose version
    else
        print_error "Docker Compose plugin not found. Please reinstall Docker."
        exit 1
    fi
}

# Create directory structure
create_directories() {
    print_step "Creating directory structure..."
    
    # Create main directory
    mkdir -p "$APP_PATH"
    mkdir -p "$APP_PATH/mysql-init"
    mkdir -p "$APP_PATH/uploads/evidence"
    mkdir -p "$APP_PATH/logs"
    mkdir -p "$APP_PATH/backups"
    
    print_success "Directories created at $APP_PATH"
}

# Clone or update repository
clone_repository() {
    print_step "Cloning repository..."
    
    if [ -d "$APP_PATH/.git" ]; then
        print_warning "Repository already exists. Pulling latest changes..."
        cd "$APP_PATH"
        git pull origin main
    else
        # Clone repository
        git clone "$REPO_URL" "$APP_PATH"
    fi
    
    cd "$APP_PATH"
    print_success "Repository cloned/updated successfully"
}

# Create environment file
create_env_file() {
    print_step "Creating environment file..."
    
    if [ -f "$APP_PATH/.env" ]; then
        print_warning ".env file already exists. Backing up..."
        cp "$APP_PATH/.env" "$APP_PATH/.env.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    DB_ROOT_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    
    cat > "$APP_PATH/.env" << EOF
# ==============================================
# EQAP Environment Configuration
# Generated: $(date)
# ==============================================

# Database Configuration
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
DB_NAME=eqap_db
DB_USER=eqap_user
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=3306

# Application Configuration
APP_PORT=9901
NODE_ENV=production

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# API URL (Change this to your domain or IP)
NEXT_PUBLIC_API_URL=http://localhost:9901

# Timezone
TZ=Asia/Bangkok
EOF

    chmod 600 "$APP_PATH/.env"
    print_success "Environment file created"
    
    echo ""
    echo -e "${YELLOW}[IMPORTANT] Please save these credentials:${NC}"
    echo "  Database Root Password: $DB_ROOT_PASSWORD"
    echo "  Database User Password: $DB_PASSWORD"
    echo ""
}

# Build and start containers
start_containers() {
    print_step "Building and starting Docker containers..."
    
    cd "$APP_PATH"
    
    # Build containers
    docker compose build --no-cache
    
    # Start containers
    docker compose up -d
    
    print_success "Containers started successfully"
}

# Wait for database
wait_for_db() {
    print_step "Waiting for database to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose exec -T db mysqladmin ping -h localhost -u root -p"$(grep DB_ROOT_PASSWORD "$APP_PATH/.env" | cut -d '=' -f2)" --silent 2>/dev/null; then
            print_success "Database is ready!"
            return 0
        fi
        echo "  Attempt $attempt/$max_attempts - Waiting for database..."
        sleep 5
        ((attempt++))
    done
    
    print_error "Database did not become ready in time"
    return 1
}

# Run database migrations and seed
run_migrations() {
    print_step "Running database migrations and seed..."
    
    cd "$APP_PATH"
    
    # Run Prisma migrations
    docker compose exec -T app npx prisma db push --accept-data-loss
    
    # Seed database
    docker compose exec -T app npx prisma db seed
    
    print_success "Database migrations and seed completed"
}

# Setup firewall
setup_firewall() {
    print_step "Configuring firewall..."
    
    # Check if ufw is installed
    if command -v ufw &> /dev/null; then
        ufw allow $APP_PORT/tcp comment 'EQAP Application'
        ufw allow 22/tcp comment 'SSH'
        
        # Enable firewall if not already enabled
        if ! ufw status | grep -q "Status: active"; then
            print_warning "Enabling UFW firewall..."
            ufw --force enable
        fi
        
        print_success "Firewall configured"
    else
        print_warning "UFW not installed. Please configure firewall manually."
    fi
}

# Create systemd service
create_systemd_service() {
    print_step "Creating systemd service..."
    
    cat > /etc/systemd/system/eqap.service << EOF
[Unit]
Description=TSQM-n แม่ฟ้าหลวง
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_PATH
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable eqap.service
    
    print_success "Systemd service created and enabled"
}

# Show status
show_status() {
    echo ""
    echo -e "${BLUE}=============================================="
    echo "  Deployment Complete!"
    echo "==============================================${NC}"
    echo ""
    echo -e "${GREEN}Application URL:${NC} http://localhost:$APP_PORT"
    echo -e "${GREEN}Application Path:${NC} $APP_PATH"
    echo ""
    echo -e "${YELLOW}Test Accounts:${NC}"
    echo "  Super Admin: admin@eqap.local / password123"
    echo "  Office Admin: office1@eqap.local / password123"
    echo "  Teacher: teacher1@eqap.local / password123"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  View logs:      cd $APP_PATH && docker compose logs -f"
    echo "  Restart app:    cd $APP_PATH && docker compose restart"
    echo "  Stop app:       cd $APP_PATH && docker compose down"
    echo "  Start app:      cd $APP_PATH && docker compose up -d"
    echo "  View status:    cd $APP_PATH && docker compose ps"
    echo ""
    echo -e "${YELLOW}Service Management:${NC}"
    echo "  sudo systemctl start eqap"
    echo "  sudo systemctl stop eqap"
    echo "  sudo systemctl restart eqap"
    echo "  sudo systemctl status eqap"
    echo ""
}

# Main function
main() {
    print_header
    
    check_root
    update_system
    install_docker
    install_docker_compose
    create_directories
    clone_repository
    create_env_file
    start_containers
    
    # Wait for containers to be fully up
    sleep 10
    
    wait_for_db
    run_migrations
    setup_firewall
    create_systemd_service
    show_status
}

# Run main function
main "$@"
