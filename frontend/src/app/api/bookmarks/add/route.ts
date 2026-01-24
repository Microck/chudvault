import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request: Request) {
  try {
    const bookmark = await request.json();
    
    if (!bookmark.id || !bookmark.full_text) {
      return NextResponse.json({ error: 'Invalid bookmark data' }, { status: 400 });
    }

    const data = await retry(() => fs.readFile(DB_PATH, 'utf-8'));
    const db = JSON.parse(data);

    if (db.bookmarks.some((b: any) => b.id === bookmark.id)) {
      return NextResponse.json({ message: 'Bookmark already exists' }, { status: 200 });
    }

    const newBookmark = {
      ...bookmark,
      tags: bookmark.tags || [],
      media: bookmark.media || [],
      archived: false,
      created_at: bookmark.created_at || new Date().toISOString(),
    };

    db.bookmarks.push(newBookmark);

    await retry(() => fs.writeFile(DB_PATH, JSON.stringify(db, null, 2)));

    return NextResponse.json({ success: true, message: 'Bookmark added' });
  } catch (error) {
    console.error('API Add Bookmark Error:', error);
    return NextResponse.json({ error: 'Failed to add bookmark' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
