const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const zip = new JSZip();

// Helper to recursively add files/directories with Unix permissions and LF line endings
function addFolderToZip(zipFolder, localPath) {
  const files = fs.readdirSync(localPath);
  for (const file of files) {
    const fullPath = path.join(localPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules, .git, .vercel, .next/cache
      if (file === 'node_modules' || file === '.git' || file === '.vercel' || file === 'cache') {
        continue;
      }
      
      const newZipFolder = zipFolder.folder(file, {
        dir: true,
        unixPermissions: 0o755
      });
      addFolderToZip(newZipFolder, fullPath);
    } else {
      let content = fs.readFileSync(fullPath);
      const fileOptions = {
        unixPermissions: 0o644
      };

      // Normalize line endings to LF for code & script files to avoid Unix execution errors
      const isTextFile = /\.(js|ts|tsx|css|json|sh|prisma|env)$/i.test(file) || file === '.env';
      if (isTextFile) {
        let contentStr = content.toString('utf8');
        contentStr = contentStr.replace(/\r\n/g, '\n');
        content = Buffer.from(contentStr, 'utf8');
      }

      // Mark shell scripts as executable
      if (file.endsWith('.sh')) {
        fileOptions.unixPermissions = 0o755;
      }

      zipFolder.file(file, content, fileOptions);
    }
  }
}

async function createZip() {
  console.log('Packaging Linux-compatible files for Hostinger...');
  
  // List of root level files/directories to include
  const filesToInclude = [
    '.next',
    'app',
    'components',
    'lib',
    'types',
    'prisma',
    'public',
    'package.json',
    'package-lock.json',
    'next.config.js',
    'postcss.config.js',
    'tailwind.config.ts',
    'tsconfig.json',
    'server.js',
    '.env',
    'deploy-fix.sh',
    'quick-fix.sh'
  ];

  for (const fileOrDir of filesToInclude) {
    const fullPath = path.join(__dirname, fileOrDir);
    if (!fs.existsSync(fullPath)) {
      console.log(`Skipping (not found): ${fileOrDir}`);
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const folder = zip.folder(fileOrDir, { dir: true, unixPermissions: 0o755 });
      addFolderToZip(folder, fullPath);
      console.log(`Added directory: ${fileOrDir}`);
    } else {
      let content = fs.readFileSync(fullPath);
      const fileOptions = {
        unixPermissions: 0o644
      };

      // Normalize text/config line endings
      const isTextFile = /\.(js|ts|tsx|css|json|sh|prisma|env)$/i.test(fileOrDir) || fileOrDir === '.env';
      if (isTextFile) {
        let contentStr = content.toString('utf8');
        contentStr = contentStr.replace(/\r\n/g, '\n');
        content = Buffer.from(contentStr, 'utf8');
      }

      if (fileOrDir.endsWith('.sh')) {
        fileOptions.unixPermissions = 0o755;
      }

      zip.file(fileOrDir, content, fileOptions);
      console.log(`Added file: ${fileOrDir}`);
    }
  }

  console.log('Generating ZIP archive with UNIX platform metadata...');
  const content = await zip.generateAsync({ 
    type: 'nodebuffer', 
    platform: 'UNIX', // CRITICAL: Tells the zip file structure to use Unix file permissions
    compression: 'DEFLATE', 
    compressionOptions: { level: 9 } 
  });
  
  const zipName = 'hrms-hostinger.zip';
  fs.writeFileSync(zipName, content);
  console.log(`\nSuccessfully created ${zipName} for Hostinger!`);
}

createZip().catch(console.error);
