import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function getVxTwitterData(tweetUrl: string) {
  try {
    const urlObj = new URL(tweetUrl);
    const pathParts = urlObj.pathname.split('/');
    const statusIndex = pathParts.indexOf('status');
    if (statusIndex === -1) return null;
    
    const tweetId = pathParts[statusIndex + 1];
    const user = pathParts[statusIndex - 1]; 
    
    const apiUrl = `https://api.vxtwitter.com/Twitter/status/${tweetId}`;
    
    const res = await fetchWithTimeout(apiUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('VxTwitter fetch failed', e);
    return null;
  }
}

async function downloadMedia(url: string, filename: string) {
  try {
    const res = await fetchWithTimeout(url, 10000); 
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.mkdir(MEDIA_PATH, { recursive: true });
    await fs.writeFile(path.join(MEDIA_PATH, filename), buffer);
    return filename;
  } catch (e) {
    console.error(`Failed to download media: ${url}`, e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    let bookmark = input;

    if (input.url && !input.id) {
      const vxData = await getVxTwitterData(input.url);
      if (!vxData) {
        return NextResponse.json({ error: 'Failed to fetch tweet data' }, { status: 400 });
      }
      
      bookmark = {
        id: vxData.tweetID,
        full_text: vxData.text,
        created_at: new Date(vxData.date_epoch * 1000).toISOString(),
        screen_name: vxData.user_screen_name,
        name: vxData.user_name,
        profile_image_url: vxData.user_profile_image_url,
        url: vxData.tweetURL,
        favorite_count: vxData.likes,
        retweet_count: vxData.retweets,
        reply_count: vxData.replies,
        media: [],
        tags: []
      };

      if (vxData.media_extended && vxData.media_extended.length > 0) {
        const mediaPromises = vxData.media_extended.map(async (m: any, index: number) => {
          const type = m.type === 'video' || m.type === 'gif' ? 'video' : 'image';
          const ext = type === 'video' ? '.mp4' : '.jpg';
          const filename = `${vxData.user_screen_name}_${vxData.tweetID}_${type}_${index+1}${ext}`;
          
          await downloadMedia(m.url, filename);
          
          return {
            id: index + 1,
            tweet_id: vxData.tweetID,
            type: type,
            url: m.url,
            thumbnail: m.thumbnail_url || m.url,
            original: m.url,
            file_name: filename
          };
        });
        
        bookmark.media = await Promise.all(mediaPromises);
      }
    }
    
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
