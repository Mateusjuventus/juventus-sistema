import { JuventusCrest } from "@/components/juventus-crest";

/**
 * Link ANTIGO (pré-unificação) de autocadastro da Comissão Técnica/Diretoria — Futebol de Base.
 * Desde a unificação do link público (ver docs/superpowers/specs/2026-10-28-unificacao-comissao-
 * tecnica-design.md), o cadastro público passou a ser um único link, `/cadastro-comissao-tecnica`
 * — a pessoa escolhe sua(s) categoria(s) (incluindo "Profissional") no próprio formulário.
 *
 * Esta rota fica PERMANENTEMENTE desativada a partir de agora: sempre mostra "cadastro fechado",
 * sem nenhuma leitura de configuração e sem redirecionamento automático pro link novo — pedido
 * explícito do Mateus ("alias desativar sem redirecionar"). Mantida só pra quem ainda tenha esse
 * link antigo salvo ou compartilhado não cair numa página quebrada.
 */
export default function CadastroComissaoTecnicaBasePublicoPage() {
  return (
    <main className="min-h-screen bg-grena-escuro px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <JuventusCrest className="h-24 w-auto drop-shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-white">Juventus - SAF</h1>
          <p className="mt-1 text-sm text-white/70">Cadastro de Comissão Técnica/Diretoria — Futebol de Base</p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="py-8 text-center">
            <p className="text-lg font-semibold text-grena-escuro">Este link não está mais em uso</p>
            <p className="mt-2 text-sm text-neutral-500">
              Fale com o responsável do Futebol de Base ou do Futebol Profissional para saber como
              enviar seu cadastro.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
