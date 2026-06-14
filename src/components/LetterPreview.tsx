import { useMemo } from 'react';
import { buildLetterHtml, type LetterInput } from '@/lib/letter/template';

interface LetterPreviewProps {
  profile: LetterInput['profile'];
  caseInput: LetterInput['caseInput'];
  summary: string;
}

export function LetterPreview({ profile, caseInput, summary }: LetterPreviewProps) {
  const html = useMemo(
    () => buildLetterHtml({ profile, caseInput, summary }),
    [profile, caseInput, summary],
  );
  return (
    <iframe
      data-testid="letter-iframe"
      title="Brief voorvertoning"
      srcDoc={html}
      data-html={html}
      className="w-full h-[600px] border border-border rounded-md bg-white"
    />
  );
}
