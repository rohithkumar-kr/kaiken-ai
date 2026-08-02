import { describe, expect, it } from "vitest";

import { parsedResumeSchema } from "@/lib/types/resume";

describe("parsedResumeSchema", () => {
  it("normalizes a complete structured resume", () => {
    const result = parsedResumeSchema.parse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555 0100",
      summary: "Mathematician and writer.",
      skills: ["Math", "Algorithms"],
      experience: [
        {
          title: "Analyst",
          company: "Analytical Engines",
          location: "London",
          startDate: "1842",
          endDate: null,
          description: "Worked on the Analytical Engine.",
        },
      ],
      projects: [
        {
          name: "Notes on the Analytical Engine",
          description: "Translation with extensive notes.",
          technologies: ["Mathematics"],
          url: null,
          startDate: null,
          endDate: null,
        },
      ],
      education: [
        {
          institution: "Private tutoring",
          degree: null,
          fieldOfStudy: "Mathematics",
          startDate: null,
          endDate: null,
          grade: null,
        },
      ],
      certifications: [],
    });

    expect(result.name).toBe("Ada Lovelace");
    expect(result.skills).toEqual(["Math", "Algorithms"]);
    expect(result.experience[0].company).toBe("Analytical Engines");
    expect(result.projects[0].technologies).toEqual(["Mathematics"]);
    expect(result.certifications).toEqual([]);
  });

  it("defaults missing sections to safe values", () => {
    const result = parsedResumeSchema.parse({
      name: null,
    });

    expect(result).toEqual({
      name: null,
      email: null,
      phone: null,
      summary: null,
      skills: [],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
    });
  });

  it("coerces invalid scalar values instead of throwing", () => {
    const result = parsedResumeSchema.parse({
      name: 123,
      email: null,
      phone: undefined,
      summary: "present",
      skills: "not-an-array",
      experience: [{ company: "Missing title" }],
      projects: null,
      education: [],
      certifications: undefined,
    });

    expect(result.name).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.summary).toBe("present");
    expect(result.skills).toEqual([]);
    expect(result.experience[0].title).toBe("");
    expect(result.projects).toEqual([]);
    expect(result.certifications).toEqual([]);
  });

  it("drops malformed array items without failing the whole parse", () => {
    const result = parsedResumeSchema.parse({
      name: "Grace Hopper",
      experience: [{ title: "Rear Admiral" }, { title: null, company: "US Navy" }],
      skills: ["COBOL"],
    });

    expect(result.experience).toHaveLength(2);
    expect(result.experience[1].title).toBe("");
    expect(result.skills).toEqual(["COBOL"]);
  });
});
