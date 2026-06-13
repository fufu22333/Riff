import { createHmac } from "crypto";
import { z } from "zod";

import type { StorageBody, StoredSession, TurnStorage } from "./provider";

const requiredText = z.string().trim().min(1);

const qiniuEnvSchema = z.object({
  QINIU_ACCESS_KEY: requiredText,
  QINIU_SECRET_KEY: requiredText,
  QINIU_BUCKET: requiredText,
  QINIU_REGION: requiredText,
  QINIU_PUBLIC_DOMAIN: z.string().trim().url(),
  QINIU_UPLOAD_URL: z.string().trim().url().optional()
});

const uploadHosts: Record<string, string> = {
  z0: "https://upload.qiniup.com",
  z1: "https://upload-z1.qiniup.com",
  z2: "https://upload-z2.qiniup.com",
  na0: "https://upload-na0.qiniup.com",
  as0: "https://upload-as0.qiniup.com"
};

function urlSafeBase64(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

function createUploadToken(accessKey: string, secretKey: string, bucket: string, key: string) {
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const putPolicy = urlSafeBase64(
    JSON.stringify({
      scope: `${bucket}:${key}`,
      deadline
    })
  );
  const encodedSign = urlSafeBase64(createHmac("sha1", secretKey).update(putPolicy).digest());

  return `${accessKey}:${encodedSign}:${putPolicy}`;
}

async function bodyToBlob(body: StorageBody, contentType: string) {
  if (body instanceof Blob) {
    return body;
  }

  if (typeof body === "string") {
    return new Blob([body], { type: contentType });
  }

  const arrayBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;

  return new Blob([arrayBuffer], { type: contentType });
}

export function createQiniuTurnStorage(): TurnStorage {
  const env = qiniuEnvSchema.parse(process.env);
  const publicDomain = env.QINIU_PUBLIC_DOMAIN.replace(/\/$/, "");
  const uploadUrl = env.QINIU_UPLOAD_URL || uploadHosts[env.QINIU_REGION] || uploadHosts.z0;

  return {
    async write(key, body, contentType) {
      const formData = new FormData();
      formData.set("token", createUploadToken(env.QINIU_ACCESS_KEY, env.QINIU_SECRET_KEY, env.QINIU_BUCKET, key));
      formData.set("key", key);
      formData.set("file", await bodyToBlob(body, contentType), key.split("/").at(-1) ?? "riff-object");

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Qiniu upload failed for ${key} with ${response.status}`);
      }
    },
    publicUrl(key) {
      return `${publicDomain}/${key}`;
    },
    async readSession(key) {
      const response = await fetch(`${publicDomain}/${key}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as StoredSession;
    }
  };
}
