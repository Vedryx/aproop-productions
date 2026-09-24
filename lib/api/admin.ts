import { z } from "zod";
import { contentSchema, type Content } from "../admin/schema";
import { decodeAcknowledgement, requestJson } from "./http";

const uploadSchema = z.object({
  url: z.string().regex(/^\/media\/[a-f0-9]{24}$/),
});
type StarUpdate = { id: string; featured: boolean; revision: number };
const decodeContent = (data: unknown) => contentSchema.parse(data);

export const adminApi = {
  login(credentials: { email: string; password: string }) {
    return requestJson(
      "/api/admin/login",
      { method: "POST", json: credentials },
      decodeAcknowledgement,
    );
  },
  logout() {
    return requestJson(
      "/api/admin/logout",
      { method: "POST" },
      decodeAcknowledgement,
    );
  },
  saveContent(content: Content) {
    return requestJson(
      "/api/admin/content",
      { method: "PUT", json: content },
      decodeContent,
    );
  },
  setFeatured(update: StarUpdate) {
    return requestJson(
      "/api/admin/content",
      { method: "PATCH", json: update },
      decodeContent,
    );
  },
  uploadPoster(file: File) {
    return requestJson(
      "/api/admin/uploads",
      { method: "POST", body: file, headers: { "Content-Type": file.type } },
      (data) => uploadSchema.parse(data),
    );
  },
};
