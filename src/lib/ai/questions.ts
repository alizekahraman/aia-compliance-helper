export interface InterviewQuestion {
  id: string;
  text: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "decisions",
    text: "Does the system make or significantly influence decisions affecting people?",
    hint: "E.g. credit scoring, hiring shortlists, benefits eligibility.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "partial", label: "Assists humans but doesn't decide" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "recruitment",
    text: "Is it used for recruitment, hiring, or evaluating workers?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Unsure" },
    ],
  },
  {
    id: "biometric",
    text: "Does it process biometric data or perform biometric identification?",
    options: [
      { value: "yes-realtime", label: "Yes, real-time identification" },
      { value: "yes-post", label: "Yes, post-event analysis" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "human-interaction",
    text: "Does it interact directly with humans (chat, voice, agent)?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "content-generation",
    text: "Does it generate synthetic content (text, image, audio, video)?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "gpai",
    text: "Is it a General Purpose AI model or built on top of one?",
    options: [
      { value: "foundation", label: "We train a foundation model" },
      { value: "built-on", label: "Built on a third-party GPAI" },
      { value: "no", label: "Neither" },
    ],
  },
  {
    id: "override",
    text: "Can users override or contest AI decisions?",
    options: [
      { value: "yes", label: "Yes, with a clear path" },
      { value: "partial", label: "Possible but undocumented" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "monitoring",
    text: "Who is responsible for monitoring the system in production?",
    options: [
      { value: "dedicated", label: "Dedicated owner / team" },
      { value: "shared", label: "Shared / informal" },
      { value: "none", label: "Nobody yet" },
    ],
  },
];