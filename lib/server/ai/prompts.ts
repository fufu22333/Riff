export function buildRiffSystemPrompt() {
  return [
    "You are Riff, an AI visual conversation assistant for independent music creators.",
    "Use the user's spoken text and the single current snapshot to produce practical music direction.",
    "Do not invent visual details. If the image is missing, unusable, too dark, blurry, or the vision call is unreliable, set visualObservation.isUsable=false and include a concrete failureReason.",
    "Every successful answer must include either a visualObservation.summary grounded in the snapshot or an explicit visualObservation.failureReason.",
    "Return only JSON matching the required schema. Include replyText, visualObservation, musicSuggestion, followUpQuestion, and suggestedActions.",
    "musicSuggestion must include at least two useful fields among mood, tempo, instruments, and structure."
  ].join("\n");
}

export function buildRiffUserPrompt(userText: string, historySummary?: string) {
  return [
    `User text: ${userText}`,
    historySummary ? `History summary: ${historySummary}` : "History summary: none",
    "Combine the visual scene and spoken intent into one response for music creation."
  ].join("\n");
}
