import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

function decodeHtml(str?: string | null): string | null {
  if (!str) return null;
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function main() {
  console.log('--- Starting Genium SQLite Database Seed ---');

  const jsonPath = path.resolve(__dirname, '../../ml/products_master.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Master product dataset not found at: ${jsonPath}`);
  }

  console.log(`Loading master product dataset from: ${jsonPath}`);
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(rawData);
  const products: any[] = parsed.products || [];

  console.log(`Found ${products.length} products in JSON payload.`);

  // Deduplicate and normalize products
  const uniqueProducts = new Map<string, any>();

  for (const item of products) {
    if (!item.reg_no || typeof item.reg_no !== 'string') continue;
    const normalizedRegNo = item.reg_no.trim().toUpperCase();
    if (!normalizedRegNo) continue;

    uniqueProducts.set(normalizedRegNo, {
      regNo: normalizedRegNo,
      name: decodeHtml(item.name) || 'Unknown Product',
      manufacturer: decodeHtml(item.manufacturer),
      category: decodeHtml(item.category) || 'General',
      description: decodeHtml(item.description),
      strength: decodeHtml(item.strength),
      dosageForm: decodeHtml(item.dosage_form),
      activeIngredient: decodeHtml(item.active_ingredient),
      masRequired: Boolean(item.mas_required),
      approvalDate: item.approval_date || null,
      expiryDate: item.expiry_date || null,
      status: item.status || 'Active',
      source: item.source || 'greenbook',
    });
  }

  const records = Array.from(uniqueProducts.values());
  console.log(`Deduplicated to ${records.length} unique products.`);

  // Clear existing product table
  console.log('Clearing existing product records...');
  await prisma.product.deleteMany({});

  // Batch insert into SQLite in chunks
  const CHUNK_SIZE = 500;
  console.log(`Inserting in chunks of ${CHUNK_SIZE}...`);

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    await prisma.product.createMany({
      data: chunk,
    });
    const count = Math.min(records.length, i + chunk.length);
    const percent = Math.round((count / records.length) * 100);
    process.stdout.write(`\rProgress: ${count} / ${records.length} (${percent}%)`);
  }

  console.log('\n--- Batch table ready (clean, 0 mock entries) ---');
  await prisma.batch.deleteMany({});

  const productCount = await prisma.product.count();
  const batchCount = await prisma.batch.count();

  console.log(`\nVerification successful:`);
  console.log(`- Products in SQLite: ${productCount}`);
  console.log(`- Batches in SQLite: ${batchCount}`);
  console.log('--- Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
