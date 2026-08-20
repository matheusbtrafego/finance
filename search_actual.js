import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsx = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf-8');

const lines = appJsx.split('\n');
lines.forEach((l, i) => {
  if (l.includes('actual =') || l.includes('function actual') || l.includes('const actual')) {
    console.log(`[${i+1}] ${l}`);
  }
});
