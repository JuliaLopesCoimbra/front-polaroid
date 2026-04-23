import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { _Object } from "@aws-sdk/client-s3";
import type { NextApiRequest, NextApiResponse } from "next";

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function listAllObjects(): Promise<_Object[]> {
  const all: _Object[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: "polaroids/",
        ContinuationToken: token,
      })
    );
    all.push(...(res.Contents ?? []));
    token = res.NextContinuationToken;
  } while (token);
  return all;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || 10);

  try {
    const objects = await listAllObjects();

    const all = objects
      .filter((obj) => obj.Key && obj.Key !== "polaroids/")
      .map((obj) => {
        const photo_id = obj.Key!.replace("polaroids/", "").replace(/\.png$/, "");
        return {
          url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${obj.Key}`,
          photo_id,
          timestamp: obj.LastModified?.toISOString() ?? "",
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total      = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage   = Math.min(page, totalPages);
    const start      = (safePage - 1) * limit;
    const photos     = all.slice(start, start + limit);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(200).json({
      photos,
      total,
      page:       safePage,
      totalPages,
      hasNext:    safePage < totalPages,
      hasPrev:    safePage > 1,
    });
  } catch (err) {
    console.error("S3 list error:", err);
    return res.status(500).json({ error: "Falha ao listar fotos" });
  }
}
