import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import styles from "../styles/Operator.module.css";

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

interface Selection {
  selected: boolean;
  qty: number;
  url: string;
}

const LIMIT = 10;

export default function OperatorPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selections, setSelections] = useState<Record<string, Selection>>({});

  const fetchPage = useCallback((p: number) => {
    setLoading(true);
    setError(false);
    fetch(`/api/photos?page=${p}&limit=${LIMIT}`)
      .then((r) => {
        if (!r.ok) throw new Error();
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

  const photos = data?.photos ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasNext = data?.hasNext ?? false;
  const hasPrev = data?.hasPrev ?? false;

  const totalSelected = Object.values(selections).filter((s) => s.selected).length;
  const totalCopies = Object.values(selections).reduce(
    (sum, s) => sum + (s.selected ? s.qty : 0),
    0
  );

  const toggleOne = (photo: Photo) => {
    setSelections((prev) => {
      const current = prev[photo.photo_id];
      return {
        ...prev,
        [photo.photo_id]: {
          selected: !(current?.selected ?? false),
          qty: current?.qty ?? 1,
          url: photo.url,
        },
      };
    });
  };

  const setQty = (photo: Photo, qty: number) => {
    setSelections((prev) => {
      const current = prev[photo.photo_id];
      return {
        ...prev,
        [photo.photo_id]: {
          selected: current?.selected ?? false,
          qty: Math.min(10, Math.max(1, qty)),
          url: photo.url,
        },
      };
    });
  };

  const selectPageAll = (selected: boolean) => {
    setSelections((prev) => {
      const next = { ...prev };
      photos.forEach((p) => {
        next[p.photo_id] = {
          selected,
          qty: next[p.photo_id]?.qty ?? 1,
          url: p.url,
        };
      });
      return next;
    });
  };

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => {
    const toPrint = Object.values(selections).filter((s) => s.selected);
    if (toPrint.length === 0) return;

    const pages = toPrint
      .flatMap(({ url, qty }) =>
        Array.from(
          { length: qty },
          () => `<div class="print-page"><img src="${url}" alt="polaroid" /><div class="cut-line"></div></div>`
        )
      )
      .join("");

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Impressão Polaroid</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #000; }
   .print-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  page-break-after: always;
}
      .print-page:last-child { page-break-after: auto; }
      img { max-width: 100%; max-height: 85%; object-fit: contain; }
      .cut-line {
        display: none;
      }
      @media print {
      @page { margin: 0mm; size: auto; }
        body { background: #fff; }
        .print-page { width: 100%; height: 100vh; page-break-after: always; flex-direction: column; align-items: flex-start; justify-content: flex-start; }
        .cut-line {
          display: block;
          width: 100%;
          border: none;
          border-top: 1px dashed #aaaaaa;
          margin-top: 8px;
          text-align: center;
          font-size: 10px;
          color: #aaaaaa;
          padding-top: 4px;
        }
        .cut-line::after {
          content: "✂ cortar aqui";
        }
      }
    </style>
  </head>
  <body>
    ${pages}
    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      };
    </script>
  </body>
</html>`);
    win.document.close();
  };

  return (
    <>
      <Head>
        <title>Painel do Operador</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Painel do Operador</h1>
            {totalSelected > 0 && (
              <span className={styles.badge}>
                {totalSelected} foto{totalSelected !== 1 ? "s" : ""} selecionada{totalSelected !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className={styles.controls}>
            <button className={styles.ctrlBtn} onClick={() => selectPageAll(true)}>
              Selecionar todas desta página
            </button>
            <button className={styles.ctrlBtn} onClick={() => selectPageAll(false)}>
              Desmarcar todas desta página
            </button>
          </div>
        </header>

        {loading && (
          <div className={styles.centered}>
            <div className={styles.spinner} />
            <p>Carregando fotos...</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.centered}>
            Não foi possível carregar as fotos. Tente recarregar a página.
          </div>
        )}

        {!loading && !error && total === 0 && (
          <div className={styles.centered}>Nenhuma foto disponível ainda.</div>
        )}

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
              {photos.map((photo) => {
                const sel = selections[photo.photo_id];
                const isSelected = sel?.selected ?? false;
                return (
                  <div
                    key={photo.photo_id}
                    className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
                    onClick={() => toggleOne(photo)}
                  >
                    <img
                      src={photo.url}
                      alt={`Polaroid ${photo.photo_id.slice(0, 8)}`}
                      loading="lazy"
                    />
                    <div
                      className={styles.cardFooter}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(photo)}
                        />
                        Selecionar
                      </label>
                      <div className={styles.qtyWrapper}>
                        <span className={styles.qtyLabel}>Cópias</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={sel?.qty ?? 1}
                          onChange={(e) => setQty(photo, Number(e.target.value))}
                          className={styles.qtyInput}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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

        <div className={styles.footer}>
          <button
            className={styles.printBtn}
            onClick={handlePrint}
            disabled={totalCopies === 0}
          >
            Imprimir selecionadas ({totalCopies} {totalCopies === 1 ? "cópia" : "cópias"})
          </button>
        </div>
      </div>
    </>
  );
}