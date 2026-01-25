import { AISettings } from './settings';

export interface TagSuggestion {
  tags: string[];
  reasoning?: string;
}

export async function generateTags(
  text: string,
  settings: AISettings,
  existingTags: string[]
): Promise<TagSuggestion> {
  const prompt = `
    Analyze the following tweet content and suggest 3-5 relevant tags.
    Use existing tags if they match, otherwise suggest new ones.
    Output JSON only: { "tags": ["tag1", "tag2"], "reasoning": "brief reason" }

    Existing tags: ${existingTags.join(', ')}

    Tweet: "${text}"
  `;

  if (settings.provider === 'openai') {
    return callOpenAI(prompt, settings);
  } else if (settings.provider === 'anthropic') {
    return callAnthropic(prompt, settings);
  } else if (settings.provider === 'ollama') {
    return callOllama(prompt, settings);
  } else if (settings.provider === 'gemini') {
    return callGemini(prompt, settings);
  }

  throw new Error('Unsupported provider');
}

async function callOpenAI(prompt: string, settings: AISettings): Promise<TagSuggestion> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`OpenAI Error: ${res.statusText}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callAnthropic(prompt: string, settings: AISettings): Promise<TagSuggestion> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'dangerously-allow-browser': 'true', 
    },
    body: JSON.stringify({
      model: settings.model || 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic Error: ${res.statusText}`);
  const data = await res.json();
  const content = data.content[0].text;
  
  try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch (e) {
      console.warn('Failed to parse Anthropic JSON', content);
      return { tags: [] };
  }
}

async function callOllama(prompt: string, settings: AISettings): Promise<TagSuggestion> {
  const baseUrl = settings.baseUrl || 'http://localhost:11434';
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: settings.model || 'llama3',
      prompt: prompt + " Respond with JSON only.",
      stream: false,
      format: 'json',
    }),
  });

  if (!res.ok) throw new Error(`Ollama Error: ${res.statusText}`);
  const data = await res.json();
  return JSON.parse(data.response);
}

async function callGemini(prompt: string, settings: AISettings): Promise<TagSuggestion> {
  const model = settings.model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt + " Respond with valid JSON only, no markdown formatting." }]
      }]
    })
  });

  if (!res.ok) throw new Error(`Gemini Error: ${res.statusText}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) return { tags: [] };

  try {
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn('Failed to parse Gemini JSON', text);
    return { tags: [] };
  }
}
