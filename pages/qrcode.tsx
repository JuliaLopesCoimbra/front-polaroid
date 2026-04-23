import Head from "next/head";
import dynamic from "next/dynamic";
import styles from "../styles/QRCode.module.css";

// Import sem SSR — qrcode.react usa APIs do browser (canvas/svg)
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "Retrato PIC";
const EVENT_DATE = process.env.NEXT_PUBLIC_EVENT_DATE || "";

const WA_LINK =
  "https://wa.me/5511972936666?text=Resgate%20sua%20foto%20no%20link%20http%3A%2F%2F54.233.190.225";

export default function QRCodePage() {
  return (
    <>
      <Head>
        <title>QR Code — {EVENT_NAME}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.page}>
        <h1 className={styles.title}>
          Escaneie o QR Code para resgatar sua polaroid
        </h1>

        <div className={styles.qrWrapper}>
          <QRCodeSVG
            value={WA_LINK}
            size={400}
            bgColor="#FFFFFF"
            fgColor="#000000"
            level="H"
          />
        </div>

      </div>
    </>
  );
}
