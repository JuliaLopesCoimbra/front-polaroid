import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import styles from "../styles/Impression.module.css";

interface Photo {
  url: string;
  photo_id: string;
  timestamp: string;
}

interface PageData {
  photos: Photo[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const LIMIT = 10;
const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "Retrato PIC";

export default function Impression() {
  const [data, setData]       = useState<PageData | null>(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetchPage = useCallback((p: number) => {
    setLoading(true);
    setError(false);
    fetch(`/api/photos?page=${p}&limit=${LIMIT}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((json: PageData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const downloadPhoto = useCallback(async (url: string, photo_id: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `polaroid-${photo_id.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, "_blank");
    }
  }, []);

  const photos     = data?.photos     ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasNext    = data?.hasNext    ?? false;
  const hasPrev    = data?.hasPrev    ?? false;

  return (
    <>
      <Head>
        <title>Impressão — {EVENT_NAME}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.logo}>Impressão de Fotos</p>
          <h1 className={styles.title}>{EVENT_NAME}</h1>
          <p className={styles.subtitle}>Clique em qualquer foto para baixar</p>
        </header>

        {/* Loading */}
        {loading && (
          <div className={styles.centered}>
            <div className={styles.spinner} />
            <p>Carregando fotos...</p>
          </div>
        )}

        {/* Erro */}
        {!loading && error && (
          <div className={styles.centered}>
            Não foi possível carregar as fotos. Tente recarregar a página.
          </div>
        )}

        {/* Vazio */}
        {!loading && !error && total === 0 && (
          <div className={styles.centered}>
            Nenhuma foto disponível ainda.
          </div>
        )}

        {/* Grid + paginação */}
        {!loading && !error && total > 0 && (
          <>
            <div className={styles.pageBar}>
              <span className={styles.photoCount}>
                {total} foto{total !== 1 ? "s" : ""}
              </span>
              <span className={styles.pageInfo}>
                Página {page} de {totalPages}
              </span>
            </div>

            <div className={styles.grid}>
              {photos.map((photo) => (
                <div
                  key={photo.photo_id}
                  className={styles.card}
                  onClick={() => downloadPhoto(photo.url, photo.photo_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && downloadPhoto(photo.url, photo.photo_id)
                  }
                  title="Clique para baixar"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Polaroid ${photo.photo_id.slice(0, 8)}`}
                    loading="lazy"
                    draggable={false}
                  />
                  <div className={styles.badge}>⬇ Baixar</div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => goToPage(page - 1)}
                  disabled={!hasPrev}
                >
                  ← Anterior
                </button>

                <span className={styles.pageDots}>
                  {page} / {totalPages}
                </span>

                <button
                  className={styles.pageBtn}
                  onClick={() => goToPage(page + 1)}
                  disabled={!hasNext}
                >
                  Próximo →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
