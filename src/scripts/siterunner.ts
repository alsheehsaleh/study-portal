import { proxy } from "./proxy";
import dummyProxy from "./encoding";

const siteRunnerFrame = document.getElementById("site-runner") as HTMLIFrameElement | null;

function toProxiedUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  if (proxy && typeof proxy.encodeUrl === "function") {
    return proxy.encodeUrl(normalized);
  }

  return dummyProxy.encodeUrl(normalized);
}

const url = new URLSearchParams(window.location.search).get("url");
if (url && siteRunnerFrame) {
  siteRunnerFrame.src = toProxiedUrl(url);
}
