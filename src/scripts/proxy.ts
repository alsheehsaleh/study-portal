// temp: change default to lib
const wispUrl =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.host +
  "/wisp/";
const bareUrl =
  (location.protocol === "https:" ? "https://" : "http://") +
  location.host +
  "/bare/";

let transport = "/libcurl/index.mjs";
if (localStorage.getItem("transport") === "lib") {
  transport = "/libcurl/index.mjs";
}

const { ScramjetController } =
  typeof $scramjet !== "undefined"
    ? ($scramjet as any)
    : {
        ScramjetController: class {
          init() {}
          encodeUrl(url: string) {
            if (!url) return url;
            return "/$/" + encodeURIComponent(url);
          }
        } as any,
      };

const scramjet = new ScramjetController({
  files: {
    wasm: "/learn/scramjet.wasm.wasm",
    all: "/learn/scramjet.all.js",
    sync: "/learn/scramjet.sync.js",
  },
  flags: {
    rewriterLogs: false,
    scramitize: false,
    cleanErrors: true,
    sourcemaps: true,
  },
  siteFlags: {},
  prefix: "/$/",
});

if (scramjet.init) scramjet.init();

export const swReady = new Promise<void>((resolve) => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        if (navigator.serviceWorker.controller) {
          resolve();
        } else {
          navigator.serviceWorker.addEventListener("controllerchange", () =>
            resolve()
          );
        }
      })
      .catch(() => resolve());
  } else {
    resolve();
  }
});

let bmc: any = null;

async function initBareMux() {
  try {
    const mod: any = await (Function(
      'return import("@mercurywork/bare-mux")'
    )() as Promise<any>).catch(() => null);
    const BareMuxConn =
      mod?.BareMuxConnection || (window as any).BareMuxConnection;
    if (!BareMuxConn) return;

    bmc = new BareMuxConn("/baremux/worker.js");
    if (!(await bmc.getTransport())) {
      await bmc.setTransport(transport, [{ wisp: wispUrl }]);
    }
  } catch {
    // Ignore if bare-mux isn't available at runtime
  }
}

initBareMux();

function getProxyEngine(): string {
  try {
    const settings = JSON.parse(localStorage.getItem("settings") || "{}");
    return settings.proxyEngine || "scramjet";
  } catch {
    return "scramjet";
  }
}

function encodeUrl(url: string): string {
  const engine = getProxyEngine();
  if (engine === "ultraviolet") {
    const encoded = uvXorEncode(url);
    return "/maths/" + encoded;
  }
  return scramjet.encodeUrl(url);
}

function uvXorEncode(str: string): string {
  if (!str) return str;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    if (i % 2) {
      result += String.fromCharCode(str.charCodeAt(i) ^ 2);
    } else {
      result += str[i];
    }
  }
  return encodeURIComponent(result);
}

function decodeProxiedUrl(proxiedUrl: string): string {
  const engine = getProxyEngine();
  if (engine === "ultraviolet" && proxiedUrl.includes("/maths/")) {
    const encoded = proxiedUrl.split("/maths/")[1];
    if (encoded) {
      return uvXorDecode(encoded);
    }
  }
  if (proxiedUrl.includes("/$/")) {
    return decodeURIComponent(proxiedUrl.split("/$/")[1] || "");
  }
  return proxiedUrl;
}

function uvXorDecode(str: string): string {
  if (!str) return str;
  const [input, ...search] = str.split("?");
  const decodedInput = decodeURIComponent(input);
  let result = "";
  for (let i = 0; i < decodedInput.length; i++) {
    if (i % 2) {
      result += String.fromCharCode(decodedInput.charCodeAt(i) ^ 2);
    } else {
      result += decodedInput[i];
    }
  }
  return result + (search.length ? "?" + search.join("?") : "");
}

function isProxiedUrl(url: string): boolean {
  return url.includes("/$/") || url.includes("/maths/");
}

function getProxyPrefix(): string {
  return getProxyEngine() === "ultraviolet" ? "/maths/" : "/$/";
}

export const proxy = {
  encodeUrl,
  decodeProxiedUrl,
  isProxiedUrl,
  getProxyPrefix,
  getProxyEngine,
  scramjet,
  get bmc() {
    return bmc;
  },
  swReady,
};