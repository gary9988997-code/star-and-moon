"use client";

/** 将信件正文拆成问候 / 段落 / 落款，便于信纸排版 */
function splitLetterContent(content: string) {
  const lines = content.split("\n");
  let sigIndex = -1;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const trimmed = lines[i].trim();
    if (trimmed === "高文皓" || trimmed === "爱你的高文皓") {
      sigIndex = i;
      break;
    }
  }

  if (sigIndex > 0) {
    const prev = lines[sigIndex - 1]?.trim() ?? "";
    if (prev.startsWith("永远爱你")) {
      sigIndex -= 1;
    }
  }

  const bodyLines =
    sigIndex >= 0 ? lines.slice(0, sigIndex) : lines;
  const signatureLines =
    sigIndex >= 0 ? lines.slice(sigIndex).filter((line) => line.trim()) : [];

  const paragraphs = bodyLines
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => !(line.trim() === "" && arr[index - 1]?.trim() === ""));

  return { paragraphs, signatureLines };
}

function isGreetingLine(line: string, index: number) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (index <= 2 && /[：:！!]$/.test(trimmed) && trimmed.length <= 24) {
    return true;
  }
  return false;
}

export function LetterPaperBody({ content }: { content: string }) {
  const { paragraphs, signatureLines } = splitLetterContent(content);

  return (
    <div className="letter-paper-body">
      {paragraphs.map((line, index) => {
        if (!line.trim()) {
          return <div key={`gap-${index}`} className="letter-paper-gap" />;
        }
        const greeting = isGreetingLine(line, index);
        return (
          <p
            key={`p-${index}`}
            className={greeting ? "letter-paper-greeting" : "letter-paper-paragraph"}
          >
            {line}
          </p>
        );
      })}
      {signatureLines.length > 0 ? (
        <footer className="letter-paper-signature">
          {signatureLines.map((line, index) => (
            <p key={`sig-${index}`}>{line}</p>
          ))}
        </footer>
      ) : null}
    </div>
  );
}
