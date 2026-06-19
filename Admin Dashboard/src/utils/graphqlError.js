/** Extrae y deduplica mensajes de error GraphQL / red */
export function formatGraphqlError(err) {
  if (!err) return "";
  const messages = [];

  if (err.graphQLErrors && err.graphQLErrors.length) {
    err.graphQLErrors.forEach(function (e) {
      if (e.message && messages.indexOf(e.message) === -1) {
        messages.push(e.message);
      }
    });
  }

  if (err.networkError && err.networkError.message) {
    if (messages.indexOf(err.networkError.message) === -1) {
      messages.push(err.networkError.message);
    }
  }

  if (err.message && messages.indexOf(err.message) === -1) {
    messages.push(err.message);
  }

  return messages.join(" ");
}

export function userFriendlyGraphqlMessage(message, t) {
  const msg = (message || "").replace(/^GraphQL error:\s*/i, "");
  if (isTransientServerError(msg)) {
    return t
      ? t("Server connection error retry")
      : "Error temporal del servidor. Reintentando…";
  }
  return msg;
}

export function isTransientServerError(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.indexOf("mongodb") !== -1 ||
    lower.indexOf("connection") !== -1 ||
    lower.indexOf("pool was force destroyed") !== -1 ||
    lower.indexOf("mongonetworkerror") !== -1 ||
    lower.indexOf("network error") !== -1
  );
}

export async function retryAsync(fn, attempts, delayMs) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = formatGraphqlError(e);
      if (!isTransientServerError(msg) || i === attempts - 1) {
        throw e;
      }
      await new Promise(function (resolve) {
        setTimeout(resolve, delayMs * (i + 1));
      });
    }
  }
  throw lastErr;
}
