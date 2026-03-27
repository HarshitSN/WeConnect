import { BUSINESS_DESIGNATIONS, EMPLOYEE_RANGES, MOCK_ASSESSORS, NAICS_CODES, REVENUE_RANGES, UNSPSC_CODES, VISA_TYPES } from "@/lib/constants";

/**
 * Normalize text for fuzzy matching:
 * - lowercase
 * - replace hyphens/dashes with spaces (so "Women-Led" matches "women led")
 * - strip everything except letters, digits, spaces
 * - collapse whitespace
 */
function clean(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[-–—]/g, " ")           // hyphens → spaces (fixes "women-led" vs "women led")
    .replace(/[^a-z0-9\s]/g, " ")     // strip special chars
    .replace(/\s+/g, " ")
    .trim();
}

export function parseYesNo(input: string): boolean | null {
  const t = clean(input);
  if (!t) return null;
  if (/\b(not sure|don t know|dont know|maybe|depends)\b/.test(t)) return null;

  const yesPatterns = [
    /\b(yes|yeah|yup|yep|haan|ha|sure|correct|affirmative|absolutely|definitely|of course|right)\b/,
    /\byes it is\b/,
    /\bit is yes\b/,
    /\b(continue|go ahead|move on|next)\b/,
  ];
  const noPatterns = [
    /\b(no|nope|nah|nahi|negative)\b/,
    /\bnot really\b/,
    /\bnot at all\b/,
    /\bis not\b/,
    /\bisn t\b/,
    /\bno it is\b/,
    /\bnone\b/,
  ];

  const yesHit = yesPatterns.some((pattern) => pattern.test(t));
  const noHit = noPatterns.some((pattern) => pattern.test(t));
  if (yesHit && noHit) return null;
  if (yesHit) return true;
  if (noHit) return false;
  return null;
}

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function stripLeadingPhrases(input: string, phrases: string[]): string {
  let value = input.trim();
  for (const phrase of phrases) {
    const pattern = new RegExp(`^${phrase}\\s+`, "i");
    value = value.replace(pattern, "").trim();
  }
  return value;
}

