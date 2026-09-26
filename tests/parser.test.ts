import { describe, it, expect } from 'vitest';
import { validateFile, MAX_FILE_SIZE_BYTES, isNonEnglish } from '../src/lib/parser';

describe('parser validation & edge cases', () => {
  it('should accept valid pdf, docx, txt, md files under 5MB', () => {
    const fileTxt = new File(['sample content'], 'doc.txt', { type: 'text/plain' });
    const filePdf = new File(['sample pdf'], 'contract.pdf', { type: 'application/pdf' });

    expect(validateFile(fileTxt).valid).toBe(true);
    expect(validateFile(filePdf).valid).toBe(true);
  });

  it('should reject zero-byte empty files', () => {
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });
    const result = validateFile(emptyFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('0 bytes');
  });

  it('should reject files exceeding 5MB', () => {
    const oversizedContent = new ArrayBuffer(MAX_FILE_SIZE_BYTES + 100);
    const fileLarge = new File([oversizedContent], 'large.pdf', { type: 'application/pdf' });

    const result = validateFile(fileLarge);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed limit of 5MB');
  });

  it('should reject unsupported file extensions', () => {
    const fileExe = new File(['malicious'], 'program.exe', { type: 'application/x-msdownload' });
    const result = validateFile(fileExe);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file format (.exe)');
  });

  it('should detect non-English text heuristic', () => {
    const englishText = 'This Agreement is entered into between Landlord and Tenant to lease the property on the specified date.';
    const foreignText = 'Este es un contrato de arrendamiento escrito en español sin palabras en inglés para probar la detección.';

    expect(isNonEnglish(englishText)).toBe(false);
    expect(isNonEnglish(foreignText)).toBe(true);
  });
});
