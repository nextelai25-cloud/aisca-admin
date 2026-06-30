const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'app/dashboard');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace ANY color: 'rgba(255, 255, 255, <number>)' with color: '#6B6B6B'
    content = content.replace(/color:\s*['"]rgba\(255,\s*255,\s*255,\s*[\d.]+\)['"]/g, "color: '#6B6B6B'");
    
    // Replace background/border 'rgba(255, 255, 255, <number>)'
    // For small opacities like 0.01 - 0.1, it's usually a subtle border or background, map to #E8E8E8
    content = content.replace(/background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.0[1-9]\)['"]/g, "background: '#FFFFFF'");
    content = content.replace(/background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.1[0-9]*\)['"]/g, "background: '#F9F9F9'");
    
    content = content.replace(/border:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-9]+['"]/g, "border: '1px solid #E8E8E8'");
    
    // Any other loose rgba(255,255,255,...) in style tags that we might have missed
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.[2-9]+\)/g, '#6B6B6B');
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.[0-1][0-9]*\)/g, '#E8E8E8');

    // Also look for tailwind text-white/50 etc.
    content = content.replace(/text-white\/\d+/g, 'text-gray-500');
    content = content.replace(/text-white/g, 'text-gray-900'); // be careful with this, but usually we want black text
    
    // Specific fix for Analytics blue boxes
    // The user said: "Traffic Velocity" / blue highlight boxes still showing errors
    content = content.replace(/background:\s*['"]rgba\(59,\s*130,\s*246,\s*0\.1\)['"]/g, "background: 'transparent'");
    content = content.replace(/color:\s*['"]#3B82F6['"]/g, "color: '#111111'");

    if (content !== original) {
      const tempPath = filePath + '.tmp';
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, filePath);
      console.log(`Updated contrast: ${filePath}`);
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
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

traverse(targetDir);
console.log('Contrast Migration 2 complete!');
