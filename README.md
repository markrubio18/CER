![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/markrubio18/CER?utm_source=oss&utm_medium=github&utm_campaign=markrubio18%2FCER&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

# 🏢 Enterprise Certificate Authority Management System

An enterprise-grade subordinate CA manager to issue, renew, revoke, and export certificates; manage CRLs; audit all actions; send notifications; and provide real-time updates. Built with Next.js 15, TypeScript, Prisma, Tailwind + shadcn/ui, and Socket.IO.

## ✨ Core Features

### 🔐 Certificate Management
- **CA Lifecycle**: Initialize CA, generate CSR, upload signed CA certificate, track validity and status
- **Certificate Operations**: Issue, renew, revoke; export (PEM/DER/PKCS#12); SANs support (DNS, IP, wildcards); algorithms (RSA/ECDSA/Ed25519)
- **Certificate Validation**: Comprehensive validation with chain verification, OCSP checking, and extension validation
- **Multi-CA Support**: Manage multiple certificate authorities

### 🔄 Revocation & Status
- **CRLs**: Generate, validate, download full and delta CRLs with numbering and extensions
- **OCSP Responder**: Real-time certificate status checking with RSA-signed responses
- **CRL Distribution Points**: Automatic inclusion in issued certificates
- **Authority Information Access**: OCSP and CA Issuers URLs in certificates

### 🔒 Security & Compliance
- **Audit**: Detailed audit trail for security and compliance
- **RBAC**: Roles (Admin/Operator/Viewer) gate all actions
- **Security**: AES-256 at-rest encryption, bcrypt, strict headers, rate limits, CSP
- **X.509 Compliance**: Enterprise PKI standards with proper extensions

### 📢 Notifications & Monitoring
- **Notifications**: Email/webhook settings and delivery history (expiry, CRL updates, alerts)
- **Webhook Delivery**: Comprehensive webhook delivery tracking with retry logic
- **Real-time**: Socket.IO at `/api/socketio` for live updates
- **Logging**: Structured logging with file rotation and service-specific loggers

## 🛠️ Tech Stack

- **Frontend**: Next.js App Router, React 19, Tailwind 4, shadcn/ui
- **Backend**: Next.js route handlers, custom server (`server.ts`) + Socket.IO
- **Database**: Prisma with SQLite (dev) and PostgreSQL (prod via Docker)
- **Auth**: NextAuth.js (credentials), sessions + JWT
- **Tooling**: Jest, ESLint, TypeScript, Nodemon/tsx

## 🚀 Getting Started

This guide provides a linear, step-by-step process for setting up a local development environment using SQLite.

### **🚀 Quick Start (For Experienced Developers)**
```bash
# Clone and setup
git clone <your-repo-url> && cd CER

# Create missing env.sqlite if it doesn't exist
[ ! -f env.sqlite ] && cp env.example env.sqlite

# Setup environment and start
cp env.sqlite .env && mkdir -p db logs
npm install && npx prisma generate && npx prisma db push
export ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 && node create-admin.js
npm run dev
```

**Login**: admin/admin123 | **URL**: http://localhost:3000

### **1. Clone the Repository**
```bash
git clone <your-repo-url>
cd CER
```

### **2. Configure the Environment**
**CRITICAL**: The `env.sqlite` file is required for development but may be missing from the main branch. If it doesn't exist, create it first:

```bash
# Check if env.sqlite exists
ls -la env.sqlite

# If it doesn't exist, create it from env.example
cp env.example env.sqlite
# Then edit env.sqlite to set DATABASE_URL="file:./db/custom.db"
```

Now copy the SQLite environment template to a new `.env` file:
```bash
cp env.sqlite .env
```

**Important**: Open the `.env` file and ensure the `DATABASE_URL` is set correctly. You should also change the default `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` for security.

### **3. Install Dependencies**
```bash
npm install
```

### **4. Set up the Database**
**IMPORTANT**: The Prisma schema is already configured for SQLite, so you don't need to copy any schema files.

Create the database directory and push the schema:
```bash
mkdir -p db logs
npx prisma generate
npx prisma db push
```

### **5. Create an Admin User**
Set your desired administrator credentials as environment variables and run the user creation script.
```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your_secure_password
node create-admin.js
```
*Note: You can unset these variables after the script runs with `unset ADMIN_USERNAME ADMIN_PASSWORD`.*

### **6. Set up the Root Certificate Authority (CA)**
Before you can issue certificates, you must create the initial root CA. A helper script is provided for this.
```bash
npx tsx init-ca.ts
```
This script will create a self-signed root CA and generate the first Certificate Revocation List (CRL). It only needs to be run once.

**Note**: If you see "An active CA already exists", that's fine - the system is already initialized.

### **7. Run the Application**
You can now start the development server.
```bash
npm run dev
```
The application will be available at `http://localhost:3000`. You can log in with the admin credentials you created in step 5.

## 📋 Environment Configuration

### **Prerequisites**
- **Development**: Node.js 18+, npm 8+, Git
- **Production**: Docker & Docker Compose

### **Environment Files**
- `env.sqlite` - Development environment (SQLite database) - **⚠️ May be missing from main branch**
- `env.docker` - Production environment (PostgreSQL via Docker)
- `env.postgresql` - PostgreSQL environment
- `env.example` - Template with all available options

**Note**: If `env.sqlite` is missing, create it from `env.example` and set `DATABASE_URL="file:./db/custom.db"`.

### **Required Environment Variables**
```bash
# Security (CRITICAL - Change these!)
NEXTAUTH_SECRET=your-strong-random-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Database
DATABASE_URL=file:./db/custom.db          # Development (SQLite)
DATABASE_URL=postgresql://...             # Production (PostgreSQL)

# CA Configuration
CA_COUNTRY=US
CA_STATE=California
CA_LOCALITY=San Francisco
CA_ORGANIZATION=Your Organization
CA_ORGANIZATIONAL_UNIT=IT Department
CA_COMMON_NAME=Your CA Name
CA_EMAIL=ca@yourdomain.com

# Security Settings
BCRYPT_ROUNDS=12
SESSION_MAX_AGE=86400
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# X.509/Revocation Settings
CA_PATH_LENGTH_CONSTRAINT=0
POLICY_REQUIRE_EXPLICIT=false
POLICY_INHIBIT_MAPPING=false
CRL_DISTRIBUTION_POINT=https://yourdomain.com/api/crl/download/latest
OCSP_URL=https://yourdomain.com/api/ocsp
CRL_PUBLICATION_ENDPOINTS=https://ha1.yourdomain.com/crl,https://ha2.yourdomain.com/crl

# Webhook Configuration
WEBHOOK_DEFAULT_TIMEOUT=10000
WEBHOOK_DEFAULT_RETRIES=3
WEBHOOK_DEFAULT_RETRY_DELAY=1000
WEBHOOK_MAX_RETRY_DELAY=30000
```

## 🔄 Environment Switching

### **Development → Production**
```bash
# Stop development server
npm run dev  # Ctrl+C to stop

# Copy production environment
cp env.docker .env

# Start with Docker
docker compose up --build
```

### **Production → Development**
```bash
# Stop Docker containers
docker compose down

# Copy development environment
cp env.sqlite .env

# Clean any production build artifacts
npm run clean

# Start development server
npm run dev
```

## 🛠️ Available Scripts

### **Development Scripts**
```bash
npm run dev              # Next.js dev server (port 3000)
npm run dev:custom       # Custom server with Socket.IO (port 3000)
npm run dev:debug        # Debug mode with verbose logging
npm run build           # Production build
npm run start           # Production custom server (port 3000)
npm run start:next      # Production standard server (port 3000)
npm run start:debug     # Production debug mode
```

### **Database Scripts**
```bash
npm run db:push:sqlite      # Push schema to SQLite
npm run db:push:postgresql  # Push schema to PostgreSQL
npm run db:studio:sqlite    # Open Prisma Studio (SQLite)
npm run db:studio:postgresql # Open Prisma Studio (PostgreSQL)
npm run db:generate         # Generate Prisma client
npm run db:migrate          # Run database migrations
npm run db:reset            # Reset database
```

### **Webhook Migration Scripts**
```bash
npm run migrate:webhook         # Migrate webhook schema (development)
npm run migrate:webhook:sqlite  # Migrate webhook schema (SQLite)
npm run migrate:webhook:postgresql # Migrate webhook schema (PostgreSQL)
```

### **Testing Scripts**
```bash
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:ci          # Run tests for CI
npm run test:debug       # Debug tests
npm run test:update      # Update test snapshots
npm run test:verbose     # Verbose test output
```

### **Docker Scripts**
```bash
npm run docker:build         # Build Docker image
npm run docker:run           # Run standalone container
npm run docker:compose       # Start with Docker Compose
npm run docker:compose:down  # Stop containers
npm run docker:compose:logs  # View container logs
```

### **Utility Scripts**
```bash
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix linting issues
npm run clean             # Clean build cache
npm run clean:all         # Clean all temporary files
npm run setup             # Setup SQLite environment
npm run setup:postgresql  # Setup PostgreSQL environment
npm run setup:sqlite      # Setup SQLite environment
```

## 🐳 Docker Deployment (Production)

### **Prerequisites for Production**
- Docker and Docker Compose installed
- PostgreSQL database (handled automatically by docker-compose.yml)
- Production environment variables configured

### **Standard Deployment** (Custom Server + Socket.IO)
```bash
# Build and start
docker compose up --build

# Run in background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

### **Production Environment Setup**
```bash
# Copy production environment
cp env.docker .env

# Edit .env with your production values:
# - Strong NEXTAUTH_SECRET and ENCRYPTION_KEY
# - Your domain names for CRL_DISTRIBUTION_POINT and OCSP_URL
# - Database credentials (already set in env.docker)

# Start production
docker compose up --build
```

### **Simple Deployment** (Standard Next.js Server - Recommended)
```bash
# Use simple configuration
docker compose -f docker-compose.simple.yml up --build

# Run in background
docker compose -f docker-compose.simple.yml up -d --build
```

### **Docker Configuration**
- **Port**: 3000 (exposed to host)
- **Database**: PostgreSQL with health checks
- **Environment**: Production mode with optimized settings
- **Health Check**: Available at `/api/health`

## 🔐 Security Configuration

### **First-Time Setup**
1. **Create Admin Account**: Visit `/auth/signin` → "Create Account"
2. **Configure CA**: Visit `/ca/setup` → Generate CSR → Sign with root CA → Upload
3. **Start Using**: Navigate to `/certificates/issue`, `/certificates`, `/crl`, `/audit`, `/users`

### **Security Best Practices**
- ✅ **Rotate Secrets**: Change `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` in production
- ✅ **Database Security**: Use strong passwords, enable TLS, restrict access
- ✅ **Environment Files**: Never commit `.env` files
- ✅ **Backup Strategy**: Regular database backups
- ✅ **Access Control**: Use RBAC roles (Admin/Operator/Viewer)
- ✅ **Webhook Security**: Use HTTPS endpoints and webhook signatures

## 📢 Webhook Notifications

### **Setup Webhook Notifications**
```bash
# 1. Run webhook migration (if not done)
npm run migrate:webhook:sqlite  # or postgresql

# 2. Configure webhook in UI
# Navigate to /notifications → Add Webhook

# 3. Test webhook endpoint
curl -X POST http://localhost:3000/api/notifications/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.example.com/webhook"}'
```

### **Webhook Configuration**
```typescript
{
  "url": "https://api.example.com/webhook",
  "timeout": 10000,
  "retries": 3,
  "secret": "your-webhook-secret"
}
```

### **Monitor Webhook Deliveries**
```bash
# View delivery history
curl http://localhost:3000/api/notifications/webhook-deliveries

# Retry failed delivery
curl -X POST http://localhost:3000/api/notifications/webhook-deliveries \
  -H "Content-Type: application/json" \
  -d '{"deliveryId": "webhook_delivery_id"}'
```

## 🔧 Troubleshooting

### **Missing Environment File (Most Common Issue)**
If you get errors about missing environment variables or the app won't start:

```bash
# Check if env.sqlite exists
ls -la env.sqlite

# If missing, create it from env.example
cp env.example env.sqlite

# Edit env.sqlite to set these critical values:
# DATABASE_URL="file:./db/custom.db"
# NEXTAUTH_SECRET="your-secret-here"
# ENCRYPTION_KEY="your-32-char-key"

# Then copy to .env
cp env.sqlite .env
```

### **Port Issues**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Check what's using the port
netstat -tulpn | grep 3000
```

### **Database Issues**
```bash
# Reset SQLite database
rm -f db/custom.db && npm run db:push:sqlite

# Check PostgreSQL connection
docker compose exec postgres pg_isready -U postgres
```

### **Build Issues**
```bash
# Clean build cache
rm -rf .next && npm run build

# Rebuild Docker images
docker system prune -a
docker compose build --no-cache
```

### **Docker Issues**
```bash
# Check container status
docker compose ps

# View detailed logs
docker compose logs ca-management

# Reset everything
docker compose down -v
docker system prune -f
```

### **Environment Issues**
```bash
# Check environment variables
docker compose exec ca-management env

# Verify .env file
cat .env | grep -E "(DATABASE_URL|NEXTAUTH_SECRET|ENCRYPTION_KEY)"
```

### **Webhook Issues**
```bash
# Check webhook deliveries
curl http://localhost:3000/api/notifications/webhook-deliveries

# Test webhook endpoint
curl -X POST http://localhost:3000/api/notifications/test-webhook \
  -d '{"url": "https://httpbin.org/post"}'

# Check webhook migration
npm run migrate:webhook:sqlite
```

## 📊 Health Checks

### **Application Health**
```bash
# Check if app is running
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": true,
    "auth": true,
    "notifications": true
  }
}
```

### **Database Health**
```bash
# SQLite
sqlite3 db/custom.db "SELECT 1;"

# PostgreSQL (Docker)
docker compose exec postgres psql -U postgres -d ca_management -c "SELECT 1;"
```

### **Webhook Health**
```bash
# Check webhook delivery status
curl http://localhost:3000/api/notifications/webhook-deliveries?status=failed

# Test webhook functionality
curl -X POST http://localhost:3000/api/notifications/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/post"}'
```

## 📁 Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── ca/            # CA management endpoints
│   │   ├── certificates/  # Certificate operations
│   │   ├── crl/           # CRL management
│   │   ├── ocsp/          # OCSP responder
│   │   ├── audit/         # Audit logging
│   │   ├── users/         # User management
│   │   ├── notifications/ # Notification system
│   │   ├── profile/       # User profile
│   │   └── health/        # Health checks
│   ├── auth/              # Authentication pages
│   ├── ca/                # CA management pages
│   ├── certificates/      # Certificate management pages
│   ├── crl/               # CRL management pages
│   ├── audit/             # Audit log pages
│   ├── users/             # User management pages
│   ├── notifications/     # Notification pages
│   ├── profile/           # User profile pages
│   ├── dashboard/         # Dashboard pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout.tsx         # Layout component
│   └── providers.tsx      # Context providers
├── lib/                   # Utility libraries
│   ├── auth.ts            # Authentication configuration
│   ├── ca.ts              # CA management logic
│   ├── crypto.ts          # Cryptographic utilities
│   ├── certificate-validation.ts # Certificate validation logic
│   ├── ocsp.ts            # OCSP responder implementation
│   ├── export.ts          # Certificate export utilities
│   ├── notifications.ts   # Notification system
│   ├── webhook-service.ts # Webhook delivery service
│   ├── logger.ts          # Structured logging
│   ├── log-rotation.ts    # Log rotation utilities
│   ├── init.ts            # System initialization
│   ├── security.ts        # Security middleware
│   ├── audit.ts           # Audit logging
│   ├── socket.ts          # Socket.IO setup
│   ├── utils.ts           # General utilities
│   └── db.ts              # Database client
├── hooks/                 # Custom React hooks
├── middleware.ts          # Request middleware
└── middleware-security.ts # Security middleware
```

## 📚 Additional Resources

### **Documentation**
- `WEBHOOK_IMPLEMENTATION.md` - Comprehensive webhook implementation guide
- `DOCKER_TROUBLESHOOTING.md` - Comprehensive Docker deployment guide
- `LOGGING.md` - Logging configuration and troubleshooting
- `test/README.md` - Testing framework documentation
- `test/INSTALL.md` - Test setup instructions

### **Configuration Files**
- `docker-compose.yml` - Standard Docker deployment
- `docker-compose.simple.yml` - Simple Docker deployment (recommended)
- `docker-compose.debug.yml` - Debug Docker deployment
- `Dockerfile` - Docker image configuration
- `jest.config.js` - Test configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `eslint.config.mjs` - ESLint configuration

### **Environment Templates**
- `env.sqlite` - SQLite development environment
- `env.docker` - Docker production environment
- `env.postgresql` - PostgreSQL environment
- `env.example` - Environment variables template

### **Scripts and Utilities**
- `scripts/migrate-webhook-schema.js` - Webhook schema migration
- `setup.sh` - Automated setup script
- `docker-troubleshoot.sh` - Docker troubleshooting script
- `create-admin.js` - Admin user creation script
- `init-system.js` - System initialization script

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support
- Create an issue in the repository
- Review the troubleshooting section above
- Check `DOCKER_TROUBLESHOOTING.md` for Docker-specific issues
- Check `WEBHOOK_IMPLEMENTATION.md` for webhook-specific issues

## 📄 License
This project is licensed under the MIT License. See the `LICENSE` file for details.
