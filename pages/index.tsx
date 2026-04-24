import { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import galleryStyles from "../styles/Gallery.module.css";
import findStyles from "../styles/Find.module.css";

type State = "starting" | "camera" | "countdown" | "searching" | "found" | "error";

interface FoundPhoto {
  url: string;
  photo_id: string;
  confidence: number;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function Home() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [state,     setState]     = useState<State>("starting");
  const [countdown, setCountdown] = useState(0);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [results,   setResults]   = useState<FoundPhoto[]>([]);

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
      if (videoRef.current) videoRef.current.srcObject = stream;
      setState("camera");
    } catch {
      setErrorMsg("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureFrame = useCallback((): string | null => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.92);
  }, []);

  const handleIniciar = useCallback(async () => {
    setState("countdown");
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await delay(1000);
    }

    setState("searching");
    const base64 = captureFrame();
    if (!base64) {
      setErrorMsg("Falha ao capturar imagem da câmera.");
      setState("error");
      return;
    }

    try {
      const res  = await fetch("/api/find-face", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      stopCamera();
      setResults(data.photos ?? []);
      setState("found");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao buscar rosto.");
      setState("error");
    }
  }, [captureFrame, stopCamera]);

  const reset = useCallback(() => {
    setResults([]);
    setErrorMsg("");
    startCamera();
  }, [startCamera]);

  const downloadPhoto = useCallback((url: string, photo_id: string) => {
    const link    = document.createElement("a");
    link.href     = `/api/download?url=${encodeURIComponent(url)}`;
    link.download = `polaroid-${photo_id.slice(0, 8)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const showVideo = state === "camera" || state === "countdown" || state === "searching";

  return (
    <>
      <Head>
        <title>GALERIA PICBRAND</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={galleryStyles.container}>
        {/* Logos */}
        <div className={galleryStyles.topbar}>
          <Image src="/picbrand.png"  alt="PicBrand"  width={350} height={140} className={galleryStyles.logoImg} />
          <Image src="/nespresso.png" alt="Nespresso" width={350} height={140} className={galleryStyles.logoImg} />
        </div>

        {/* Títulos */}
        <header className={galleryStyles.header}>
          <h1 className={galleryStyles.title}>GALERIA PICBRAND</h1>
          <p className={galleryStyles.brandSub}>NESPRESSO</p>
          <p className={galleryStyles.subtitle}>Posicione seu rosto na câmera e clique em Iniciar</p>
        </header>

        {/* Câmera */}
        <div className={findStyles.container} style={{ minHeight: "unset", padding: 0 }}>
          <div
            className={`${findStyles.webcamWrapper} ${
              state === "countdown" ? findStyles.webcamCountdown : ""
            } ${state === "found" ? findStyles.webcamHidden : ""}`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={showVideo ? findStyles.videoVisible : findStyles.videoHidden}
            />

            {state === "starting" && (
              <div className={findStyles.webcamPlaceholder}>
                <span className={findStyles.spinnerLg} />
                <span>Iniciando câmera...</span>
              </div>
            )}

            {state === "countdown" && (
              <div className={findStyles.overlay}>
                <span className={findStyles.countdownNumber}>{countdown}</span>
                <span className={findStyles.overlayText}>Não tire o rosto da câmera</span>
              </div>
            )}

            {state === "searching" && (
              <div className={findStyles.overlay}>
                <span className={findStyles.spinnerLg} />
                <span className={findStyles.overlayText}>Aguarde, não tire o rosto da câmera...</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className={findStyles.canvas} />

          {state === "camera" && (
            <button className={findStyles.btnPrimary} onClick={handleIniciar}>
              Iniciar
            </button>
          )}

          {state === "error" && (
            <>
              <p className={findStyles.error}>{errorMsg}</p>
              <button className={findStyles.btnPrimary} onClick={reset}>
                Tentar novamente
              </button>
            </>
          )}

          {state === "found" && results.length === 0 && (
            <div className={findStyles.result}>
              <p className={findStyles.resultLabel}>Nenhuma foto encontrada, tente novamente</p>
              <button className={findStyles.btnSecondary} onClick={reset}>
                Tentar novamente
              </button>
            </div>
          )}

          {state === "found" && results.length > 0 && (
            <div className={findStyles.result}>
              <p className={findStyles.resultLabel}>
                Encontramos {results.length}{" "}
                {results.length === 1 ? "foto sua" : "fotos suas"}!
              </p>

              <div className={findStyles.resultGrid}>
                {results.map((photo) => (
                  <div
                    key={photo.photo_id}
                    className={findStyles.resultCard}
                    onClick={() => downloadPhoto(photo.url, photo.photo_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && downloadPhoto(photo.url, photo.photo_id)
                    }
                    title={`Confiança: ${photo.confidence.toFixed(0)}%`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="Polaroid" draggable={false} />
                    <div className={findStyles.downloadBadge}>⬇ Baixar</div>
                  </div>
                ))}
              </div>

              <button className={findStyles.btnSecondary} onClick={reset}>
                Buscar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
