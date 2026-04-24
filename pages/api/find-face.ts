import {
  RekognitionClient,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID!;

const rekognition = new RekognitionClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function existsInS3(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body as { image?: string };
  if (!image) {
    return res.status(400).json({ error: "Campo 'image' é obrigatório" });
  }

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Buffer.from(base64Data, "base64");

    const command = new SearchFacesByImageCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: imageBytes },
      MaxFaces: 100,
      FaceMatchThreshold: 50,
    });

    const response = await rekognition.send(command);
    const matches = response.FaceMatches ?? [];

    if (matches.length === 0) {
      return res
        .status(404)
        .json({ error: "Nenhuma foto encontrada para este rosto. Tente novamente." });
    }

    // Verifica no S3 quais fotos realmente existem (Rekognition pode ter entradas
    // órfãs de indexações anteriores cujo arquivo já não existe no bucket)
    const candidates = await Promise.all(
      matches.map(async (m) => {
        const photo_id = m.Face!.ExternalImageId!;
        const key = `polaroids/${photo_id}.png`;
        const exists = await existsInS3(key);
        if (!exists) return null;
        return {
          url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
          photo_id,
          confidence: m.Similarity!,
        };
      })
    );

    const photos = (candidates.filter(Boolean) as { url: string; photo_id: string; confidence: number }[])
      .sort((a, b) => b.confidence - a.confidence);

    if (photos.length === 0) {
      return res
        .status(404)
        .json({ error: "Nenhuma foto encontrada para este rosto. Tente novamente." });
    }

    return res.status(200).json({ photos });
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name ?? "";
    if (name === "InvalidParameterException") {
      return res.status(400).json({ error: "Nenhum rosto detectado na imagem." });
    }
    console.error("Rekognition error:", err);
    return res.status(500).json({ error: "Erro interno ao buscar rosto." });
  }
}
