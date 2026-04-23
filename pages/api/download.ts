import type { NextApiRequest, NextApiResponse } from "next";
import https from "https";
import http from "http";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url obrigatória" });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "url inválida" });
  }

  const client = parsedUrl.protocol === "https:" ? https : http;

  const proxyReq = client.get(parsedUrl.toString(), (proxyRes) => {
    const filename = `polaroid-${Date.now()}.jpg`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", proxyRes.headers["content-type"] || "image/jpeg");
    proxyRes.pipe(res);
  });

  proxyReq.on("error", () => {
    res.status(502).json({ error: "Falha ao buscar imagem" });
  });
}
