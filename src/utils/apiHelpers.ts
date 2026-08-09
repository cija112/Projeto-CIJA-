// src/utils/apiHelpers.ts

export interface RespostaSegura<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  htmlRecebido: boolean;
  erroRede: boolean;
}

/**
 * Faz fetch com timeout e retry automático para 502/503/504
 * (cold start do Render, Cloudflare, etc.).
 */
export const fetchComTimeoutETentativa = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 120_000,
  tentativas = 2,
): Promise<Response> => {
  let ultimoErro: unknown;

  for (let i = 0; i < tentativas; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        keepalive: true,
      });
      clearTimeout(timer);

      if ([502, 503, 504].includes(res.status) && i < tentativas - 1) {
        await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
        continue;
      }
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      ultimoErro = err;

      if (err?.name === 'AbortError') {
        throw new Error(
          'A requisição excedeu o tempo limite. O servidor pode estar inicializando — tente novamente em alguns segundos.',
        );
      }
      if (i < tentativas - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
    }
  }

  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error('Falha de rede desconhecida.');
};

/**
 * Lê a resposta HTTP de forma segura: distingue JSON de HTML (página de erro)
 * e evita que `Unexpected token '<'` quebre a aplicação.
 */
export const lerRespostaComoJson = async <T = any>(
  res: Response,
): Promise<RespostaSegura<T>> => {
  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  const texto = await res.text();

  // Caso 1: resposta é JSON de verdade
  if (contentType.includes('application/json')) {
    try {
      return {
        ok: res.ok,
        status,
        data: JSON.parse(texto) as T,
        htmlRecebido: false,
        erroRede: false,
      };
    } catch {
      return {
        ok: false,
        status,
        data: { message: texto } as T,
        htmlRecebido: false,
        erroRede: false,
      };
    }
  }

  // Caso 2: servidor respondeu HTML (502/503/504 do Render, Cloudflare, etc.)
  if (
    texto.trim().startsWith('<!DOCTYPE') ||
    texto.trim().startsWith('<html')
  ) {
    return {
      ok: false,
      status,
      data: {
        message: `O servidor retornou uma página HTML (status ${status}). Provável cold start ou deploy em andamento.`,
      } as T,
      htmlRecebido: true,
      erroRede: false,
    };
  }

  // Caso 3: texto puro
  return {
    ok: res.ok,
    status,
    data: { message: texto } as T,
    htmlRecebido: false,
    erroRede: false,
  };
};

/**
 * Wrapper que combina fetch + leitura segura em uma única chamada.
 * Use isto no lugar de `fetch(...)` para todas as chamadas ao backend.
 */
export const fetchSeguro = async <T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 120_000,
  tentativas = 2,
): Promise<RespostaSegura<T>> => {
  try {
    const res = await fetchComTimeoutETentativa(
      url,
      options,
      timeoutMs,
      tentativas,
    );
    return await lerRespostaComoJson<T>(res);
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: { message: err?.message || 'Falha de rede' } as T,
      htmlRecebido: false,
      erroRede: true,
    };
  }
};
