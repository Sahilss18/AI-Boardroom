import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';

export interface TextChunk {
  text: string;
  chunkIndex: number;
  metadata: {
    sourceName: string;
    pageNumber?: number;
    slideNumber?: number;
  };
}

export class DocumentParser {
  /**
   * Parses the file buffer based on extension and returns structured text chunks.
   */
  public static async parseAndChunk(
    fileName: string,
    buffer: Buffer,
    chunkSize: number = 1000,
    chunkOverlap: number = 200
  ): Promise<TextChunk[]> {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;

    if (ext === '.pdf') {
      const pages: string[] = [];
      const options = {
        pagerender: async (pageData: any) => {
          const textContent = await pageData.getTextContent();
          let lastY = 0;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          pages.push(text);
          return text;
        }
      };

      try {
        await pdf(buffer, options);
      } catch (err) {
        // Fallback to simpler parsing if pagerender fails
        const result = await pdf(buffer);
        pages.push(result.text);
      }

      for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i];
        const pageChunks = this.splitIntoChunks(pageText, chunkSize, chunkOverlap);
        for (const c of pageChunks) {
          chunks.push({
            text: c,
            chunkIndex: chunkIndex++,
            metadata: {
              sourceName: fileName,
              pageNumber: i + 1,
            }
          });
        }
      }
    } else if (ext === '.pptx') {
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files).filter(
        name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );

      // Sort numerically (e.g. slide1.xml, slide2.xml, slide10.xml)
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace(/[^\d]/g, ''), 10);
        const numB = parseInt(b.replace(/[^\d]/g, ''), 10);
        return numA - numB;
      });

      for (const file of slideFiles) {
        const content = await zip.files[file].async('text');
        const matches = content.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
        const slideText = matches.map(m => m.replace(/<[^>]*>/g, '')).join(' ');
        const slideNumber = parseInt(file.replace(/[^\d]/g, ''), 10);

        if (slideText.trim().length > 0) {
          const slideChunks = this.splitIntoChunks(slideText, chunkSize, chunkOverlap);
          for (const c of slideChunks) {
            chunks.push({
              text: c,
              chunkIndex: chunkIndex++,
              metadata: {
                sourceName: fileName,
                slideNumber,
              }
            });
          }
        }
      }
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      const docChunks = this.splitIntoChunks(result.value, chunkSize, chunkOverlap);
      for (const c of docChunks) {
        chunks.push({
          text: c,
          chunkIndex: chunkIndex++,
          metadata: {
            sourceName: fileName,
          }
        });
      }
    } else {
      // Default to plain text
      const text = buffer.toString('utf-8');
      const textChunks = this.splitIntoChunks(text, chunkSize, chunkOverlap);
      for (const c of textChunks) {
        chunks.push({
          text: c,
          chunkIndex: chunkIndex++,
          metadata: {
            sourceName: fileName,
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Splits a single string block into overlapping chunks of defined length.
   */
  private static splitIntoChunks(text: string, size: number, overlap: number): string[] {
    const result: string[] = [];
    if (!text || text.trim().length === 0) return result;

    const words = text.split(/\s+/);
    let currentChunkWords: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      currentChunkWords.push(word);
      currentLength += word.length + 1;

      if (currentLength >= size) {
        result.push(currentChunkWords.join(' '));
        
        // Handle overlap: keep last N words that approximate the overlap size
        let overlapLength = 0;
        const tempWords: string[] = [];
        for (let i = currentChunkWords.length - 1; i >= 0; i--) {
          const w = currentChunkWords[i];
          if (overlapLength + w.length + 1 <= overlap) {
            tempWords.unshift(w);
            overlapLength += w.length + 1;
          } else {
            break;
          }
        }
        currentChunkWords = tempWords;
        currentLength = overlapLength;
      }
    }

    if (currentChunkWords.length > 0) {
      result.push(currentChunkWords.join(' '));
    }

    return result;
  }
}
