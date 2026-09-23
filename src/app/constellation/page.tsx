import { redirect } from "next/navigation";

/** 旧路由兼容：星图航线已迁至 /journey */
export default function ConstellationRedirectPage() {
  redirect("/journey");
}
