'use client';

import Image from 'next/image';

/**
 * Builds a resized Cloudinary URL for next/image by inserting transformations after "/upload/":
 * width-limited, automatic format (WebP/AVIF) and automatic quality.
 * Cloudinary does the resizing, so the Next.js server doesn't have to.
 */
function cloudinaryLoader({ src, width, quality }) {
  const transforms = ['f_auto', `q_${quality || 'auto'}`, 'c_limit', `w_${width}`].join(',');
  return src.replace('/upload/', `/upload/${transforms}/`);
}

/** next/image for images hosted on Cloudinary. Pass the full Cloudinary delivery URL as `src`. */
export default function CloudImage(props) {
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through props
  return <Image loader={cloudinaryLoader} {...props} />;
}
