#!/bin/bash
# SUPER SIMPLE FIX - Copy paste this ONE LINE at a time

echo "=== HRMS Portal Quick Fix ==="

# 1. Go to public_html
cd ~/domains/portal.realvibe.in/public_html
echo "Step 1: Changed to public_html"
pwd

# 2. Check files
echo ""
echo "Step 2: Checking files..."
ls -la | head -15

# 3. Check if app exists
echo ""
if [ -d "app" ]; then
    echo "✓ app folder found!"
    ls app/ | head -5
else
    echo "✗ app folder MISSING!"
fi

# 4. Check schema
echo ""
echo "Step 3: Checking schema..."
head -10 prisma/schema.prisma

# 5. If SQLite, replace
if grep -q "sqlite" prisma/schema.prisma 2>/dev/null; then
    echo ""
    echo "FIXING: Replacing SQLite with MySQL schema..."
    cp prisma/schema.mysql.prisma prisma/schema.prisma
    echo "✓ Schema fixed!"
fi

# 6. Go to nodejs and install
echo ""
echo "Step 4: Installing dependencies..."
cd ~/domains/portal.realvibe.in/nodejs
npm install 2>&1 | tail -5

# 7. Generate Prisma
echo ""
echo "Step 5: Generating Prisma..."
npx prisma generate --schema=/home/u650869678/domains/portal.realvibe.in/public_html/prisma/schema.prisma 2>&1 | tail -10

# 8. Fix permissions
echo ""
echo "Step 6: Fixing permissions..."
chmod 755 ~/domains/portal.realvibe.in/public_html
find ~/domains/portal.realvibe.in/public_html -type d -exec chmod 755 {} \;
find ~/domains/portal.realvibe.in/public_html -type f -exec chmod 644 {} \;
echo "✓ Permissions fixed!"

# 9. Restart
echo ""
echo "Step 7: Restarting app..."
touch ~/domains/portal.realvibe.in/nodejs/tmp/restart.txt
sleep 2
echo "✓ Restart triggered!"

# 10. Done!
echo ""
echo "=========================================="
echo "DONE! Now open: https://portal.realvibe.in/login"
echo "Email: care@realvibe.in"
echo "Password: Admin@123"
echo "=========================================="
