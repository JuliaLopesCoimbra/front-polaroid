import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Head from "next/head";
import styles from "../styles/Find.module.css";

const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "Retrato PIC";

type State = "starting" | "camera" | "countdown" | "searching" | "found" | "error";

interface FoundPhoto {
  url: string;
  photo_id: string;
  confidence: number;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function Find() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<State>("starting");
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState<FoundPhoto[]>([]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setState("starting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState("camera");
    } catch {
      setErrorMsg("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      setState("error");
    }
  }, []);

  // Liga câmera automaticamente ao montar
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Espelha horizontalmente para corresponder ao preview
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.92);
  }, []);

  const handleIniciar = useCallback(async () => {
    // Countdown 3 → 2 → 1
    setState("countdown");
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await delay(1000);
    }

    // Captura o frame e envia
    setState("searching");
    const base64 = captureFrame();
    if (!base64) {
      setErrorMsg("Falha ao capturar imagem da câmera.");
      setState("error");
      return;
    }

    try {
      const res = await fetch("/api/find-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro desconhecido");

      stopCamera();
      setResults(data.photos ?? []);
      setState("found");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar rosto.";
      setErrorMsg(msg);
      setState("error");
    }
  }, [captureFrame, stopCamera]);

  const reset = useCallback(() => {
    setResults([]);
    setErrorMsg("");
    startCamera();
  }, [startCamera]);

  const downloadPhoto = useCallback((url: string, photo_id: string) => {
    const link = document.createElement("a");
    link.href = `/api/download?url=${encodeURIComponent(url)}`;
    link.download = `polaroid-${photo_id.slice(0, 8)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Câmera visível durante: camera, countdown, searching
  const showVideo = state === "camera" || state === "countdown" || state === "searching";

  return (
    <>
      <Head>
        <title>Encontrar minha foto — {EVENT_NAME}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <Link href="/" className={styles.back}>← Voltar à galeria</Link>

        <div className={styles.header}>
          <h1 className={styles.title}>Encontrar minha foto</h1>
          <p className={styles.subtitle}>
            Posicione seu rosto na câmera e clique em Iniciar.
          </p>
        </div>

        {/* Círculo da webcam — sempre montado para manter o stream */}
        <div
          className={`${styles.webcamWrapper} ${
            state === "countdown" ? styles.webcamCountdown : ""
          } ${state === "found" ? styles.webcamHidden : ""}`}
        >
          {/* Vídeo sempre no DOM; visibilidade controlada por CSS */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={showVideo ? styles.videoVisible : styles.videoHidden}
          />

          {state === "starting" && (
            <div className={styles.webcamPlaceholder}>
              <span className={styles.spinnerLg} />
              <span>Iniciando câmera...</span>
            </div>
          )}

          {state === "countdown" && (
            <div className={styles.overlay}>
              <span className={styles.countdownNumber}>{countdown}</span>
              <span className={styles.overlayText}>Não tire o rosto da câmera</span>
            </div>
          )}

          {state === "searching" && (
            <div className={styles.overlay}>
              <span className={styles.spinnerLg} />
              <span className={styles.overlayText}>Aguarde, não tire o rosto da câmera...</span>
            </div>
          )}
        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className={styles.canvas} />

        {/* Botão Iniciar */}
        {state === "camera" && (
          <button className={styles.btnPrimary} onClick={handleIniciar}>
            Iniciar
          </button>
        )}

        {/* Erro */}
        {state === "error" && (
          <>
            <p className={styles.error}>{errorMsg}</p>
            <button className={styles.btnPrimary} onClick={reset}>
              Tentar novamente
            </button>
          </>
        )}

        {/* Resultados */}
        {state === "found" && results.length === 0 && (
          <div className={styles.result}>
            <p className={styles.resultLabel}>Nenhuma foto encontrada, tente novamente</p>
            <button className={styles.btnSecondary} onClick={reset}>
              Tentar novamente
            </button>
          </div>
        )}

        {state === "found" && results.length > 0 && (
          <div className={styles.result}>
            <p className={styles.resultLabel}>
              Encontramos {results.length} {results.length === 1 ? "foto sua" : "fotos suas"}!
            </p>

            <div className={styles.resultGrid}>
              {results.map((photo) => (
                <div
                  key={photo.photo_id}
                  className={styles.resultCard}
                  onClick={() => downloadPhoto(photo.url, photo.photo_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && downloadPhoto(photo.url, photo.photo_id)}
                  title={`Confiança: ${photo.confidence.toFixed(0)}% — clique para baixar`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="Polaroid" draggable={false} />
                  <div className={styles.downloadBadge}>⬇ Baixar</div>
                </div>
              ))}
            </div>

            <button className={styles.btnSecondary} onClick={reset}>
              Buscar novamente
            </button>
          </div>
        )}
      </div>
    </>
  );
}
