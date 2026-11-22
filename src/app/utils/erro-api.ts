// Extrai a mensagem que a API (NestJS) devolveu no corpo do erro.
// Ex.: { "message": "Token inválido ou expirado.", "error": "Unauthorized", "statusCode": 401 }
// Quando o ValidationPipe rejeita campos, "message" vem como lista: juntamos todas.
// Se a API não devolveu mensagem (ex.: servidor fora do ar), usa a mensagem padrão.
export function mensagemDaApi(erro: any, mensagemPadrao: string): string {
  const msg = erro?.error?.message;

  if (Array.isArray(msg) && msg.length) {
    return msg.join('; ');
  }
  if (typeof msg === 'string' && msg.trim()) {
    return msg;
  }
  return mensagemPadrao;
}
