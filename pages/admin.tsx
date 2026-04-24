import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import styles from "../styles/Admin.module.css";

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

export default function AdminPage() {
  const [data,    setData]    = useState<PageData | null>(null);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const fetchPage = useCallback((p: number) => {
    setLoading(true);
    setError(false);
    fetch(`/api/photos?page=${p}&limit=${LIMIT}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((json: PageData) => { setData(json); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { fetchPage(page); }, [page, fetchPage]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const download = (url: string, photo_id: string) => {
    const link    = document.createElement("a");
    link.href     = `/api/download?url=${encodeURIComponent(url)}`;
    link.download = `polaroid-${photo_id.slice(0, 8)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const photos     = data?.photos     ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasNext    = data?.hasNext    ?? false;
  const hasPrev    = data?.hasPrev    ?? false;

  return (
    <>
      <Head>
        <title>Admin — Todas as fotos</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Admin</h1>
          {total > 0 && (
            <span className={styles.count}>
              {total} foto{total !== 1 ? "s" : ""}
            </span>
          )}
        </header>

        {loading && (
          <div className={styles.centered}>
            <div className={styles.spinner} />
            <p>Carregando...</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.centered}>
            Não foi possível carregar as fotos. Tente recarregar a página.
          </div>
        )}

        {!loading && !error && total === 0 && (
          <div className={styles.centered}>Nenhuma foto disponível.</div>
        )}

        {!loading && !error && total > 0 && (
          <>
            <div className={styles.grid}>
              {photos.map((photo) => (
                <div
                  key={photo.photo_id}
                  className={styles.card}
                  onClick={() => download(photo.url, photo.photo_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && download(photo.url, photo.photo_id)}
                  title="Clique para baixar"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Polaroid ${photo.photo_id.slice(0, 8)}`}
                    loading="lazy"
                  />
                  <div className={styles.downloadBadge}>⬇ Baixar</div>
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
                <span className={styles.pageDots}>{page} / {totalPages}</span>
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
