import { RichText as LexicalRichText } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import {
  Container,
  Prose,
  Section,
  type Scheme,
} from "@/components/ui/section";

export function RichTextBody({ data }: { data: unknown }) {
  if (!data) return null;
  return (
    <div className="rich-text">
      <LexicalRichText data={data as SerializedEditorState} />
    </div>
  );
}

export function RichTextSection({
  content,
  scheme = "light",
}: {
  content: unknown;
  scheme?: Scheme;
}) {
  return (
    <Section scheme={scheme}>
      <Container>
        <Prose>
          <RichTextBody data={content} />
        </Prose>
      </Container>
    </Section>
  );
}
