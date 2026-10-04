import { getImageProps, type ImageProps } from "next/image";
import { preload } from "react-dom";
import { srcSetFor } from "@/lib/image-loader";

export function Image(props: ImageProps & { src: string }) {
  const derived = srcSetFor(props.src);
  const { props: img } = getImageProps({
    ...props,
    unoptimized: props.unoptimized ?? !derived,
  });
  const urgent = props.priority || props.preload;
  const srcSet = props.sizes ? derived : img.srcSet;
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
