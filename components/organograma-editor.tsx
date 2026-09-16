"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ALTURA_CAIXA,
  ALTURA_ITEM_CARTAO,
  ALTURA_TITULO_CARTAO,
  LARGURA_CAIXA,
  LARGURA_CARTAO,
  PADDING_CARTAO_V,
  agruparLinhasPorSupervisor,
  alturaCartao,
  calcularConectores,
  calcularLayoutAutomatico,
  cartoesConectadosDoLayout,
  contarCartoesPorPessoaVinculada,
  corNomeCartao,
  mesclarPosicoesCartaoManual,
  type OrganogramaCartaoInfo,
  type OrganogramaCartaoPosicaoManual,
  type OrganogramaNo,
} from "@/lib/futebol/organograma";
import { DeleteButton } from "@/components/delete-button";

export interface OrganogramaNoFormState {
  error?: string;
  success?: boolean;
}

export interface OrganogramaNoData {
  id: string;
  comissaoTecnicaBaseId: string | null;
  nome: string | null;
  cargo: string | null;
  grupo: string | null;
  linha: string | null;
  reportaPara: string | null;
  ordem: number;
  posX: number | null;
  posY: number | null;
  /** `true` só quando `posX`/`posY` veio de um arrasto manual. Só importa pra caixa de liderança —
   * qualquer caixa com `grupo` (cartão de comissão/departamento, ou o solo legado) é SEMPRE
   * posicionada automaticamente, nunca arrastada (ver docs/superpowers/specs/2026-09-15-organograma-
   * cartoes-por-comissao-design.md, item 4). */
  posManual: boolean;
  /** Já resolvidos pela página (join com `comissao_tecnica_base`) — evita repetir a lógica de "qual
   * nome/cargo mostrar" aqui dentro. */
  nomeExibido: string;
  cargoExibido: string;
  vaga: boolean;
}

export interface PessoaComissao {
  id: string;
  nome: string;
  cargo: string;
}

export interface LinhaSupervisor {
  linha: string;
  reportaPara: string | null;
  /** Posição arrastada pro cartão inteiro dessa linha; `null`/`false` = layout automático decide
   * (mesmo princípio de `OrganogramaNoData.posX/posY/posManual` pra uma caixa de liderança — ver
   * migration 0109 e `moverCartaoOrganograma`). */
  posX: number | null;
  posY: number | null;
  posManual: boolean;
}

const PADDING = 40;

/** Linhas padrão que sempre aparecem pra escolher, mesmo antes de qualquer caixa usar — pedido do
 * Mateus pra não precisar digitar (e arriscar digitar diferente do que já existe) toda vez que
 * cria uma caixa na Comissão Sub20/Sub17 etc. Some com o "+ Outra..." pra ainda dar pra criar uma
 * linha nova quando precisar (ex.: uma categoria que ainda não existe aqui). */
const LINHAS_PADRAO = ["Comissão Sub20", "Comissão Sub17", "Operacional", "Administrativo"];
const VALOR_OUTRA = "__outra__";

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

/** Cor de texto (classe Tailwind) pra cada resultado de `corNomeCartao` — só o mapeamento pra CSS
 * fica aqui; a REGRA de qual cor usar é a mesma função compartilhada com o PDF. */
function classeCorNome(cor: "normal" | "dourado" | "vermelho"): string {
  if (cor === "dourado") return "text-dourado";
  if (cor === "vermelho") return "text-red-600";
  return "text-grena-escuro";
}

/**
 * Campo isolado "Essa comissão reporta para" — muda o supervisor de uma `linha` inteira (todas as
 * pessoas daquele cartão), separado do formulário principal porque é uma propriedade da LINHA, não
 * de uma pessoa específica dela. Salva assim que muda a seleção (mesmo padrão do "Mover linha").
 */
