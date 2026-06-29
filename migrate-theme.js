const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'app/dashboard');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Colors
    content = content.replace(/bg-\[\#0b0b0b\]/g, 'bg-[#FFFFFF]');
    content = content.replace(/bg-\[\#121212\]/g, 'bg-[#F9F9F9]');
    content = content.replace(/border-white\/5/g, 'border-[#E8E8E8]');
    content = content.replace(/border-white\/10/g, 'border-[#E8E8E8]');
    content = content.replace(/border-white\/20/g, 'border-[#D1D5DB]');
    content = content.replace(/text-white/g, 'text-[#111111]');
    content = content.replace(/text-gray-400/g, 'text-[#6B6B6B]');
    content = content.replace(/text-gray-500/g, 'text-[#6B6B6B]');
    content = content.replace(/text-gray-300/g, 'text-[#111111]');
    content = content.replace(/bg-white\/5/g, 'bg-[#F5F5F5]');
    content = content.replace(/bg-white\/10/g, 'bg-[#E8E8E8]');
    content = content.replace(/bg-white\/\[0\.01\]/g, 'bg-[#FAFAFA]');
    content = content.replace(/bg-white\/\[0\.005\]/g, 'bg-[#FAFAFA]');
    content = content.replace(/divide-white\/5/g, 'divide-[#E8E8E8]');
    content = content.replace(/hover:bg-white\/10/g, 'hover:bg-[#E8E8E8]');
    content = content.replace(/hover:bg-white\/\[0\.01\]/g, 'hover:bg-[#F5F5F5]');
    content = content.replace(/hover:text-white/g, 'hover:text-[#111111]');
    content = content.replace(/placeholder-gray-500/g, 'placeholder-[#A3A3A3]');
    content = content.replace(/placeholder-gray-600/g, 'placeholder-[#A3A3A3]');

    if (content !== original) {
      const tempPath = filePath + '.tmp';
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, filePath);
      console.log(`Updated: ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to process ${filePath}:`, err.message);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('finance')) {
      replaceInFile(fullPath);
    }
  }
}

traverse(targetDir);
console.log('Migration complete!');
