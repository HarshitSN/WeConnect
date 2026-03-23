import { BUSINESS_DESIGNATIONS, EMPLOYEE_RANGES, MOCK_ASSESSORS, NAICS_CODES, REVENUE_RANGES, UNSPSC_CODES, VISA_TYPES } from "@/lib/constants";

function clean(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s+\-]/g, " ").replace(/\s+/g, " ");
}

export function parseYesNo(input: string): boolean | null {
  const t = clean(input);
  if (!t) return null;
  if (/\b(not sure|don t know|dont know|maybe|depends)\b/.test(t)) return null;

  const yesPatterns = [
    /\b(yes|yeah|yup|haan|ha|sure|correct|affirmative|absolutely|definitely)\b/,
    /\byes it is\b/,
    /\bit is yes\b/,
  ];
  const noPatterns = [
    /\b(no|nope|nah|nahi|negative)\b/,
    /\bnot really\b/,
    /\bnot at all\b/,
    /\bis not\b/,
    /\bisn t\b/,
    /\bno it is\b/,
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
    .replace(/^[\s,:-]+|[\s,:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBusinessName(input: string): string {
  const stripped = stripLeadingPhrases(input, [
    "it\\s*'?s\\s*called",
    "it\\s+is\\s+called",
    "called",
    "my\\s+business\\s+name\\s+is",
    "business\\s+name\\s+is",
    "my\\s+business\\s+is",
    "our\\s+business\\s+is",
    "the\\s+business\\s+is",
    "we\\s+are",
    "we\\s*'?re",
  ]);
  const cleaned = cleanupEntityValue(stripped);
  return toTitleCase(cleaned || input.trim());
}

export function normalizeOwnerName(input: string): string {
  const stripped = stripLeadingPhrases(input, [
    "my\\s+name\\s+is",
    "owner\\s+name\\s+is",
    "this\\s+is",
    "i\\s+am",
    "i\\s*'?m",
  ]);
  const cleaned = cleanupEntityValue(stripped);
  return toTitleCase(cleaned || input.trim());
}

export function normalizeCountry(input: string): string {
  const t = clean(input);
  if (["us", "usa", "u s", "u s a", "united states", "united states of america", "america"].includes(t)) {
    return "United States";
  }
  return input.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isUSCountry(value: string): boolean {
  const t = clean(value);
  return t === "us" || t === "usa" || t === "united states" || t === "united states of america";
}

function findCodesByLabelOrCode(
  input: string,
  options: Array<{ code: string; label: string }>,
): string[] {
  const t = clean(input);
  const explicitCodes: string[] = t.match(/\b\d{2}(?:-\d{2})?\b|\b\d{8}\b/g) ?? [];
  const codeHits = options
    .filter((opt) => explicitCodes.includes(opt.code.toLowerCase()))
    .map((opt) => opt.code);

  const labelHits = options
    .filter((opt) => {
      const label = clean(opt.label);
      return t.includes(label) || label.split(" ").every((piece) => piece.length > 2 && t.includes(piece));
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

export function parseDesignations(input: string): string[] {
  const t = clean(input);
  const hits = BUSINESS_DESIGNATIONS.filter((d) => {
    const c = clean(d);
    return t.includes(c) || c.split(" ").every((piece) => piece.length > 2 && t.includes(piece));
  });
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

export function parseGender(input: string): "female" | "male" | "non_binary" | "other" | null {
  const t = clean(input);
  if (t.includes("female") || t === "woman" || t === "women") return "female";
  if (t.includes("male") || t === "man" || t === "men") return "male";
  if (t.includes("non binary") || t.includes("nonbinary")) return "non_binary";
  if (t.includes("other")) return "other";
  return null;
}

export function parsePercent(input: string): number | null {
  const match = input.match(/\d{1,3}(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (Number.isNaN(value) || value <= 0 || value > 100) return null;
  return value;
}

export function parseEmployeeRange(input: string): string | null {
  const t = clean(input);
  return EMPLOYEE_RANGES.find((r) => t.includes(clean(r))) ?? null;
}

export function parseRevenueRange(input: string): string | null {
  const t = clean(input);
  return REVENUE_RANGES.find((r) => t.includes(clean(r))) ?? null;
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
  const match = MOCK_ASSESSORS.find((a) => {
    const name = clean(a.name);
    return t.includes(name) || name.split(" ").filter(Boolean).every((part) => part.length > 2 && t.includes(part));
  });
  return match?.id ?? null;
}
