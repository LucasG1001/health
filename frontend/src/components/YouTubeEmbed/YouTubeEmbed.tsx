import { parseYouTubeId } from "../../utils/youtube";
import styles from "./YouTubeEmbed.module.css";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
}

export function YouTubeEmbed({ url, title = "Vídeo do exercício" }: YouTubeEmbedProps) {
  const id = parseYouTubeId(url);

  if (!id) {
    return (
      <a className={styles.fallback} href={url} target="_blank" rel="noreferrer">
        Abrir vídeo no YouTube
      </a>
    );
  }

  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.iframe}
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
