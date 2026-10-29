import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

/** The release's own notes from GitHub, rendered and cleaned before they reach the page. */
export function ReleaseNotes({ body }: { body: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(body, { async: false, gfm: true, breaks: false }) as string;
    const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    // Links in the notes open on GitHub, in a new tab.
    return clean.replace(/<a /g, '<a target="_blank" rel="noreferrer" ');
  }, [body]);
  return <div className="notes" dangerouslySetInnerHTML={{ __html: html }} />;
}
