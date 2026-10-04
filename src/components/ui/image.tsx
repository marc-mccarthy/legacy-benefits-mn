import { getImageProps, type ImageProps } from "next/image";
import { srcSetFor } from "@/lib/image-loader";

export function Image(props: ImageProps & { src: string }) {
  const { props: img } = getImageProps(props);
  return <img {...img} alt={props.alt} srcSet={srcSetFor(props.src)} />;
}
