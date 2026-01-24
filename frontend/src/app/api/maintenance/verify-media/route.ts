import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const MEDIA_PATH = path.join(process.cwd(), 'data', 'media');

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

export async function POST() {
  try {
    const data = await retry(() => fs.readFile(DB_PATH, 'utf-8'));
    const db = JSON.parse(data);
    const bookmarks = db.bookmarks || [];

    const report = {
      total_bookmarks: bookmarks.length,
      total_media_references: 0,
      missing_files: [] as string[],
      orphan_files: [] as string[],
    };

    const referencedFiles = new Set<string>();

    for (const bookmark of bookmarks) {
      if (!bookmark.media) continue;
      for (const media of bookmark.media) {
        report.total_media_references++;
        if (media.file_name) {
          referencedFiles.add(media.file_name);
          try {
            await fs.access(path.join(MEDIA_PATH, media.file_name));
          } catch {
            report.missing_files.push(`${bookmark.id}: ${media.file_name}`);
          }
        }
      }
    }

    try {
      const files = await fs.readdir(MEDIA_PATH);
      for (const file of files) {
        if (!referencedFiles.has(file) && file !== '.gitkeep') {
          report.orphan_files.push(file);
        }
      }
    } catch (e) {
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Verify Media Error:', error);
    return NextResponse.json({ error: 'Failed to verify media' }, { status: 500 });
  }
}