function SupervisorDaLinha({
  linha,
  valorAtual,
  opcoesLideranca,
  action,
}: {
  linha: string;
  valorAtual: string | null;
  opcoesLideranca: OrganogramaNoData[];
  action: (linha: string, reportaPara: string | null) => Promise<{ error?: string }>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  return (
    <div className="mt-3">
      <label className="field-label">Essa comissão reporta para</label>
      <select
        className="field-input"
        defaultValue={valorAtual ?? ""}
        disabled={salvando}
        onChange={async (e) => {
          setSalvando(true);
          const resultado = await action(linha, e.target.value || null);
          setSalvando(false);
          setErro(resultado.error ?? null);
        }}
      >
        <option value="">— sem supervisor definido —</option>
        {opcoesLideranca.map((n) => (
          <option key={n.id} value={n.id}>
            {n.nomeExibido} — {n.cargoExibido}
          </option>
        ))}
      </select>
      {erro ? <p className="mt-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
      <p className="mt-1 text-xs text-neutral-400">
        Vale pra comissão inteira (todo mundo listado nesse cartão), não só pra essa pessoa.
      </p>
    </div>
  );
}

/**
 * Painel de criar/editar uma caixa, em etapas (ver docs/superpowers/specs/2026-09-15-organograma-
 * cartoes-por-comissao-design.md, item 7): "o que está criando" decide o resto — só aparece campo
 * de Função/Comissão pra quem é de uma Comissão/Departamento, só aparece "Reporta para" repetido
 * quando ainda faz sentido perguntar (Liderança sempre; Comissão/Departamento só na primeira pessoa
 * daquela linha). Editando uma caixa já existente, o tipo já está decidido pelos dados dela — pula
 * direto pros campos que já fazem sentido.
 */
function PainelEdicao({
  no,
  todosOsNos,
  linhasReportaPara,
  linhasIrmas,
  pessoasDisponiveis,
  filhosCount,
  salvarAction,
  excluirAction,
  moverLinhaAction,
  definirSupervisorLinhaAction,
  aoFechar,
}: {
  no: OrganogramaNoData | null;
  todosOsNos: OrganogramaNoData[];
  linhasReportaPara: LinhaSupervisor[];
  /** Só as linhas que são IRMÃS DE VERDADE da linha sendo editada (mesmo supervisor — ver
   * `agruparLinhasPorSupervisor`), já na ordem de exibição. "Mover linha pra cima/baixo" só faz
   * sentido comparado com essas: uma linha de outro supervisor nem é vizinha dela no desenho. */
  linhasIrmas: string[];
  pessoasDisponiveis: PessoaComissao[];
  filhosCount: number;
  salvarAction: (prevState: OrganogramaNoFormState, formData: FormData) => Promise<OrganogramaNoFormState>;
  excluirAction: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  moverLinhaAction: (linha: string, direcao: "cima" | "baixo") => Promise<{ error?: string }>;
  definirSupervisorLinhaAction: (linha: string, reportaPara: string | null) => Promise<{ error?: string }>;
  aoFechar: () => void;
}) {
  const [state, formAction] = useFormState(salvarAction, {} as OrganogramaNoFormState);
  const [vinculada, setVinculada] = useState(no?.comissaoTecnicaBaseId ?? "");
  // O painel some do jeito que aparece: ao lado do organograma em telas largas, ABAIXO dele (fora
  // da área visível, sem rolar mais nada) em telas estreitas ou quando o organograma tem muitas
  // caixas. Rola até o painel sozinho toda vez que ele abre ou troca de caixa.
  const painelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    painelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Feedback do "Mover linha pra cima/baixo" — os botões já movem na hora (sem precisar de um botão
  // de Salvar à parte), mas antes um erro do Supabase aí desaparecia em silêncio.
  const [statusMoverLinha, setStatusMoverLinha] = useState<{ tipo: "movendo" | "erro"; texto?: string } | null>(
    null,
  );
  async function moverLinha(direcao: "cima" | "baixo") {
    if (!no?.linha) return;
    setStatusMoverLinha({ tipo: "movendo" });
    const resultado = await moverLinhaAction(no.linha, direcao);
    setStatusMoverLinha(resultado.error ? { tipo: "erro", texto: resultado.error } : null);
  }

  // --- Etapa 1: "o que está criando" — só pra caixa NOVA. Editando, o tipo já está decidido pelos
  // dados existentes (tem `grupo` → cartão; não tem → liderança). ---
  const criandoNovo = no === null;
  const [tipoNovo, setTipoNovo] = useState<"lideranca" | "comissao" | "departamento" | null>(null);
  const tipoCaixa: "lideranca" | "cartao" | null = criandoNovo
    ? tipoNovo === "lideranca"
      ? "lideranca"
      : tipoNovo
        ? "cartao"
        : null
    : no!.grupo
      ? "cartao"
      : "lideranca";

  const [grupoValor, setGrupoValor] = useState(no?.grupo ?? "");
  const [linhaValor, setLinhaValor] = useState(no?.linha ?? "");
  // Mesmo raciocínio de sempre: os dois viraram `<select>` de verdade (nunca texto livre) pra nunca
  // criar uma coluna/linha "quase igual" por um espaço ou acento digitado diferente.
  const [grupoEhOutro, setGrupoEhOutro] = useState(false);
  const [linhaEhOutra, setLinhaEhOutra] = useState(false);
  // Muda toda vez que uma caixa NOVA de cartão é criada com sucesso — força o `<form>` a remontar
  // (limpando Nome/Cargo/Reporta para) sem mexer em Função/Linha, que ficam preenchidas de propósito
  // pra adicionar a próxima pessoa da mesma comissão em seguida.
  const [formResetKey, setFormResetKey] = useState(0);

  useEffect(() => {
    if (!state.success) return;
    if (!no && grupoValor.trim() && linhaValor.trim()) {
      setVinculada("");
      setFormResetKey((k) => k + 1);
    } else {
      aoFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Só caixa de liderança pode ser alvo de "reporta para" — é a única que o desenho sabe desenhar
  // um conector até (cartão é sempre resolvido via a linha inteira, não pessoa a pessoa).
  const opcoesLideranca = todosOsNos.filter((n) => !n.grupo && n.id !== no?.id);

  // Onde cada pessoa da Comissão Técnica já está vinculada no organograma (fora da própria caixa
  // sendo editada) — mostrado junto ao nome dela no seletor abaixo, sem impedir vincular de novo
  // (ex.: um técnico que atende Sub15 e Sub17 precisa de uma caixa em cada).
  const usosPorPessoa = new Map<string, string[]>();
  for (const n of todosOsNos) {
    if (!n.comissaoTecnicaBaseId || n.id === no?.id) continue;
    const rotulo = n.grupo ? (n.linha ? `${n.grupo} · ${n.linha}` : n.grupo) : "liderança";
    usosPorPessoa.set(n.comissaoTecnicaBaseId, [...(usosPorPessoa.get(n.comissaoTecnicaBaseId) ?? []), rotulo]);
  }

  const gruposExistentes = [...new Set(todosOsNos.map((n) => n.grupo).filter((g): g is string => !!g))].sort();
  const linhasExistentes = [...new Set(todosOsNos.map((n) => n.linha).filter((l): l is string => !!l))].sort();
  const opcoesLinha = [...new Set([...LINHAS_PADRAO, ...linhasExistentes])].sort();
  const rotuloNovaLinha =
    tipoNovo === "departamento" ? "+ Novo departamento (digitar)..." : "+ Nova comissão (digitar)...";
  const rotuloLinha = tipoNovo === "departamento" ? "Departamento" : tipoNovo === "comissao" ? "Comissão" : "Comissão/Departamento";

  // Visibilidade de cada bloco — é isso que faz o formulário se revelar em etapas:
  const mostrarPessoa = criandoNovo ? tipoNovo !== null : true;
  const mostrarGrupoLinha = tipoCaixa === "cartao";
  // Linha nova de verdade (ninguém mais usa ainda) — só aí faz sentido perguntar o supervisor JUNTO
  // com essa caixa; escolhendo uma linha já existente, o supervisor dela já foi decidido antes (edita
  // depois em "Essa comissão reporta para").
  const linhaEhNova = mostrarGrupoLinha && linhaValor.trim() !== "" && !linhasExistentes.includes(linhaValor.trim());
  // Solo (tem Função mas nunca teve Comissão/Departamento) continua usando o "Reporta para" clássico,
  // por pessoa — é o mesmo mecanismo de sempre, só que agora também é assim que um cartão de 1 item
  // só liga pro supervisor dele.
  const ehSolo = mostrarGrupoLinha && linhaValor.trim() === "";
  const mostrarReportaParaNo = tipoCaixa === "lideranca" || ehSolo;
  const mostrarReportaParaNovaLinha = mostrarGrupoLinha && linhaEhNova;

  const ehCelulaDeGradeExistente = Boolean(no && no.grupo && no.linha);
  const posicaoDaLinha = no?.linha ? linhasIrmas.indexOf(no.linha) : -1;
  const supervisorAtualDaLinha = no?.linha ? (linhasReportaPara.find((l) => l.linha === no.linha)?.reportaPara ?? null) : null;

  return (
    <div ref={painelRef} className="card w-full max-w-sm shrink-0 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-grena-escuro">{no ? "Editar caixa" : "Nova caixa"}</h3>
        <button type="button" onClick={aoFechar} className="text-sm text-neutral-400 hover:text-neutral-600">
          Fechar
        </button>
      </div>

      {state.error ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      {criandoNovo ? (
        <div className="mt-3">
          <label className="field-label">O que você está criando?</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["lideranca", "Liderança"],
                ["comissao", "Alguém de uma Comissão"],
                ["departamento", "Alguém de um Departamento"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                className={`btn-secondary text-sm ${tipoNovo === valor ? "ring-2 ring-dourado" : ""}`}
                onClick={() => setTipoNovo(valor)}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form key={formResetKey} action={formAction} className="mt-3 space-y-3">
        {no ? <input type="hidden" name="id" value={no.id} /> : null}

        {mostrarPessoa ? (
          <>
            <div>
              <label className="field-label">Pessoa da Comissão Técnica</label>
              <select
                name="comissaoTecnicaBaseId"
                className="field-input"
                value={vinculada}
                onChange={(e) => setVinculada(e.target.value)}
              >
                <option value="">— sem vínculo (preencher à mão) —</option>
                {pessoasDisponiveis.map((p) => {
                  const usos = usosPorPessoa.get(p.id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {p.cargo}
                      {usos ? ` (já em: ${usos.join(", ")})` : ""}
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-xs text-neutral-400">
                Vinculando, nome e cargo vêm sempre do cadastro — se ela mudar lá, muda aqui também. Dá
                pra vincular a mesma pessoa em mais de uma caixa (ex.: um técnico que atende Sub15 e
                Sub17).
              </p>
            </div>

            {!vinculada ? (
              <>
                <div>
                  <label className="field-label">Nome</label>
                  <input
                    name="nome"
                    className="field-input"
                    placeholder='Ex.: "A contratar" pra sinalizar uma vaga em aberto'
                    defaultValue={no?.nome ?? ""}
                  />
                </div>
                <div>
                  <label className="field-label">Cargo</label>
                  <input
                    name="cargo"
                    className="field-input"
                    placeholder="Ex.: Presidente, Treinador Sub14/13..."
                    defaultValue={no?.cargo ?? ""}
                  />
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {mostrarGrupoLinha ? (
          <div className="rounded-md border border-linha p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
              Onde fica no organograma
            </p>
            <div className="space-y-3">
              <div>
                <label className="field-label">Função</label>
                <select
                  className="field-input"
                  value={grupoEhOutro ? VALOR_OUTRA : grupoValor}
                  onChange={(e) => {
                    if (e.target.value === VALOR_OUTRA) {
                      setGrupoEhOutro(true);
                      setGrupoValor("");
                    } else {
                      setGrupoEhOutro(false);
                      setGrupoValor(e.target.value);
                    }
                  }}
                >
                  <option value="">— escolha —</option>
                  {gruposExistentes.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value={VALOR_OUTRA}>+ Nova função (digitar)...</option>
                </select>
                {grupoEhOutro ? (
                  <input
                    autoFocus
                    className="field-input mt-2"
                    placeholder="Digite o nome da nova função"
                    value={grupoValor}
                    onChange={(e) => setGrupoValor(e.target.value)}
                  />
                ) : null}
                <input type="hidden" name="grupo" value={grupoValor} />
              </div>

              <div>
                <label className="field-label">{rotuloLinha}</label>
                <select
                  className="field-input"
                  value={linhaEhOutra ? VALOR_OUTRA : linhaValor}
                  onChange={(e) => {
                    if (e.target.value === VALOR_OUTRA) {
                      setLinhaEhOutra(true);
                      setLinhaValor("");
                    } else {
                      setLinhaEhOutra(false);
                      setLinhaValor(e.target.value);
                    }
                  }}
                >
                  <option value="">— escolha —</option>
                  {opcoesLinha.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                  <option value={VALOR_OUTRA}>{rotuloNovaLinha}</option>
                </select>
                {linhaEhOutra ? (
                  <input
                    autoFocus
                    className="field-input mt-2"
                    placeholder={`Digite o nome d${tipoNovo === "departamento" ? "o" : "a"} nov${tipoNovo === "departamento" ? "o" : "a"} ${tipoNovo === "departamento" ? "departamento" : "comissão"}`}
                    value={linhaValor}
                    onChange={(e) => setLinhaValor(e.target.value)}
                  />
                ) : null}
                <input type="hidden" name="linha" value={linhaValor} />
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Todo mundo com a mesma {rotuloLinha.toLowerCase()} vira um cartão só, com a Função como
              rótulo de cada linha da lista.
            </p>
          </div>
        ) : null}

        {mostrarReportaParaNovaLinha ? (
          <div>
            <label className="field-label">Reporta para</label>
            <select name="novaLinhaReportaPara" className="field-input" defaultValue="">
              <option value="">— sem supervisor definido —</option>
              {opcoesLideranca.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nomeExibido} — {n.cargoExibido}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-400">
              Só perguntado uma vez, aqui na primeira pessoa dessa {rotuloLinha.toLowerCase()} — dá pra
              trocar depois em &quot;Essa comissão reporta para&quot;, editando qualquer pessoa dela.
            </p>
          </div>
        ) : null}

        {ehCelulaDeGradeExistente ? (
          <div>
            <label className="field-label">Posição da linha &quot;{no!.linha}&quot;</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={posicaoDaLinha <= 0 || statusMoverLinha?.tipo === "movendo"}
                onClick={() => void moverLinha("cima")}
                title={posicaoDaLinha <= 0 ? "Essa linha já é a primeira — não tem pra onde subir." : undefined}
              >
                ▲ Mover linha pra cima
              </button>
              <button
                type="button"
                className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={
                  posicaoDaLinha === -1 || posicaoDaLinha >= linhasIrmas.length - 1 || statusMoverLinha?.tipo === "movendo"
                }
                onClick={() => void moverLinha("baixo")}
                title={
                  posicaoDaLinha !== -1 && posicaoDaLinha >= linhasIrmas.length - 1
                    ? "Essa linha já é a última — não tem pra onde descer."
                    : undefined
                }
              >
                ▼ Mover linha pra baixo
              </button>
            </div>
            {statusMoverLinha?.tipo === "erro" ? (
              <p className="mt-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{statusMoverLinha.texto}</p>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">
                Move a linha inteira &quot;{no!.linha}&quot; — todo o cartão sobe ou desce entre as
                comissões do MESMO supervisor, sem precisar digitar número nem salvar: já move na hora.
                {linhasIrmas.length <= 1
                  ? " Os botões ficam desativados enquanto essa for a única comissão desse supervisor — assim que houver outra, dá pra reordenar."
                  : ""}
              </p>
            )}
            <SupervisorDaLinha
              linha={no!.linha!}
              valorAtual={supervisorAtualDaLinha}
              opcoesLideranca={opcoesLideranca}
              action={definirSupervisorLinhaAction}
            />
          </div>
        ) : null}

        {mostrarReportaParaNo ? (
          <div>
            <label className="field-label">Reporta para</label>
            <select name="reportaPara" className="field-input" defaultValue={no?.reportaPara ?? ""}>
              <option value="">— topo do organograma —</option>
              {opcoesLideranca.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nomeExibido} — {n.cargoExibido}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex justify-end border-t border-linha pt-3">
          <SalvarButton />
        </div>
      </form>

      {/* Fora do <form> de propósito — um <form> dentro de outro <form> não é válido em HTML. */}
      {no ? (
        <div className="mt-3 flex justify-start border-t border-linha pt-3">
          <DeleteButton
            errorAction={excluirAction}
            id={no.id}
            entityLabel={
              filhosCount > 0
                ? `caixa (${filhosCount} pessoa${filhosCount === 1 ? "" : "s"}/comissão${
                    filhosCount === 1 ? "" : "ões"
                  } ficaria${filhosCount === 1 ? "" : "m"} sem líder direto)`
                : "caixa"
            }
          />
        </div>
      ) : null}
    </div>
  );
}

/** Uma caixa de LIDERANÇA (Presidente, Diretor, Coordenador, Supervisor...) — grená, arrastável. */
function CaixaLideranca({
  no,
  x,
  y,
  selecionada,
  onPointerDownCaixa,
  onClick,
}: {
  no: OrganogramaNoData;
  x: number;
  y: number;
  selecionada: boolean;
  onPointerDownCaixa: (e: React.PointerEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDownCaixa}
      onClick={onClick}
      style={{ left: x, top: y, width: LARGURA_CAIXA, height: ALTURA_CAIXA }}
      className={`absolute flex select-none flex-col justify-center overflow-hidden rounded-md bg-grena p-3 text-white shadow-sm cursor-grab active:cursor-grabbing ${
        selecionada ? "ring-2 ring-dourado" : ""
      } ${no.vaga ? "opacity-60" : ""}`}
    >
      <p className="line-clamp-2 break-words text-sm font-bold leading-tight text-white">{no.nomeExibido}</p>
      <p className="line-clamp-2 break-words text-xs leading-tight text-white/80">{no.cargoExibido}</p>
    </div>
  );
}

/** Um cartão de comissão/departamento: título grená com o nome da linha, lista vertical de
 * função→pessoa por baixo — um item por caixa (`organograma_base`) que pertence àquela linha. Cada
 * ITEM é clicável pra editar; o TÍTULO (faixa grená) é a alça de arrasto do cartão inteiro — pedido
 * do Mateus de 16/09: antes o cartão nunca podia ser arrastado (posição sempre calculada), só dava
 * pra reordenar entre comissões do MESMO supervisor. */
function CartaoComissao({
  cartao,
  itens,
  x,
  y,
  selecionadoId,
  contagemPorPessoa,
  onClickItem,
  onPointerDownTitulo,
}: {
  cartao: OrganogramaCartaoInfo;
  itens: OrganogramaNoData[];
  x: number;
  y: number;
  selecionadoId: string | null;
  contagemPorPessoa: Map<string, number>;
  onClickItem: (id: string) => void;
  onPointerDownTitulo: (e: React.PointerEvent) => void;
}) {
  const altura = alturaCartao(itens.length);
  return (
    <div
      style={{ left: x, top: y, width: LARGURA_CARTAO, height: altura }}
      className="absolute overflow-hidden rounded-md border border-linha bg-white shadow-sm"
    >
      <div
        onPointerDown={onPointerDownTitulo}
        style={{ height: ALTURA_TITULO_CARTAO }}
        className="flex select-none items-center justify-center bg-grena px-2 text-center text-xs font-bold uppercase tracking-wide text-white cursor-grab active:cursor-grabbing"
      >
        <span className="truncate">{cartao.titulo}</span>
      </div>
      <div style={{ padding: PADDING_CARTAO_V }}>
        {itens.map((n) => {
          const vinculadoDuplicado = n.comissaoTecnicaBaseId
            ? (contagemPorPessoa.get(n.comissaoTecnicaBaseId) ?? 0) >= 2
            : false;
          const cor = corNomeCartao(n.comissaoTecnicaBaseId ? null : n.nomeExibido, vinculadoDuplicado);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onClickItem(n.id)}
              style={{ height: ALTURA_ITEM_CARTAO }}
              className={`flex w-full flex-col justify-center rounded px-1 text-left hover:bg-neutral-50 ${
                selecionadoId === n.id ? "ring-2 ring-dourado" : ""
              } ${n.vaga ? "opacity-60" : ""}`}
            >
              <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-neutral-500">
                {n.grupo}
              </p>
              <p className={`truncate text-xs font-semibold ${classeCorNome(cor)}`}>{n.nomeExibido}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Botão "Reorganizar automaticamente" — solta todo mundo que foi arrastado de volta pro layout
 * automático. Confirmação em duas etapas (mesmo padrão do `DeleteButton`, sem `window.confirm`).
 */
function ReorganizarButton({ reorganizarAction }: { reorganizarAction: () => Promise<{ error?: string }> }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, setEstado] = useState<{ pendente: boolean; erro?: string }>({ pendente: false });

  if (!confirmando) {
    return (
      <button type="button" className="btn-secondary text-sm" onClick={() => setConfirmando(true)}>
        Reorganizar automaticamente
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2">
        <span className="text-sm text-amber-800">
          Solta todas as caixas e cartões arrastados de volta pro lugar automático. Confirma?
        </span>
        <button
          type="button"
          className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={estado.pendente}
          onClick={async () => {
            setEstado({ pendente: true });
            const resultado = await reorganizarAction();
            setEstado({ pendente: false, erro: resultado.error });
            if (!resultado.error) setConfirmando(false);
          }}
        >
          {estado.pendente ? "Reorganizando..." : "Sim, reorganizar"}
        </button>
        <button type="button" className="btn-secondary text-sm" onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
      </div>
      {estado.erro ? <p className="max-w-xs text-right text-xs text-red-700">{estado.erro}</p> : null}
    </div>
  );
}

/**
 * Organograma do Futebol de Base: um cartão por comissão/departamento (título = nome da linha, lista
 * vertical de função→pessoa embaixo), com supervisores como um nível de liderança de verdade — ver
 * docs/superpowers/specs/2026-09-15-organograma-cartoes-por-comissao-design.md. Só a caixa de
 * liderança se arrasta; todo cartão é sempre posicionado automaticamente. Sem escala automática: o
 * desenho aparece em tamanho normal de leitura, com rolagem quando não cabe.
 */
export function OrganogramaEditor({
  nos,
  pessoasComissao,
  linhasReportaPara,
  salvarAction,
  moverAction,
  moverCartaoAction,
  excluirAction,
  moverLinhaAction,
  definirSupervisorLinhaAction,
  reorganizarAction,
}: {
  nos: OrganogramaNoData[];
  pessoasComissao: PessoaComissao[];
  linhasReportaPara: LinhaSupervisor[];
  salvarAction: (prevState: OrganogramaNoFormState, formData: FormData) => Promise<OrganogramaNoFormState>;
  moverAction: (id: string, x: number, y: number) => Promise<{ error?: string }>;
  moverCartaoAction: (chave: string, x: number, y: number) => Promise<{ error?: string }>;
  excluirAction: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  moverLinhaAction: (linha: string, direcao: "cima" | "baixo") => Promise<{ error?: string }>;
  definirSupervisorLinhaAction: (linha: string, reportaPara: string | null) => Promise<{ error?: string }>;
  reorganizarAction: () => Promise<{ error?: string }>;
}) {
  const [selecionado, setSelecionado] = useState<string | "novo" | null>(null);

  // Depois de excluir com sucesso, a página revalida e `nos` chega sem aquela caixa — se o painel
  // ainda estiver aberto nela, fecha sozinho.
  useEffect(() => {
    if (selecionado && selecionado !== "novo" && !nos.some((n) => n.id === selecionado)) {
      setSelecionado(null);
    }
  }, [nos, selecionado]);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  // Mesma ideia de `overrides`, mas por `chave` de CARTÃO em vez de id de caixa de liderança —
  // separado porque as duas coisas nunca colidem (uuid vs. texto da linha/"solo:<uuid>") mas usam
  // ações e mapas de posição diferentes.
  const [overridesCartao, setOverridesCartao] = useState<Record<string, { x: number; y: number }>>({});
  const [erroArrasto, setErroArrasto] = useState<string | null>(null);
  const arrastoRef = useRef<{ id: string; inicioX: number; inicioY: number; origemX: number; origemY: number } | null>(
    null,
  );
  const arrastoCartaoRef = useRef<{
    chave: string;
    inicioX: number;
    inicioY: number;
    origemX: number;
    origemY: number;
  } | null>(null);

  // Assim que dados novos chegam do servidor, descarta as posições otimistas locais (mesmo raciocínio
  // de sempre — sem isso uma posição arrastada ficava presa na memória do navegador pra sempre).
  useEffect(() => {
    setOverrides({});
    setOverridesCartao({});
  }, [nos, linhasReportaPara]);

  const linhaReportaParaMap = useMemo(
    () => new Map(linhasReportaPara.map((l) => [l.linha, l.reportaPara])),
    [linhasReportaPara],
  );

  const layout = useMemo(
    () =>
      calcularLayoutAutomatico(
        nos.map(
          (n): OrganogramaNo => ({
            id: n.id,
            reportaPara: n.reportaPara,
            grupo: n.grupo,
            linha: n.linha,
            ordem: n.ordem,
          }),
        ),
        linhaReportaParaMap,
      ),
    [nos, linhaReportaParaMap],
  );

  const nosPorId = useMemo(() => new Map(nos.map((n) => [n.id, n])), [nos]);

  // Posição de cada caixa de LIDERANÇA — arrasto/posição salva manda; layout automático só decide
  // quem nunca foi arrastada.
  const posicoesLideranca = useMemo(() => {
    const mapa = new Map<string, { x: number; y: number }>();
    for (const no of nos) {
      if (no.grupo) continue;
      const override = overrides[no.id];
      if (override) mapa.set(no.id, override);
      else if (no.posX !== null && no.posY !== null) mapa.set(no.id, { x: no.posX, y: no.posY });
      else mapa.set(no.id, layout.posicoesLideranca.get(no.id) ?? { x: 0, y: 0 });
    }
    return mapa;
  }, [nos, overrides, layout]);

  // Posição de cada CARTÃO — mesmo princípio acima, arrasto em progresso (`overridesCartao`) vence
  // posição salva (`organograma_base_linha.pos_x/pos_y` pra um cartão agrupado, ou a própria
  // `organograma_base.pos_x/pos_y` pra um cartão solo), que vence o layout automático. Reaproveita
  // `mesclarPosicoesCartaoManual` (mesma função do PDF) pra nunca divergir.
  const posicoesCartaoSalvas: OrganogramaCartaoPosicaoManual[] = useMemo(() => {
    const salvas: OrganogramaCartaoPosicaoManual[] = [];
    for (const l of linhasReportaPara) {
      if (l.posManual && l.posX !== null && l.posY !== null) salvas.push({ chave: l.linha, x: l.posX, y: l.posY });
    }
    for (const no of nos) {
      if (no.grupo && !no.linha && no.posManual && no.posX !== null && no.posY !== null) {
        salvas.push({ chave: `solo:${no.id}`, x: no.posX, y: no.posY });
      }
    }
    return salvas;
  }, [linhasReportaPara, nos]);
  const posicoesCartao = useMemo(() => {
    // Ordem importa: salva primeiro, arrasto ao vivo por último — `mesclarPosicoesCartaoManual`
    // aplica em sequência, então quem vem depois vence (mesma prioridade de `posicoesLideranca`
    // acima: automático < salvo < arrasto em andamento).
    const overridesAoVivo = Object.entries(overridesCartao).map(([chave, pos]) => ({ chave, ...pos }));
    return mesclarPosicoesCartaoManual(layout.posicoesCartao, [...posicoesCartaoSalvas, ...overridesAoVivo]);
  }, [layout, posicoesCartaoSalvas, overridesCartao]);

  // Conectores em ângulo reto (tronco/barramento/pé) — liderança↔liderança E supervisor↔cartão,
  // cálculo compartilhado com o PDF via `calcularConectores`/`cartoesConectadosDoLayout`, pra nunca
  // divergir. Usa `posicoesCartao` (já com arrasto manual mesclado), não `layout.posicoesCartao` cru
  // — senão o conector ficava preso no ponto automático enquanto o cartão já tinha se movido na tela.
  const conectores = useMemo(() => {
    const nosParaConector = nos.map(
      (n): OrganogramaNo => ({ id: n.id, reportaPara: n.reportaPara, grupo: n.grupo, linha: n.linha, ordem: n.ordem }),
    );
    return calcularConectores(
      nosParaConector,
      posicoesLideranca,
      cartoesConectadosDoLayout({ cartoes: layout.cartoes, posicoesCartao }),
    );
  }, [nos, posicoesLideranca, layout, posicoesCartao]);

  const comissaoIdPorNo = useMemo(() => new Map(nos.map((n) => [n.id, n.comissaoTecnicaBaseId])), [nos]);
  const contagemPorPessoa = useMemo(
    () => contarCartoesPorPessoaVinculada(layout.cartoes, comissaoIdPorNo),
    [layout, comissaoIdPorNo],
  );

  // Mesmo agrupamento por supervisor que `moverLinhaOrganograma` usa no servidor — "Mover linha pra
  // cima/baixo" só compara uma linha com as IRMÃS DE VERDADE dela (mesmo supervisor), nunca a lista
  // inteira de linhas do organograma (ver `agruparLinhasPorSupervisor`).
  const gruposDeLinhas = useMemo(
    () =>
      agruparLinhasPorSupervisor(
        nos.map((n) => ({ id: n.id, grupo: n.grupo, linha: n.linha, ordem: n.ordem })),
        linhaReportaParaMap,
      ),
    [nos, linhaReportaParaMap],
  );
  function linhasIrmasDe(linha: string | null): string[] {
    if (!linha) return [];
    for (const lista of gruposDeLinhas.values()) {
      if (lista.includes(linha)) return lista;
    }
    return [linha];
  }

  // Limites reais do conteúdo (liderança + cartões), sem forçar simetria em torno de x=0.
  const todasAsCaixas = [
    ...[...posicoesLideranca.values()].map((p) => ({ x: p.x, y: p.y, w: LARGURA_CAIXA, h: ALTURA_CAIXA })),
    ...layout.cartoes.map((c) => {
      const p = posicoesCartao.get(c.chave)!;
      return { x: p.x, y: p.y, w: LARGURA_CARTAO, h: alturaCartao(c.itens.length) };
    }),
  ];
  const minX = Math.min(0, ...todasAsCaixas.map((c) => c.x));
  const maxX = Math.max(LARGURA_CAIXA, ...todasAsCaixas.map((c) => c.x + c.w));
  const minY = Math.min(0, ...todasAsCaixas.map((c) => c.y));
  const maxY = Math.max(ALTURA_CAIXA, ...todasAsCaixas.map((c) => c.y + c.h));
  const deslocX = -minX + PADDING;
  const deslocY = -minY + PADDING;
  const largura = maxX - minX + PADDING * 2;
  const altura = maxY - minY + PADDING * 2;

  function tela(pos: { x: number; y: number }) {
    return { x: pos.x + deslocX, y: pos.y + deslocY };
  }

  function iniciarArrasto(id: string, e: React.PointerEvent) {
    e.stopPropagation();
    const atual = posicoesLideranca.get(id) ?? { x: 0, y: 0 };
    arrastoRef.current = { id, inicioX: e.clientX, inicioY: e.clientY, origemX: atual.x, origemY: atual.y };
    // Só passa a valer como arrasto de verdade depois que o cursor andar mais que esse limiar — sem
    // isso, QUALQUER clique já contava como um micro-arrasto (spec de 27/08).
    const LIMIAR_ARRASTO_PX = 4;
    let arrastoIniciado = false;
    let posAtual = { x: arrastoRef.current.origemX, y: arrastoRef.current.origemY };

    function mover(ev: PointerEvent) {
      const arrasto = arrastoRef.current;
      if (!arrasto) return;
      const deltaTelaX = ev.clientX - arrasto.inicioX;
      const deltaTelaY = ev.clientY - arrasto.inicioY;
      if (!arrastoIniciado) {
        if (Math.hypot(deltaTelaX, deltaTelaY) < LIMIAR_ARRASTO_PX) return;
        arrastoIniciado = true;
      }
      const novaPos = { x: arrasto.origemX + deltaTelaX, y: arrasto.origemY + deltaTelaY };
      posAtual = novaPos;
      setOverrides((atual) => ({ ...atual, [arrasto.id]: novaPos }));
    }

    function soltar() {
      const arrasto = arrastoRef.current;
      arrastoRef.current = null;
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      if (!arrasto || !arrastoIniciado) return;
      const posFinal = posAtual;
      setErroArrasto(null);
      void moverAction(arrasto.id, posFinal.x, posFinal.y).then((resultado) => {
        if (resultado?.error) {
          setErroArrasto(resultado.error);
          setOverrides((atual) => {
            const { [arrasto.id]: _descartada, ...resto } = atual;
            return resto;
          });
        }
      });
    }

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  /** Mesmo mecanismo de `iniciarArrasto` acima, só que pra um CARTÃO inteiro (pela `chave`) em vez
   * de uma caixa de liderança (pelo `id`) — mapa/ação diferentes, resto idêntico. */
  function iniciarArrastoCartao(chave: string, e: React.PointerEvent) {
    e.stopPropagation();
    const atual = posicoesCartao.get(chave) ?? { x: 0, y: 0 };
    arrastoCartaoRef.current = { chave, inicioX: e.clientX, inicioY: e.clientY, origemX: atual.x, origemY: atual.y };
    const LIMIAR_ARRASTO_PX = 4;
    let arrastoIniciado = false;
    let posAtual = { x: arrastoCartaoRef.current.origemX, y: arrastoCartaoRef.current.origemY };

    function mover(ev: PointerEvent) {
      const arrasto = arrastoCartaoRef.current;
      if (!arrasto) return;
      const deltaTelaX = ev.clientX - arrasto.inicioX;
      const deltaTelaY = ev.clientY - arrasto.inicioY;
      if (!arrastoIniciado) {
        if (Math.hypot(deltaTelaX, deltaTelaY) < LIMIAR_ARRASTO_PX) return;
        arrastoIniciado = true;
      }
      const novaPos = { x: arrasto.origemX + deltaTelaX, y: arrasto.origemY + deltaTelaY };
      posAtual = novaPos;
      setOverridesCartao((atual) => ({ ...atual, [arrasto.chave]: novaPos }));
    }

    function soltar() {
      const arrasto = arrastoCartaoRef.current;
      arrastoCartaoRef.current = null;
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      if (!arrasto || !arrastoIniciado) return;
      const posFinal = posAtual;
      setErroArrasto(null);
      void moverCartaoAction(arrasto.chave, posFinal.x, posFinal.y).then((resultado) => {
        if (resultado?.error) {
          setErroArrasto(resultado.error);
          setOverridesCartao((atual) => {
            const { [arrasto.chave]: _descartada, ...resto } = atual;
            return resto;
          });
        }
      });
    }

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  const noSelecionado = selecionado && selecionado !== "novo" ? (nos.find((n) => n.id === selecionado) ?? null) : null;
  const painelAberto = selecionado !== null;
  const filhosDoSelecionado = noSelecionado
    ? nos.filter((n) => n.reportaPara === noSelecionado.id).length +
      linhasReportaPara.filter((l) => l.reportaPara === noSelecionado.id).length
    : 0;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex justify-end gap-2">
          <ReorganizarButton reorganizarAction={reorganizarAction} />
          <button type="button" className="btn-secondary text-sm" onClick={() => setSelecionado("novo")}>
            + Nova caixa
          </button>
        </div>

        {erroArrasto ? (
          <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroArrasto}</p>
        ) : null}

        {/* Sem escala automática (ver spec de 15/09): rolagem nativa nas duas direções quando o
         * desenho não cabe, em vez de encolher letra/caixa. */}
        <div className="card overflow-auto" style={{ maxHeight: "75vh" }}>
          <div className="relative" style={{ width: largura, height: altura }}>
            <svg className="pointer-events-none absolute inset-0" width={largura} height={altura}>
              {conectores.map((s) => {
                const de = tela({ x: s.x1, y: s.y1 });
                const para = tela({ x: s.x2, y: s.y2 });
                return (
                  <line key={s.key} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#B98F1E" strokeWidth={1.5} />
                );
              })}
            </svg>

            {[...posicoesLideranca.entries()].map(([id, pos]) => {
              const no = nosPorId.get(id);
              if (!no) return null;
              const p = tela(pos);
              return (
                <CaixaLideranca
                  key={id}
                  no={no}
                  x={p.x}
                  y={p.y}
                  selecionada={selecionado === id}
                  onPointerDownCaixa={(e) => iniciarArrasto(id, e)}
                  onClick={() => setSelecionado(id)}
                />
              );
            })}

            {layout.cartoes.map((cartao) => {
              const pos = posicoesCartao.get(cartao.chave);
              if (!pos) return null;
              const p = tela(pos);
              const itens = cartao.itens.map((id) => nosPorId.get(id)).filter((n): n is OrganogramaNoData => !!n);
              return (
                <CartaoComissao
                  key={cartao.chave}
                  cartao={cartao}
                  itens={itens}
                  x={p.x}
                  y={p.y}
                  selecionadoId={selecionado !== "novo" ? selecionado : null}
                  contagemPorPessoa={contagemPorPessoa}
                  onClickItem={(id) => setSelecionado(id)}
                  onPointerDownTitulo={(e) => iniciarArrastoCartao(cartao.chave, e)}
                />
              );
            })}

            {nos.length === 0 ? (
              <p className="p-6 text-sm text-neutral-400">
                Nenhuma caixa ainda — comece pelo botão &quot;+ Nova caixa&quot;.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {painelAberto ? (
        <PainelEdicao
          key={noSelecionado?.id ?? "novo"}
          no={noSelecionado}
          todosOsNos={nos}
          linhasReportaPara={linhasReportaPara}
          linhasIrmas={linhasIrmasDe(noSelecionado?.linha ?? null)}
          pessoasDisponiveis={pessoasComissao}
          filhosCount={filhosDoSelecionado}
          salvarAction={salvarAction}
          excluirAction={excluirAction}
          moverLinhaAction={moverLinhaAction}
          definirSupervisorLinhaAction={definirSupervisorLinhaAction}
          aoFechar={() => setSelecionado(null)}
        />
      ) : null}
    </div>
  );
}
