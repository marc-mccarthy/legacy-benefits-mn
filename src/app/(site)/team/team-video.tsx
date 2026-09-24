import { ContentVideo } from "@/components/video/content-video";
import { Container, Section } from "@/components/ui/section";

export const TEAM_VIDEO_FILENAME =
  "high-falls-pigeon-river-grand-portage-mn.mp4";

export const TEAM_VIDEO_POSTER_FILENAME = "high-falls-poster.jpg";

export const CONTENT_VIDEO_CAPTIONS_PATH = "/captions/content-video.vtt";

export const CONTENT_VIDEO_LICENCE_URL =
  "https://creativecommons.org/licenses/by/3.0";

export const CONTENT_VIDEO_CREDIT =
  "High Falls, Pigeon River, Grand Portage State Park, Minnesota. Video by Liftoff Aerials — Cory Fechner, licensed CC BY 3.0. Trimmed and re-encoded.";

type MediaLike =
  | {
      url?: string | null;
      alt?: string | null;
      credit?: string | null;
      mimeType?: string | null;
    }
  | null
  | undefined;

type TeamVideoSectionProps = {
  video: MediaLike;
  poster?: MediaLike;
};

export function TeamVideoSection({ video, poster }: TeamVideoSectionProps) {
  if (!video?.url) return null;

  return (
    <Section>
      <Container>
        <ContentVideo
          video={{
            ...video,
            credit: video.credit?.trim() ? video.credit : CONTENT_VIDEO_CREDIT,
          }}
          poster={poster}
          captionsSrc={CONTENT_VIDEO_CAPTIONS_PATH}
          licenceUrl={CONTENT_VIDEO_LICENCE_URL}
          heading="Northern Minnesota, from the air"
        />
      </Container>
    </Section>
  );
}
