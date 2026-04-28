#!/bin/bash
# HRMS Portal Deployment Fix Script
# Run this in Hostinger Terminal

echo "=========================================="
echo "HRMS Portal Deployment Fix"
echo "=========================================="

# Navigate to public_html
cd ~/domains/portal.realvibe.in/public_html
echo "Current directory: $(pwd)"

# Check files
echo ""
echo "=== Checking files ==="
ls -la | head -20

# Check if app exists
if [ -d "app" ]; then
    echo "✓ app/ folder exists"
else
    echo "✗ app/ folder MISSING!"
fi

if [ -d "components" ]; then
    echo "✓ components/ folder exists"
else
    echo "✗ components/ folder MISSING!"
fi

if [ -d "lib" ]; then
    echo "✓ lib/ folder exists"
else
    echo "✗ lib/ folder MISSING!"
fi

# Check schema
echo ""
echo "=== Checking Prisma Schema ==="
if grep -q 'sqlite' prisma/schema.prisma 2>/dev/null; then
    echo "Schema uses SQLite - replacing with MySQL..."
    cp prisma/schema.mysql.prisma prisma/schema.prisma
    echo "✓ Schema replaced with MySQL"
else
    echo "✓ Schema already uses MySQL"
fi

# Show schema
head -10 prisma/schema.prisma

# Navigate to nodejs for npm
echo ""
echo "=== Installing Dependencies ==="
cd ~/domains/portal.realvibe.in/nodejs

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "node_modules exists, running npm install..."
    npm install 2>&1 | tail -10
else
    echo "node_modules missing, running npm install..."
    npm install 2>&1 | tail -20
fi

# Generate Prisma
echo ""
echo "=== Generating Prisma Client ==="
npx prisma generate --schema=/home/u650869678/domains/portal.realvibe.in/public_html/prisma/schema.prisma 2>&1 | tail -10

# Check database
echo ""
echo "=== Checking Database ==="
mysql -u u650869678_hrms_user -p'u650869678_hrms_portal' -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='u650869678_hrms_portal';" u650869678_hrms_portal 2>/dev/null || echo "MySQL connection issue"

mysql -u u650869678_hrms_user -p'u650869678_hrms_portal' -e "SELECT email, role FROM users;" u650869678_hrms_portal 2>/dev/null || echo "Cannot query users"

# Fix permissions
echo ""
echo "=== Fixing Permissions ==="
chmod 755 ~/domains/portal.realvibe.in/public_html
find ~/domains/portal.realvibe.in/public_html -type d -exec chmod 755 {} \;
find ~/domains/portal.realvibe.in/public_html -type f -exec chmod 644 {} \;
echo "✓ Permissions fixed"

# Restart app
echo ""
echo "=== Restarting App ==="
touch ~/domains/portal.realvibe.in/nodejs/tmp/restart.txt
sleep 2
echo "✓ App restart triggered"

# Final check
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Now open: https://portal.realvibe.in/login"
echo "Email: care@realvibe.in"
echo "Password: Admin@123"
echo ""
