import { redirect } from "next/navigation";

/** 旧路由兼容：月下定信已迁至 /letter */
export default function VowRedirectPage() {
  redirect("/letter");
}
