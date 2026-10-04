import { getImageProps, type ImageProps } from "next/image";
import { preload } from "react-dom";
import { srcSetFor } from "@/lib/image-loader";

export function Image(props: ImageProps & { src: string }) {
  const { props: img } = getImageProps(props);
  const urgent = props.priority || props.preload;
  const srcSet = props.sizes ? srcSetFor(props.src) : img.srcSet;
  const fetchPriority = urgent ? "high" : img.fetchPriority;
  if (urgent) {
    preload(img.src, {
      as: "image",
      imageSrcSet: srcSet,
      imageSizes: img.sizes,
      fetchPriority,
    });
  }
  return (
    <img
      {...img}
      alt={props.alt}
      srcSet={srcSet}
      fetchPriority={fetchPriority}
      loading={urgent ? "eager" : img.loading}
    />
  );
}
