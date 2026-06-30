const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'app/dashboard');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Contrast Fixes
    content = content.replace(/rgba\(255,255,255,0\.4\)/g, '#6B6B6B');
    content = content.replace(/rgba\(255,255,255,0\.35\)/g, '#6B6B6B');
    content = content.replace(/rgba\(255,255,255,0\.1\)/g, '#E8E8E8');
    content = content.replace(/rgba\(255,255,255,0\.05\)/g, '#F5F5F5');
    content = content.replace(/rgba\(255,255,255,0\.03\)/g, '#FFFFFF');
    content = content.replace(/rgba\(255,255,255,0\.08\)/g, '#E8E8E8');
    
    // Only replace `#fff` if it's assigned to color, not background of a button
    content = content.replace(/color: '#fff'/g, 'color: \'#111111\'');
    content = content.replace(/color: 'white'/g, 'color: \'#111111\'');
    content = content.replace(/color: "white"/g, 'color: "#111111"');
    
    // Some specific cases:
    // In analytics/page.tsx: remove blue highlight box style on "Traffic Velocity" / "Firms / Form Factor" section headers
    // Old style: <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', borderRadius: '8px', fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
    content = content.replace(/<div style=\{\{ display: 'inline-block', padding: '6px 16px', background: 'rgba\(59, 130, 246, 0\.1\)', color: '#3B82F6', borderRadius: '8px', fontSize: '13px', fontWeight: '600', letterSpacing: '0\.05em', textTransform: 'uppercase', marginBottom: '16px' \}\}>/g, '<div style={{ fontSize: \'18px\', fontWeight: \'600\', color: \'#111111\', marginBottom: \'16px\' }}>');
    
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
    } else if (fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  }
}

traverse(targetDir);
console.log('Contrast Migration complete!');
