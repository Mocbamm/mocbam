export function Prose({ content }: { content: string }) {
  return (
    <div className="space-y-5 text-sm leading-8 text-[#737e65]">
      {content
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
    </div>
  );
}
