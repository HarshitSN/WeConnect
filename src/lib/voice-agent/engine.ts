import { MOCK_ASSESSORS, NAICS_CODES, UNSPSC_CODES } from "@/lib/constants";
import type { AgentParseResult, ConversationPointer, ConversationStepId, OwnershipEntry, RegistrationState } from "@/types";
import {
  isUSCountry,
  normalizeBusinessName,
  normalizeCountry,
  normalizeOwnerName,
  parseAssessorId,
  parseCertType,
  parseDesignations,
  parseEmployeeRange,
  parseGender,
  parseNaicsCodes,
  parseOwnerDetails,
  parsePercent,
  parseRevenueRange,
  parseUnspscCodes,
  parseVisaType,
  parseYesNo,
} from "@/lib/voice-agent/normalizers";

export interface ParseStepRuntimeMeta {
  stepRetryCounts?: Partial<Record<ConversationStepId, number>>;
}

export function getNextQuestion(pointer: ConversationPointer, state: RegistrationState): string {
  const total = state.ownership_structure.reduce((sum, e) => sum + Number(e.percent || 0), 0);
  const ownerIndex = pointer.ownerIndex ?? 0;
  switch (pointer.stepId) {
    case "business_name":
      return "Let's get started! What's your registered business name?";
    case "women_owned":
      return "Great — is your business at least 51 percent owned by women?";
    case "country":
      return "Which country is your business based in?";
    case "us_citizen":
      return "Quick question — are you a US citizen or green card holder?";
    case "visa_type":
      return "Got it. What's your visa type? For example H-1B, L-1, O-1, E-2, TN, F-1 OPT, or other.";
    case "webank_certified":
      return "Are you certified by WEBank?";
    case "naics_codes":
      return "Now let's talk industry! Tell me your NAICS industry code or name. You can give multiple.";
    case "unspsc_codes":
      return "What about UNSPSC categories? Tell me the code or name — multiple are fine.";
    case "designations":
      return "Any business designations? Like Small Business, Women Led, Minority Owned, Veteran Owned — or just say none.";
    case "owner_details":
      return `Let's set up owner ${ownerIndex + 1}. What is their full name, gender, and ownership percentage?`;
    case "owner_add_more":
      return total < 100
        ? `We're at ${total} percent so far. Want to add another owner?`
        : "Ownership adds up to 100 percent — perfect! Ready to move on?";
    case "num_employees":
      return "Almost there! How many employees? Options: 1-10, 11-50, 51-200, 201-500, 501-1000, or 1000 plus.";
    case "revenue_range":
      return "What's your annual revenue range? Your options are: Under 100K, 100K to 500K, 500K to 1 million, 1 to 5 million, 5 to 25 million, or 25 million plus.";
    case "additional_certs":
      return "Do you hold any additional certifications? Say them, or just say none.";
    case "business_description":
      return "Tell me about your products or services — at least a sentence or two so we capture the essence.";
    case "cert_type":
      return "Last couple of steps! Which certification path would you like — self certification or digital certification?";
    case "assessor": {
      const names = MOCK_ASSESSORS.map((a) => a.name).join(", ");
      return `Would you like to pick an assessor? Your options are: ${names}. Or say skip.`;
    }
    case "done":
      return "You're all done! 🎉 Review the form below, finish payment, and hit submit.";
    default:
      return "Let's keep going!";
  }
}

export const SECTION_NAMES = ["Business", "Location", "Industry", "Ownership", "Profile", "Certification"] as const;

export function getSectionIndex(stepId: ConversationStepId): number {
  switch (stepId) {
    case "business_name":
    case "women_owned":
      return 0;
    case "country":
    case "us_citizen":
    case "visa_type":
    case "webank_certified":
      return 1;
    case "naics_codes":
    case "unspsc_codes":
    case "designations":
      return 2;
    case "owner_details":
    case "owner_add_more":
      return 3;
    case "num_employees":
    case "revenue_range":
    case "additional_certs":
    case "business_description":
      return 4;
    case "cert_type":
    case "assessor":
    case "done":
      return 5;
    default:
      return 0;
  }
}

export function initialPointer(): ConversationPointer {
  return { stepId: "business_name", ownerIndex: 0 };
}

function pointer(stepId: ConversationStepId, ownerIndex?: number): ConversationPointer {
  return { stepId, ownerIndex };
}

function nextAfterCountry(state: RegistrationState): ConversationPointer {
  return isUSCountry(state.country) ? pointer("us_citizen") : pointer("naics_codes");
}

function ownerTotal(entries: OwnershipEntry[]): number {
  return entries.reduce((sum, e) => sum + Number(e.percent || 0), 0);
}

