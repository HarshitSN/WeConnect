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
  parsePercent,
  parseRevenueRange,
  parseUnspscCodes,
  parseVisaType,
  parseYesNo,
} from "@/lib/voice-agent/normalizers";

export function getNextQuestion(pointer: ConversationPointer, state: RegistrationState): string {
  const total = state.ownership_structure.reduce((sum, e) => sum + Number(e.percent || 0), 0);
  const ownerIndex = pointer.ownerIndex ?? 0;
  switch (pointer.stepId) {
    case "business_name":
      return "What is your registered business name?";
    case "women_owned":
      return "Is your business at least 51 percent owned by women?";
    case "country":
      return "Which country is your business based in?";
    case "us_citizen":
      return "Are you a US citizen or green card holder?";
    case "visa_type":
      return "What is your visa type? For example H-1B, L-1, O-1, E-2, TN, F-1 OPT, or other.";
    case "webank_certified":
      return "Are you certified by WEBank?";
    case "naics_codes":
      return "Tell me your NAICS industry code or industry name. You can give multiple.";
    case "unspsc_codes":
      return "Tell me your UNSPSC category code or category name. You can give multiple.";
    case "designations":
      return "Any business designations like Small Business, Women Led, Minority Owned, Veteran Owned, or say none.";
    case "owner_name":
      return `Owner ${ownerIndex + 1}: What is the full name?`;
    case "owner_gender":
      return `Owner ${ownerIndex + 1}: What is the gender? female, male, non-binary, or other.`;
    case "owner_percent":
      return `Owner ${ownerIndex + 1}: What is the ownership percentage? Current total is ${total} percent.`;
    case "owner_add_more":
      return total < 100
        ? `Current ownership total is ${total} percent. Do you want to add another owner?`
        : "Ownership total is 100 percent. Should we continue to the next section?";
    case "num_employees":
      return "What is your number of employees range? Options are 1 to 10, 11 to 50, 51 to 200, 201 to 500, 501 to 1000, or 1000 plus.";
    case "revenue_range":
      return "What is your annual revenue range?";
    case "additional_certs":
      return "Do you have additional certifications? Say them, or say none.";
    case "business_description":
      return "Please describe your products or services in at least thirty characters.";
    case "cert_type":
      return "Choose certification path: self certification or digital certification.";
    case "assessor": {
      const names = MOCK_ASSESSORS.map((a) => a.name).join(", ");
      return `You can select an assessor: ${names}. Say skip if you do not want one.`;
    }
    case "done":
      return "Great, voice registration is complete. Please review and finish payment.";
    default:
      return "Let's continue.";
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
): AgentParseResult {
  const step = pointerState.stepId;
  const ownerIndex = pointerState.ownerIndex ?? 0;
  const safeAnswer = answer.trim();

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
      return {
        ok: true,
        confidence: 0.95,
        updates: { business_name: businessName },
        confirmation: `Saved business name as ${businessName}.`,
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
        confirmation: parsed ? "Marked as women-owned." : "Marked as not women-owned.",
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
        confirmation: `Saved country as ${country}.`,
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
        confirmation: parsed ? "Marked as US citizen/green card holder." : "Marked as non-US citizen/green card holder.",
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
        confirmation: `Saved visa type as ${visa}.`,
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
        confirmation: parsed ? "WEBank certified marked yes." : "WEBank certified marked no.",
        next: pointer("naics_codes"),
      };
    }
    case "naics_codes": {
      const codes = parseNaicsCodes(safeAnswer);
      if (!codes.length) {
        return {
          ok: false,
          confidence: 0.25,
          confirmation: "I could not find a NAICS code from that response.",
          clarification: `Please provide NAICS code or industry label like ${NAICS_CODES[0].label}.`,
          next: pointer("naics_codes"),
        };
      }
      return {
        ok: true,
        confidence: 0.78,
        updates: { naics_codes: Array.from(new Set([...(state.naics_codes ?? []), ...codes])) },
        confirmation: `Added NAICS code${codes.length > 1 ? "s" : ""}: ${codes.join(", ")}.`,
        next: pointer("unspsc_codes"),
      };
    }
    case "unspsc_codes": {
      const codes = parseUnspscCodes(safeAnswer);
      if (!codes.length) {
        return {
          ok: false,
          confidence: 0.25,
          confirmation: "I could not find a UNSPSC category from that response.",
          clarification: `Please provide UNSPSC code or category label like ${UNSPSC_CODES[18].label}.`,
          next: pointer("unspsc_codes"),
        };
      }
      return {
        ok: true,
        confidence: 0.78,
        updates: { unspsc_codes: Array.from(new Set([...(state.unspsc_codes ?? []), ...codes])) },
        confirmation: `Added UNSPSC code${codes.length > 1 ? "s" : ""}: ${codes.join(", ")}.`,
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
          next: pointer("owner_name", 0),
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
        confirmation: `Saved designations: ${des.join(", ")}.`,
        next: pointer("owner_name", 0),
      };
    }
    case "owner_name": {
      const ownerName = normalizeOwnerName(safeAnswer);
      if (ownerName.length < 2) {
        return { ok: false, confidence: 0.3, confirmation: "Owner name seems too short.", clarification: `Please repeat owner ${ownerIndex + 1} full name.`, next: pointer("owner_name", ownerIndex) };
      }
      const entries = ensureOwner(state.ownership_structure, ownerIndex);
      entries[ownerIndex] = { ...entries[ownerIndex], name: ownerName };
      return {
        ok: true,
        confidence: 0.9,
        ownershipUpdate: entries,
        confirmation: `Saved owner ${ownerIndex + 1} name as ${ownerName}.`,
        next: pointer("owner_gender", ownerIndex),
      };
    }
    case "owner_gender": {
      const gender = parseGender(safeAnswer);
      if (!gender) {
        return { ok: false, confidence: 0.35, confirmation: "I could not map gender.", clarification: "Please say female, male, non-binary, or other.", next: pointer("owner_gender", ownerIndex) };
      }
      const entries = ensureOwner(state.ownership_structure, ownerIndex);
      entries[ownerIndex] = { ...entries[ownerIndex], gender };
      return {
        ok: true,
        confidence: 0.86,
        ownershipUpdate: entries,
        confirmation: `Saved owner ${ownerIndex + 1} gender as ${gender}.`,
        next: pointer("owner_percent", ownerIndex),
      };
    }
    case "owner_percent": {
      const percent = parsePercent(safeAnswer);
      if (!percent) {
        return { ok: false, confidence: 0.35, confirmation: "I could not map ownership percentage.", clarification: "Please say a number between 1 and 100.", next: pointer("owner_percent", ownerIndex) };
      }
      const entries = ensureOwner(state.ownership_structure, ownerIndex);
      entries[ownerIndex] = { ...entries[ownerIndex], percent };
      const total = ownerTotal(entries);
      if (total > 100) {
        return {
          ok: false,
          confidence: 0.6,
          ownershipUpdate: entries,
          confirmation: `Ownership total is ${total} percent which is over 100.`,
          clarification: "Please adjust this owner percentage so total is 100.",
          next: pointer("owner_percent", ownerIndex),
        };
      }
      return {
        ok: true,
        confidence: 0.88,
        ownershipUpdate: entries,
        confirmation: `Saved owner ${ownerIndex + 1} percentage as ${percent} percent.`,
        next: pointer("owner_add_more", ownerIndex),
      };
    }
    case "owner_add_more": {
      const total = ownerTotal(state.ownership_structure);
      const choice = parseYesNo(safeAnswer);

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
        if (total >= 100) {
          return {
            ok: false,
            confidence: 0.7,
            confirmation: "Ownership is already 100 percent.",
            clarification: "You can continue, or say edit to modify current owners.",
            next: pointer("owner_add_more", ownerIndex),
          };
        }
        const nextIndex = state.ownership_structure.length;
        const entries: OwnershipEntry[] = [...state.ownership_structure, { name: "", gender: "female", percent: 0 }];
        return {
          ok: true,
          confidence: 0.9,
          ownershipUpdate: entries,
          confirmation: `Adding owner ${nextIndex + 1}.`,
          next: pointer("owner_name", nextIndex),
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
        confirmation: "Ownership section completed.",
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
        confirmation: `Saved employee range as ${range}.`,
        next: pointer("revenue_range"),
      };
    }
    case "revenue_range": {
      const range = parseRevenueRange(safeAnswer);
      if (!range) {
        return { ok: false, confidence: 0.35, confirmation: "I could not map revenue range.", clarification: "Please say a revenue range from the dropdown options.", next: pointer("revenue_range") };
      }
      return {
        ok: true,
        confidence: 0.85,
        updates: { revenue_range: range },
        confirmation: `Saved revenue range as ${range}.`,
        next: pointer("additional_certs"),
      };
    }
    case "additional_certs": {
      const lower = safeAnswer.toLowerCase();
      const value = ["none", "skip", "no"].includes(lower) ? "" : safeAnswer;
      return {
        ok: true,
        confidence: 0.9,
        updates: { additional_certs: value },
        confirmation: value ? "Saved additional certifications." : "No additional certifications noted.",
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
        confirmation: "Business description saved.",
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
        confirmation: `Selected ${cert === "self" ? "Self" : "Digital"} Certification.`,
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
