import type { ReactNode } from "react";
import {
  Container,
  Prose,
  Section,
  type Scheme,
} from "@/components/ui/section";

export function RichTextBody({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div className="rich-text">{children}</div>;
}

export function RichTextSection({
  content,
  scheme = "light",
}: {
  content?: ReactNode;
  scheme?: Scheme;
}) {
  return (
    <Section scheme={scheme}>
      <Container>
        <Prose>
          <RichTextBody>{content}</RichTextBody>
        </Prose>
      </Container>
    </Section>
  );
}
