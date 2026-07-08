const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');
c = c.replace(/(@relation\(fields:\s*\[(?:employeeId|userId|assignedTo)\],\s*references:\s*\[id\])\)/g, '$1, onDelete: Cascade)');
fs.writeFileSync('prisma/schema.prisma', c);
