/**
 * Document generator — delegates to the DocumentationAgent.
 *
 * When the assessment is available, the agent receives the full context
 * (articles, obligations, Q&A) so it produces a tailored document.
 */

import type { Assessment, DocumentTemplate } from "@/lib/types";
import { getProvider } from "./provider";
import { documentationAgent } from "./agents/documentation";

export async function generateDocument(
  template: DocumentTemplate,
  assessment: Assessment | null,
): Promise<string> {
  const { provider, isMock } = getProvider();

  const response = await documentationAgent.run(
    {
      template,
      systemName: assessment?.basics.systemName ?? "Your AI System",
      industry: assessment?.basics.industry ?? "General",
      role: assessment?.basics.role ?? "provider",
      risk: assessment?.classification?.risk ?? "limited",
      description: assessment?.basics.description ?? "",
      articles: assessment?.classification?.articles.map((a) => ({
        article: a.article,
        title: a.title,
      })),
      obligations: undefined,
      answers: assessment?.answers,
      assessment: assessment ?? undefined,
    },
    provider,
    isMock,
  );

  return response.content;
}
