import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Gallery.module.css";

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

export default function Gallery() {
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

  const photos     = data?.photos     ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasNext    = data?.hasNext    ?? false;
  const hasPrev    = data?.hasPrev    ?? false;

  return (
    <>
      <Head>
        <title>{EVENT_NAME} — Galeria</title>
        <meta name="description" content={`Galeria de fotos: ${EVENT_NAME}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <div className={styles.topbar}>
          <Image src="/picbrand.png" alt="PicBrand" width={350} height={140} className={styles.logoImg} />
          <Image src="/nespresso.png" alt="Nespresso" width={350} height={140} className={styles.logoImg} />
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>GALERIA PICBRAND</h1>
          <p className={styles.brandSub}>NESPRESSO</p>
          <p className={styles.subtitle}>Encontre e baixe sua polaroid</p>
          <Link href="/find" className={styles.findBtn}>
            🔍 Encontrar minha foto
          </Link>
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
            Nenhuma foto disponível ainda. Volte em breve!
          </div>
        )}

        {/* Grid + paginação */}
        {!loading && !error && total > 0 && (
          <>
            {/* Contagem e indicador de página */}
            <div className={styles.pageBar}>
              <span className={styles.photoCount}>{total} foto{total !== 1 ? "s" : ""}</span>
              <span className={styles.pageInfo}>Página {page} de {totalPages}</span>
            </div>

            <div className={styles.grid}>
              {photos.map((photo) => (
                <div key={photo.photo_id} className={styles.card}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Polaroid ${photo.photo_id.slice(0, 8)}`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Controles de paginação */}
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