function cleanupEntityValue(raw: string): string {
  return raw
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/^[\s,.:-]+|[\s,.:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBusinessName(input: string): string {
  const stripped = stripLeadingPhrases(input, [
    "it\\s*'?s\\s*called",
    "it\\s+is\\s+called",
    "called",
    "my\\s+registered\\s+business\\s+name\\s+is",
    "my\\s+business\\s+name\\s+is",
    "the\\s+registered\\s+business\\s+name\\s+is",
    "registered\\s+business\\s+name\\s+is",
    "business\\s+name\\s+is",
    "my\\s+business\\s+is",
    "our\\s+business\\s+is",
    "the\\s+business\\s+is",
    "the\\s+name\\s+is",
    "name\\s+is",
    "we\\s+are",
    "we\\s*'?re",
    "it\\s+is",
    "it\\s*'?s",
  ]);
  const cleaned = cleanupEntityValue(stripped);
  return toTitleCase(cleaned || input.trim());
}

export function normalizeOwnerName(input: string): string {
  let text = input.replace(/\b(?:gender|ownership|holds|owns|percent|percentage|%|male|female|man|woman|non\s*binary).*$/i, "");
  
  const stripped = stripLeadingPhrases(text, [
    "the\\s+full\\s+name\\s+is",
    "owner\\s+full\\s+name\\s+is",
    "my\\s+name\\s+is",
    "full\\s+name\\s+is",
    "his\\s+name\\s+is",
    "her\\s+name\\s+is",
    "their\\s+name\\s+is",
    "owner'?s\\s+name\\s+is",
    "owner\\s+name\\s+is",
    "the\\s+name\\s+is",
    "name\\s+is",
    "this\\s+is",
    "i\\s+am",
    "i\\s*'?m",
    "he\\s+is",
    "she\\s+is",
    "they\\s+are",
  ]);
  
  let cleaned = cleanupEntityValue(stripped);
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned
      .replace(/\b(?:and\s+(?:she'?s|he'?s|they'?re|their|her|his|the|a|an)|and)\s*$/ig, "")
      .replace(/\s+(?:the|is|are|a|an|ownership|holds|she'?s|he'?s|they'?re|her|his|their)\s*$/ig, "")
      .replace(/^(?:and|also)\s+|\s+(?:and|also)$/ig, "")
      .replace(/^,+|,+$/g, "")
      .replace(/[.]+$/g, "")
      .trim();
  } while (cleaned !== prev);
  return toTitleCase(cleaned || text.trim() || input.trim());
}

export function normalizeCountry(input: string): string {
  // Strip common leading phrases like "It's based in", "We are from", etc.
  const stripped = stripLeadingPhrases(input, [
    "it\\s*'?s\\s+based\\s+in",
    "it\\s+is\\s+based\\s+in",
    "we\\s+are\\s+based\\s+in",
    "we\\s*'?re\\s+based\\s+in",
    "based\\s+in",
    "we\\s+are\\s+from",
    "we\\s*'?re\\s+from",
    "i\\s+am\\s+from",
    "i\\s*'?m\\s+from",
    "from",
    "it\\s*'?s",
    "it\\s+is",
  ]);
  const cleaned = cleanupEntityValue(stripped);
  const value = cleaned || input.trim();
  const t = clean(value);
  if (["us", "usa", "u s", "u s a", "united states", "united states of america", "america"].includes(t)) {
    return "United States";
  }
  return toTitleCase(value);
}

export function isUSCountry(value: string): boolean {
  const t = clean(value);
  return t === "us" || t === "usa" || t === "united states" || t === "united states of america";
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function wordMatchScore(inputWords: string[], targetWord: string) {
  let maxScore = 0;
  for (const iw of inputWords) {
    if (iw === targetWord) return 1;
    const dist = levenshtein(iw, targetWord);
    const score = 1 - dist / Math.max(iw.length, targetWord.length);
    if (score > maxScore) maxScore = score;
  }
  return maxScore;
}

function findCodesByLabelOrCode(
  input: string,
  options: Array<{ code: string; label: string }>,
): string[] {
  const t = clean(input);
  const inputWords = t.split(/\s+/);
  const explicitCodes: string[] = t.match(/\b\d{2}(?:\s*\d{2})?\b|\b\d{8}\b/g) ?? [];
  const codeHits = options
    .filter((opt) => explicitCodes.includes(clean(opt.code)))
    .map((opt) => opt.code);

  const labelHits = options
    .filter((opt) => {
      const label = clean(opt.label);
      if (t.includes(label)) return true;
      
      const labelWords = label.split(/\s+/).filter((w: string) => w.length > 3);
      if (labelWords.length === 0) return false;
      
      let totalScore = 0;
      for (const lw of labelWords) {
        totalScore += wordMatchScore(inputWords, lw);
      }
      const avgScore = totalScore / labelWords.length;
      return avgScore > 0.65;
    })
    .map((opt) => opt.code);

  return Array.from(new Set([...codeHits, ...labelHits]));
}

export function parseNaicsCodes(input: string): string[] {
  return findCodesByLabelOrCode(input, NAICS_CODES);
}

export function parseUnspscCodes(input: string): string[] {
  return findCodesByLabelOrCode(input, UNSPSC_CODES);
}

/**
 * Fuzzy-match designations.
 * Handles spoken variants: "women led" matches "Women-Led Business",
 * "minority owned" matches "Minority-Owned Business", etc.
 */
export function parseDesignations(input: string): string[] {
  const t = clean(input);

  // direct matching against cleaned constants (hyphens already → spaces)
  const hits = BUSINESS_DESIGNATIONS.filter((d) => {
    const c = clean(d);
    // full match
    if (t.includes(c)) return true;
    // word-piece match: all significant words present
    if (c.split(" ").every((piece) => piece.length > 2 && t.includes(piece))) return true;
    return false;
  });

  // keyword fallback for common spoken phrases
  if (hits.length === 0) {
    const aliases: Array<{ pattern: RegExp; designation: string }> = [
      { pattern: /\b(small\s*business)\b/, designation: "Small Business" },
      { pattern: /\b(wom[ae]n\s*led)\b/, designation: "Women-Led Business" },
      { pattern: /\b(wom[ae]n\s*managed)\b/, designation: "Women-Managed Business" },
      { pattern: /\b(minority\s*owned)\b/, designation: "Minority-Owned Business" },
      { pattern: /\b(lgbtq|lgbt)\b/, designation: "LGBTQ+-Owned Business" },
      { pattern: /\b(veteran\s*owned)\b/, designation: "Veteran-Owned Business" },
      { pattern: /\b(disability\s*owned|disabled\s*owned)\b/, designation: "Disability-Owned Business" },
    ];

    for (const alias of aliases) {
      if (alias.pattern.test(t)) {
        hits.push(alias.designation);
      }
    }
  }

  return Array.from(new Set(hits));
}

export function parseVisaType(input: string): string | null {
  const t = clean(input);
  for (const visa of VISA_TYPES) {
    if (t.includes(clean(visa))) return visa;
  }
  if (t.includes("other")) return "Other";
  return null;
}

/**
 * Parse gender with common STT mishearings.
 * "mail" → male, "femail" → female, etc.
 */
export function parseGender(input: string): "female" | "male" | "non_binary" | "other" | null {
  const t = clean(input);
  if (t.includes("female") || t.includes("femail") || t === "woman" || t === "women") return "female";
  if (t.includes("non binary") || t.includes("nonbinary") || t.includes("non-binary")) return "non_binary";
  // check male AFTER female/non_binary to avoid "female" matching "male"
  if (t.includes("male") || t === "mail" || t === "man" || t === "men" || /\b(i am|i m|i'm)\s*(a\s+)?mal/.test(t) || /\bsaying\s+mal/.test(t)) return "male";
  if (t.includes("other")) return "other";
  return null;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100
};

export function parsePercent(input: string): number | null {
  const t = clean(input);
  const match = t.match(/\d{1,3}(?:\.\d+)?/);
  if (match) {
    const value = Number(match[0]);
    if (!Number.isNaN(value) && value > 0 && value <= 100) return value;
  }

  const words = t.split(/\s+/);
  let accumulated = 0;
  let current = 0;
  let foundNumber = false;

  for (const word of words) {
    if (NUMBER_WORDS[word] !== undefined) {
      foundNumber = true;
      const num = NUMBER_WORDS[word];
      if (num === 100) {
        if (current === 0) current = 1;
        current *= 100;
        accumulated += current;
        current = 0;
      } else {
        current += num;
      }
    }
  }

  const finalVal = accumulated + current;
  if (foundNumber && finalVal > 0 && finalVal <= 100) return finalVal;
  return null;
}

export function parseOwnerDetails(input: string): { name: string; gender: "female" | "male" | "non_binary" | "other" | null; percent: number | null } {
  const gender = parseGender(input);
  const percent = parsePercent(input);
  
  let remainder = input
    .replace(/\b(?:and\s+)?(?:her|his|their)?\s*(?:gender|sex)\s*(?:is|:)?\s*(?:female|male|non[\s-]*binary|other|mail|femail|man|woman|men|women)\b/ig, " ")
    .replace(/\b(?:ownership|ownership\s+percentage)\s*(?:is|:)?\s*\d{1,3}(?:\.\d+)?\s*%?\b/ig, " ")
    .replace(/\b(?:ownership|holds?|owns?)\b[^,.!?]*(?:percent|percentage|%)\b/ig, " ");
  
  if (gender) {
    const gword = gender === "non_binary" ? "non binary" : gender;
    remainder = remainder.replace(new RegExp(`\\b${gword}\\b`, "ig"), "");
    remainder = remainder.replace(/\b(mail|femail|man|woman|men|women|male|female)\b/ig, "");
  }
  
  if (percent !== null) {
    remainder = remainder.replace(new RegExp(`\\b${percent}\\b`, "ig"), "");
    Object.keys(NUMBER_WORDS).forEach(w => {
      remainder = remainder.replace(new RegExp(`\\b${w}\\b`, "ig"), "");
    });
    remainder = remainder.replace(/\b(percent|percentage|%)\b/ig, "");
  }

  const name = normalizeOwnerName(remainder.trim());
  return { name, gender, percent };
}

/**
 * Parse employee range with natural speech variants.
 * "1000 plus" → "1000+", "one to ten" → "1-10", "eleven to fifty" → "11-50", etc.
 */
export function parseEmployeeRange(input: string): string | null {
  const t = clean(input);

  // direct match first
  const direct = EMPLOYEE_RANGES.find((r) => t.includes(clean(r)));
  if (direct) return direct;

  // handle spoken variants
  const spokenMap: Array<{ patterns: RegExp[]; range: string }> = [
    { patterns: [/\b1\s*(to|two)\s*10\b/, /\bone\s+(to|two)\s+ten\b/, /\b1\s*-\s*10\b/], range: "1-10" },
    { patterns: [/\b11\s*to\s*50\b/, /\beleven\s+to\s+fifty\b/, /\b11\s*-\s*50\b/], range: "11-50" },
    { patterns: [/\b51\s*to\s*200\b/, /\bfifty\s*one\s+to\s+two\s+hundred\b/, /\b51\s*-\s*200\b/], range: "51-200" },
    { patterns: [/\b201\s*to\s*500\b/, /\btwo\s+hundred\s*(and\s+)?one\s+to\s+five\s+hundred\b/], range: "201-500" },
    { patterns: [/\b501\s*to\s*1000\b/, /\bfive\s+hundred\s*(and\s+)?one\s+to\s+(one\s+)?thousand\b/], range: "501-1000" },
    { patterns: [/\b1000\s*plus\b/, /\b1000\s*\+/, /\bthousand\s*plus\b/, /\bmore\s+than\s+(a\s+)?thousand\b/, /\bover\s+(a\s+)?thousand\b/, /\babove\s+1000\b/], range: "1000+" },
  ];

  for (const entry of spokenMap) {
    for (const pattern of entry.patterns) {
      if (pattern.test(t)) return entry.range;
    }
  }

  return null;
}

/**
 * Parse revenue range with spoken variants.
 * Handles "$", "dollars", "k", "million" etc.
 */
export function parseRevenueRange(input: string): string | null {
  const t = clean(input);

  // direct match
  const direct = REVENUE_RANGES.find((r) => t.includes(clean(r)));
  if (direct) return direct;

  // spoken variants
  const spokenMap: Array<{ patterns: RegExp[]; range: string }> = [
    { patterns: [/\bunder\s+(a\s+)?hundred\s*(k|thousand)\b/, /\bless\s+than\s+(a\s+)?hundred\s*(k|thousand)\b/, /\bbelow\s+100\s*k\b/], range: "Under $100K" },
    { patterns: [/\b100\s*k?\s*(to|through)\s*500\s*k\b/, /\bhundred\s*(k|thousand)\s*(to|through)\s*five\s+hundred\s*(k|thousand)\b/], range: "$100K–$500K" },
    { patterns: [/\b500\s*k?\s*(to|through)\s*1\s*m\b/, /\bfive\s+hundred\s*(k|thousand)\s*(to|through)\s*(one\s+)?million\b/, /\bhalf\s+a?\s*million\s*(to|through)\s*(one\s+)?million\b/], range: "$500K–$1M" },
    { patterns: [/\b1\s*m?\s*(to|through)\s*5\s*m\b/, /\b(one\s+)?million\s*(to|through)\s*five\s+million\b/], range: "$1M–$5M" },
    { patterns: [/\b5\s*m?\s*(to|through)\s*25\s*m\b/, /\bfive\s+million\s*(to|through)\s*twenty\s*five\s+million\b/], range: "$5M–$25M" },
    { patterns: [/\b25\s*m?\s*plus\b/, /\bover\s+25\s*m\b/, /\babove\s+25\s*m\b/, /\bmore\s+than\s+25\s*million\b/, /\btwenty\s*five\s+million\s+plus\b/], range: "$25M+" },
  ];

  for (const entry of spokenMap) {
    for (const pattern of entry.patterns) {
      if (pattern.test(t)) return entry.range;
    }
  }

  return null;
}

export function parseCertType(input: string): "self" | "digital" | null {
  const t = clean(input);
  if (t.includes("digital")) return "digital";
  if (t.includes("self")) return "self";
  return null;
}

export function parseAssessorId(input: string): string | null {
  const t = clean(input);
  if (t.includes("skip") || t.includes("none") || t.includes("no assessor")) return "";
  const inputWords = t.split(/\s+/);
  const match = MOCK_ASSESSORS.find((a) => {
    const [baseName] = a.name.split(",");
    const cleanedBaseName = clean(baseName);
    if (t.includes(cleanedBaseName)) return true;
    const nameParts = cleanedBaseName.split(" ").filter(Boolean);
    return nameParts.every((part) => {
      if (part.length <= 2) return true;
      return t.includes(part) || wordMatchScore(inputWords, part) >= 0.7;
    });
  });
  return match?.id ?? null;
}
