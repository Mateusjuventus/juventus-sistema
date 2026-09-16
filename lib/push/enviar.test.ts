import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { comTimeout } from "./enviar";

/**
 * `comTimeout` é o que impede um envio de push travado (endpoint lento/inacessível, sem timeout
 * próprio no `web-push`) de pendurar quem chamou pra sempre — ver o comentário em `./enviar.ts`. O
 * bug de verdade que isso corrige: criar uma Solicitação (ou qualquer outro documento que notifica
 * um assinante) ficava "carregando e não salvando" porque `criarNotificacao` esperava
 * (`await`) o push terminar antes de deixar a Server Action seguir em frente.
 */
describe("comTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolve com o valor da promessa quando ela termina antes do limite", async () => {
    const promessa = new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 100));
    const resultado = comTimeout(promessa, 5000);
    await vi.advanceTimersByTimeAsync(100);
    await expect(resultado).resolves.toBe("ok");
  });

  it("desiste de esperar (resolve `undefined`) quando a promessa nunca termina antes do limite", async () => {
    const promessaQueNuncaTermina = new Promise<string>(() => {
      /* nunca chama resolve/reject — simula um endpoint de push travado. */
    });
    const resultado = comTimeout(promessaQueNuncaTermina, 8000);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(resultado).resolves.toBeUndefined();
  });

  it("nunca rejeita, mesmo quando a promessa original rejeita antes do limite", async () => {
    const promessaComErro = new Promise<string>((_resolve, reject) =>
      setTimeout(() => reject(new Error("falha de rede")), 50),
    );
    const resultado = comTimeout(promessaComErro, 5000);
    await vi.advanceTimersByTimeAsync(50);
    await expect(resultado).resolves.toBeUndefined();
  });

  it("não continua esperando depois que o limite já desistiu, mesmo que a promessa termine bem depois", async () => {
    let jaResolveu = false;
    const promessaLenta = new Promise<string>((resolve) =>
      setTimeout(() => {
        jaResolveu = true;
        resolve("tarde demais");
      }, 20000),
    );
    const resultado = comTimeout(promessaLenta, 8000);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(resultado).resolves.toBeUndefined();
    expect(jaResolveu).toBe(false); // a promessa original segue rodando sozinha, só quem chamou não espera mais.
  });
});
