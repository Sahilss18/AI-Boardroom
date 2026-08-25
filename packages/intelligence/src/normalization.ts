const TECH_MAP: Record<string, string> = {
  'mysql': 'MySQL',
  'mariadb': 'MariaDB',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'fastify': 'Fastify',
  'express': 'Express',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'react': 'React',
  'vue': 'Vue',
  'angular': 'Angular',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
};

const NUMBER_WORDS: Record<string, string> = {
  'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
  'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
};

export function normalizeText(text: string): string {
  if (!text) return '';
  let normalized = text.trim();
  
  // Check if it's a known technology name
  const lower = normalized.toLowerCase();
  if (TECH_MAP[lower]) {
    return TECH_MAP[lower];
  }
  
  // Normalize common number words
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, num);
  }
  
  // Normalize units (years, yrs)
  normalized = normalized.replace(/\b(yrs|years|yr)\b/gi, 'years');
  
  return normalized;
}

export interface NormalizedClaim {
  subject: string;
  predicate: string;
  object: string;
}

export function normalizeClaim(subject: string, predicate: string, object: string): NormalizedClaim {
  return {
    subject: normalizeText(subject),
    predicate: predicate.toLowerCase().trim(),
    object: normalizeText(object),
  };
}

export function cleanJsonText(text: string): string {
  let clean = text.trim();
  // Strip <think>...</think> blocks
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // If there are markdown code fences, extract the JSON block
  const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    clean = match[1].trim();
  }
  return clean;
}