function ensureOwner(entries: OwnershipEntry[], ownerIndex: number): OwnershipEntry[] {
  const next = [...entries];
  if (!next[ownerIndex]) {
    next[ownerIndex] = { name: "", gender: "female", percent: 0 };
  }
  return next;
}

export function parseStepAnswer(
  pointerState: ConversationPointer,
  answer: string,
  state: RegistrationState,
  runtimeMeta?: ParseStepRuntimeMeta,
): AgentParseResult {
  const step = pointerState.stepId;
  const ownerIndex = pointerState.ownerIndex ?? 0;
  const safeAnswer = answer.trim();
  const retryCount = runtimeMeta?.stepRetryCounts?.[step] ?? 0;

  if (!safeAnswer && step !== "additional_certs") {
    return {
      ok: false,
      confidence: 0,
      confirmation: "I could not hear a clear answer.",
      clarification: "Please answer again.",
      next: pointerState,
    };
  }

  switch (step) {
    case "business_name": {
      const businessName = normalizeBusinessName(safeAnswer);
      if (businessName.length < 2) {
        return { ok: false, confidence: 0.2, confirmation: "Business name seems too short.", clarification: "Please say your full registered business name.", next: pointer("business_name") };
      }
      const displayName = businessName.replace(/\.$/,"");
      return {
        ok: true,
        confidence: 0.95,
        updates: { business_name: businessName },
        confirmation: `Got it — ${displayName}! Let's keep going.`,
        next: pointer("women_owned"),
      };
    }
    case "women_owned": {
      const parsed = parseYesNo(safeAnswer);
      if (parsed === null) {
        return { ok: false, confidence: 0.3, confirmation: "I could not detect yes or no.", clarification: "Please say yes or no.", next: pointer("women_owned") };
      }
      return {
        ok: true,
        confidence: 0.92,
        updates: { women_owned: parsed },
        confirmation: parsed ? "Great, noted as women-owned!" : "Understood, noted.",
        next: pointer("country"),
      };
    }
    case "country": {
      const country = normalizeCountry(safeAnswer);
      const merged = { ...state, country };
      return {
        ok: true,
        confidence: 0.9,
        updates: { country },
        confirmation: `Perfect — ${country}!`,
        next: nextAfterCountry(merged),
      };
    }
    case "us_citizen": {
      const parsed = parseYesNo(safeAnswer);
      if (parsed === null) {
        return { ok: false, confidence: 0.3, confirmation: "I could not detect yes or no.", clarification: "Please answer yes or no for US citizen or green card holder.", next: pointer("us_citizen") };
      }
      return {
        ok: true,
        confidence: 0.9,
        updates: { us_citizen: parsed },
        confirmation: parsed ? "Got it — US citizen or green card holder!" : "Noted. Let's grab your visa info next.",
        next: parsed ? pointer("webank_certified") : pointer("visa_type"),
      };
    }
    case "visa_type": {
      const visa = parseVisaType(safeAnswer);
      if (!visa) {
        return { ok: false, confidence: 0.35, confirmation: "I could not map the visa type.", clarification: "Please say one of H-1B, L-1, O-1, E-2, TN, F-1 OPT, or other.", next: pointer("visa_type") };
      }
      return {
        ok: true,
        confidence: 0.86,
        updates: { visa_type: visa },
        confirmation: `${visa} — noted!`,
        next: pointer("webank_certified"),
      };
    }
    case "webank_certified": {
      const parsed = parseYesNo(safeAnswer);
      if (parsed === null) {
        return { ok: false, confidence: 0.3, confirmation: "I could not detect yes or no.", clarification: "Please answer yes or no for WEBank certification.", next: pointer("webank_certified") };
      }
      return {
        ok: true,
        confidence: 0.9,
        updates: { webank_certified: parsed },
        confirmation: parsed ? "Awesome, WEBank certified!" : "No WEBank certification noted. Moving on!",
        next: pointer("naics_codes"),
      };
    }
    case "naics_codes": {
      const codes = parseNaicsCodes(safeAnswer);
      if (!codes.length) {
        const shouldEscalate = retryCount >= 1;
        return {
          ok: false,
          confidence: shouldEscalate ? 0.2 : 0.25,
          confirmation: "I could not find a NAICS code from that response.",
          clarification: shouldEscalate
            ? "Try one of these now: say exactly 'NAICS 72', or say 'Accommodation and Food Services'. For pizza/restaurant businesses, 72 is commonly correct. I will only save it when you explicitly confirm the code or label."
            : "Please provide NAICS sector code or label, for example 72 - Accommodation and Food Services (common for pizza/restaurant businesses).",
          next: pointer("naics_codes"),
        };
      }
      return {
        ok: true,
        confidence: 0.78,
        updates: { naics_codes: Array.from(new Set([...(state.naics_codes ?? []), ...codes])) },
        confirmation: `Nice — added NAICS ${codes.join(", ")}!`,
        next: pointer("unspsc_codes"),
      };
    }
    case "unspsc_codes": {
      const codes = parseUnspscCodes(safeAnswer);
      if (!codes.length) {
        const shouldEscalate = retryCount >= 1;
        return {
          ok: false,
          confidence: shouldEscalate ? 0.2 : 0.25,
          confirmation: "I could not find a UNSPSC category from that response.",
          clarification: shouldEscalate
            ? `Try one of these now: say exactly 'UNSPSC 43000000' (Information Technology) or '${UNSPSC_CODES[18].label}'. I will only save it when you explicitly confirm the code or label.`
            : `Please provide UNSPSC code or category label like ${UNSPSC_CODES[18].label}.`,
          next: pointer("unspsc_codes"),
        };
      }
      return {
        ok: true,
        confidence: 0.78,
        updates: { unspsc_codes: Array.from(new Set([...(state.unspsc_codes ?? []), ...codes])) },
        confirmation: `Added UNSPSC ${codes.join(", ")} — looking good!`,
        next: pointer("designations"),
      };
    }
    case "designations": {
      if (["none", "skip", "no"].includes(safeAnswer.toLowerCase())) {
        return {
          ok: true,
          confidence: 0.95,
          updates: { designations: [] },
          confirmation: "No designations selected.",
          next: pointer("owner_details", 0),
        };
      }
      const des = parseDesignations(safeAnswer);
      if (!des.length) {
        return {
          ok: false,
          confidence: 0.3,
          confirmation: "I could not map those designations.",
          clarification: "Please say a designation like Small Business, Women-Led, Minority-Owned, or say none.",
          next: pointer("designations"),
        };
      }
      return {
        ok: true,
        confidence: 0.82,
        updates: { designations: Array.from(new Set([...(state.designations ?? []), ...des])) },
        confirmation: `Great choices — ${des.join(", ")}!`,
        next: pointer("owner_details", 0),
      };
    }
    case "owner_details": {
      const details = parseOwnerDetails(safeAnswer);
      const entries = ensureOwner(state.ownership_structure, ownerIndex);
      
      let clarification = "";
      if (details.name.length < 2 && !entries[ownerIndex].name) {
        clarification += "Please state their full name. ";
      } else if (details.name.length >= 2) {
        entries[ownerIndex].name = details.name;
      }

      if (!details.gender && !entries[ownerIndex].gender) {
        clarification += "Please include their gender (female, male, non-binary, or other). ";
      } else if (details.gender) {
        entries[ownerIndex].gender = details.gender;
      }

      if (!details.percent && !entries[ownerIndex].percent) {
        clarification += "Please include their ownership percentage. ";
      } else if (details.percent) {
        entries[ownerIndex].percent = details.percent;
      }
      
      const total = ownerTotal(entries);
      if (clarification) {
        return {
          ok: false,
          confidence: 0.5,
          ownershipUpdate: entries,
          confirmation: "I missed some details.",
          clarification: clarification.trim(),
          next: pointer("owner_details", ownerIndex),
        };
      }
      
      if (total > 100) {
        return {
          ok: false,
          confidence: 0.6,
          ownershipUpdate: entries,
          confirmation: `Ownership total is ${total} percent which is over 100.`,
          clarification: "Please adjust their percentage so total is 100.",
          next: pointer("owner_details", ownerIndex),
        };
      }
      return {
        ok: true,
        confidence: 0.9,
        ownershipUpdate: entries,
        confirmation: `Got it! ${entries[ownerIndex].name}, ${entries[ownerIndex].gender}, ${entries[ownerIndex].percent}%.`,
        next: pointer("owner_add_more", ownerIndex),
      };
    }
    case "owner_add_more": {
      const total = ownerTotal(state.ownership_structure);
      const lower = safeAnswer.toLowerCase();
      const wantsEdit = /\b(edit|change|modify|update|fix|correct)\b/.test(lower);
      const choice = parseYesNo(safeAnswer);

      if (total >= 100) {
        if (wantsEdit || choice === false || choice === null) {
          return {
            ok: false,
            confidence: 0.8,
            confirmation: "Ownership is already 100 percent.",
            clarification: "Say continue/yes to move on, or say edit to modify current owners.",
            next: pointer("owner_add_more", ownerIndex),
          };
        }
        return {
          ok: true,
          confidence: 0.92,
          confirmation: "Ownership section done — great work!",
          next: pointer("num_employees"),
        };
      }

      if (total < 100 && choice === false) {
        return {
          ok: false,
          confidence: 0.75,
          confirmation: `Current ownership total is ${total} percent.`,
          clarification: "Ownership must total 100 percent. Say yes to add another owner or adjust existing percentages.",
          next: pointer("owner_add_more", ownerIndex),
        };
      }

      if (choice === true) {
        const nextIndex = state.ownership_structure.length;
        const entries: OwnershipEntry[] = [...state.ownership_structure, { name: "", gender: "female", percent: 0 }];
        return {
          ok: true,
          confidence: 0.9,
          ownershipUpdate: entries,
          confirmation: `Adding owner ${nextIndex + 1}.`,
          next: pointer("owner_details", nextIndex),
        };
      }

      if (choice === null && total < 100) {
        return {
          ok: false,
          confidence: 0.3,
          confirmation: "I could not detect yes or no.",
          clarification: `Current total is ${total} percent. Say yes to add another owner.`,
          next: pointer("owner_add_more", ownerIndex),
        };
      }

      return {
        ok: true,
        confidence: 0.92,
        confirmation: "Ownership section done — great work!",
        next: pointer("num_employees"),
      };
    }
    case "num_employees": {
      const range = parseEmployeeRange(safeAnswer);
      if (!range) {
        return { ok: false, confidence: 0.35, confirmation: "I could not map the employee range.", clarification: "Please say one of: 1-10, 11-50, 51-200, 201-500, 501-1000, or 1000+.", next: pointer("num_employees") };
      }
      return {
        ok: true,
        confidence: 0.85,
        updates: { num_employees: range },
        confirmation: `${range} employees — got it!`,
        next: pointer("revenue_range"),
      };
    }
    case "revenue_range": {
      const range = parseRevenueRange(safeAnswer);
      if (!range) {
        return { ok: false, confidence: 0.35, confirmation: "I didn't catch a matching range.", clarification: "Try saying one of: Under 100K, 100K to 500K, 500K to 1 million, 1 to 5 million, 5 to 25 million, or 25 million plus.", next: pointer("revenue_range") };
      }
      return {
        ok: true,
        confidence: 0.85,
        updates: { revenue_range: range },
        confirmation: `${range} — noted!`,
        next: pointer("additional_certs"),
      };
    }
    case "additional_certs": {
      const lower = safeAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const value = ["none", "skip", "no", "nine"].includes(lower) ? "" : safeAnswer;
      return {
        ok: true,
        confidence: 0.9,
        updates: { additional_certs: value },
        confirmation: value ? "Great, saved your certifications!" : "No extras — that's totally fine!",
        next: pointer("business_description"),
      };
    }
    case "business_description": {
      if (safeAnswer.length < 30) {
        return {
          ok: false,
          confidence: 0.5,
          confirmation: "Description is too short.",
          clarification: "Please provide at least thirty characters describing your products or services.",
          next: pointer("business_description"),
        };
      }
      return {
        ok: true,
        confidence: 0.85,
        updates: { business_description: safeAnswer },
        confirmation: "Wonderful description — saved!",
        next: pointer("cert_type"),
      };
    }
    case "cert_type": {
      const cert = parseCertType(safeAnswer);
      if (!cert) {
        return { ok: false, confidence: 0.4, confirmation: "I could not map certification path.", clarification: "Please say self certification or digital certification.", next: pointer("cert_type") };
      }
      return {
        ok: true,
        confidence: 0.9,
        updates: { cert_type: cert },
        confirmation: `${cert === "self" ? "Self" : "Digital"} Certification — great choice!`,
        next: pointer("assessor"),
      };
    }
    case "assessor": {
      const id = parseAssessorId(safeAnswer);
      if (id === null) {
        return { ok: false, confidence: 0.4, confirmation: "I could not find that assessor.", clarification: `Please pick a listed assessor name or say skip.`, next: pointer("assessor") };
      }
      const chosen = id ? MOCK_ASSESSORS.find((a) => a.id === id)?.name ?? "selected assessor" : "No assessor selected";
      return {
        ok: true,
        confidence: 0.88,
        assessorId: id,
        confirmation: id ? `Selected assessor: ${chosen}.` : chosen,
        next: pointer("done"),
        done: true,
      };
    }
    case "done": {
      return {
        ok: true,
        confidence: 1,
        confirmation: "Voice flow already completed.",
        next: pointer("done"),
        done: true,
      };
    }
    default:
      return {
        ok: false,
        confidence: 0,
        confirmation: "Unsupported step.",
        clarification: "Please retry.",
        next: pointerState,
      };
  }
}
