import { FileValidationResult } from './types';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes). Please upload a valid document.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of 5MB.`,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['txt', 'md', 'pdf', 'docx'];

  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file format (.${extension || 'unknown'}). Please upload .pdf, .docx, .txt, or .md files.`,
    };
  }

  return { valid: true };
}

export async function parseDocumentFile(file: File): Promise<string> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'txt' || extension === 'md') {
      const text = await file.text();
      if (!text || !text.trim()) {
        throw new Error('The text file contains no readable text content.');
      }
      return text.trim();
    }

    if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const mammothModule = await import('mammoth');
      const mammoth = mammothModule.default || mammothModule;
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extracted = result.value ? result.value.trim() : '';
      if (!extracted) {
        throw new Error('Could not extract readable text from DOCX file. The document may be empty or corrupted.');
      }
      return extracted;
    }

    if (extension === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      if (pdf.numPages === 0) {
        throw new Error('The PDF document contains no pages.');
      }

      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        fullText += pageStrings + '\n\n';
      }

      const trimmed = fullText.trim();
      if (!trimmed) {
        throw new Error('Could not extract text from PDF. It may contain scanned image pages requiring OCR, or be password protected.');
      }
      return trimmed;
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Could not extract')) {
      throw err;
    }
    throw new Error(`Failed to parse file: ${err.message || 'File may be corrupted or unreadable.'}`);
  }

  throw new Error('Unsupported file type.');
}

/**
 * Basic heuristic to detect non-English text for user notice
 */
export function isNonEnglish(text: string): boolean {
  if (!text || text.length < 50) return false;
  // Common English words check ratio
  const englishWords = ['the', 'and', 'to', 'of', 'a', 'in', 'is', 'that', 'for', 'this', 'shall', 'agree', 'party'];
  const sample = text.slice(0, 1000).toLowerCase();
  const words = sample.split(/\s+/);
  const matchCount = words.filter(w => englishWords.includes(w.replace(/[^a-z]/g, ''))).length;
  return matchCount / Math.max(words.length, 1) < 0.03;
}
