import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

async function retry<T>(operation: () => Promise<T>, retries = 5, delay = 50): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      if (error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'ELOCKED') {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Unreachable');
}

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    const initialData = {
      bookmarks: [],
      tags: [
        { id: 1, name: "To do", created_at: new Date().toISOString(), completed: false },
        { id: 2, name: "To read", created_at: new Date().toISOString(), completed: false }
      ],
      version: 1
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

export async function GET() {
  await ensureDb();
  try {
    const data = await retry(() => fs.readFile(DB_PATH, 'utf-8'));
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('API GET Error:', error);
    return NextResponse.json({ error: 'Failed to read DB' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await ensureDb();
    await retry(() => fs.writeFile(DB_PATH, JSON.stringify(body, null, 2)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API POST Error:', error);
    return NextResponse.json({ error: 'Failed to write DB' }, { status: 500 });
  }
}
