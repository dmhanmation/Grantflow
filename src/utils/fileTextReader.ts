/**
 * Pure document text reader.
 * Extracts real text from uploaded files in the browser without any hardcoded sample data or fallbacks.
 * If no text is present in the document, returns an empty string so the caller marks fields as 'Needs Human Input'.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileNameLower = file.name.toLowerCase();

  // 1. Direct plain text files
  if (
    file.type.includes('text') ||
    file.type.includes('json') ||
    file.type.includes('csv') ||
    fileNameLower.endsWith('.txt') ||
    fileNameLower.endsWith('.md') ||
    fileNameLower.endsWith('.json') ||
    fileNameLower.endsWith('.csv')
  ) {
    try {
      const text = await file.text();
      return text.trim();
    } catch (e) {
      console.warn('Failed to read text file:', e);
      return '';
    }
  }

  // 2. PDF File Stream Text Extraction
  if (file.type === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const rawString = new TextDecoder('latin1').decode(bytes);

      const extractedStrings: string[] = [];

      // Extract PDF literal strings: (Some Text) Tj
      const tjMatches = rawString.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g);
      for (const m of tjMatches) {
        if (m[1]) {
          const clean = unescapePdfString(m[1]);
          if (clean.trim()) extractedStrings.push(clean);
        }
      }

      // Extract PDF array strings: [(Some) 12 (Text)] TJ
      const arrayMatches = rawString.matchAll(/\[(.*?)\]\s*TJ/g);
      for (const m of arrayMatches) {
        if (m[1]) {
          const innerTjs = m[1].matchAll(/\(((?:[^()\\]|\\.)*)\)/g);
          const chunk: string[] = [];
          for (const it of innerTjs) {
            if (it[1]) chunk.push(unescapePdfString(it[1]));
          }
          if (chunk.length > 0) {
            extractedStrings.push(chunk.join(' '));
          }
        }
      }

      // Extract text inside BT ... ET blocks
      const textStreams = rawString.matchAll(/BT\s+([\s\S]*?)\s+ET/g);
      for (const s of textStreams) {
        if (s[1]) {
          const lines = s[1].matchAll(/\(((?:[^()\\]|\\.)*)\)/g);
          for (const l of lines) {
            if (l[1]) {
              const str = unescapePdfString(l[1]);
              if (str && !extractedStrings.includes(str)) {
                extractedStrings.push(str);
              }
            }
          }
        }
      }

      if (extractedStrings.length > 0) {
        const text = extractedStrings.join('\n').trim();
        if (text.length > 10) {
          return text;
        }
      }

      // If client-side stream parser found no embedded text (e.g. scanned image PDF),
      // call server-side multimodal OCR endpoint if available
      try {
        const base64Data = await fileToBase64(file);
        const serverRes = await fetch('/api/extract-document-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            base64Data
          })
        });
        if (serverRes.ok) {
          const serverJson = await serverRes.json();
          if (serverJson.extractedText && serverJson.extractedText.trim().length > 0) {
            return serverJson.extractedText.trim();
          }
        }
      } catch (err) {
        // Server OCR unavailable or failed
        console.warn('Server-side document OCR unavailable:', err);
      }
    } catch (e) {
      console.warn('PDF stream extraction encountered an error:', e);
    }
  }

  // 3. Fallback: return empty string so caller leaves fields unpopulated and marks as 'Needs Human Input'
  return '';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}
