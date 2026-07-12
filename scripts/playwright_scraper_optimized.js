import dotenv from 'dotenv';
dotenv.config();

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YEARS = [2025, 2024, 2023];
const BATCH = '本科批';
const GENRE = '综合';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveRecords(records, province, schoolName, year) {
  const outputDir = path.join(__dirname, '..', 'data', province === '海南' ? 'hainan_scores' : 'tianjin_scores');
  ensureDir(outputDir);
  
  const fileName = `${schoolName}_${year}_专业分数线.json`;
  const filePath = path.join(output