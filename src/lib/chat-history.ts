import { z } from "zod";

export const chatHistorySchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            from: z.enum(["shop", "you"]),
            text: z.string().trim().min(1).max(2000),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .refine(
    (value) =>
      new TextEncoder().encode(JSON.stringify(value.messages)).byteLength <=
      60_000,
    "History too long",
  );

export type ChatMessage = z.infer<typeof chatHistorySchema>["messages"][number];
export const chatGreeting: ChatMessage = {
  from: "shop",
  text: "Chào bạn, mình là trợ lý nhỏ của Mộc 🌿 Bạn muốn tìm hiểu điều gì?",
};

export function boundedHistory(messages: ChatMessage[]) {
  const result = messages.slice(-100);
  while (
    result.length &&
    new TextEncoder().encode(JSON.stringify(result)).byteLength > 60_000
  )
    result.splice(0, 2);
  return result;
}
