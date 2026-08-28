"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ALTURA_CAIXA,
  ALTURA_CABECALHO_GRUPO,
  LARGURA_CAIXA,
  calcularConectores,
  calcularEscalaOrganograma,
  calcularLayoutAutomatico,
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
  /** `true` só quando `posX`/`posY` veio de um arrasto manual — ver `pos_manual` na tabela e a
   * spec de 27/08. Usado só pra saber se a coluna de um "grupo sem linha" 100% arrastado ainda
   * precisa reservar espaço na grade (`calcularLayoutAutomatico`, campo `automatico`). */
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

const PADDING = 40;
const LARGURA_ROTULO_LINHA = 140;
const GAP_ROTULO_LINHA = 12;

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

/**
 * Painel de criar/editar uma caixa — vincular pessoa da Comissão Técnica (nome/cargo vêm de lá e
 * ficam travados) ou preencher nome/cargo à mão (Presidente, Diretor, vaga em aberto).
 */
function PainelEdicao({
  no,
  todosOsNos,
  linhasOrdenadas,
  pessoasDisponiveis,
  filhosCount,
  salvarAction,
  excluirAction,
  moverLinhaAction,
  aoFechar,
}: {
  no: OrganogramaNoData | null;
  todosOsNos: OrganogramaNoData[];
  linhasOrdenadas: string[];
  pessoasDisponiveis: PessoaComissao[];
  filhosCount: number;
  salvarAction: (prevState: OrganogramaNoFormState, formData: FormData) => Promise<OrganogramaNoFormState>;
  excluirAction: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  moverLinhaAction: (linha: string, direcao: "cima" | "baixo") => Promise<{ error?: string }>;
  aoFechar: () => void;
}) {
  const [state, formAction] = useFormState(salvarAction, {} as OrganogramaNoFormState);
  const [vinculada, setVinculada] = useState(no?.comissaoTecnicaBaseId ?? "");
  // O painel some do jeito que aparece: ao lado do organograma em telas largas, ABAIXO dele (fora
  // da área visível, sem rolar mais nada) em telas estreitas ou quando o organograma tem muitas
  // caixas. Clicar numa caixa de grade selecionava ela (a borda dourada aparecia), mas o painel de
  // edição em si ficava fora da vista — parecia que "clicar não faz nada". Rola até o painel
  // sozinho toda vez que ele abre ou troca de caixa, pra sempre ficar visível na hora.
  const painelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    painelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [no?.id]);
  // Feedback do "Mover linha pra cima/baixo" — os botões já movem na hora (sem precisar de um botão
  // de Salvar à parte), mas antes um erro do Supabase aí desaparecia em silêncio e o clique parecia
  // simplesmente não fazer nada (spec de 27/08). "movendo" mostra feedback imediato mesmo quando o
  // resultado visual demora um instante pra chegar (revalidação da página).
  const [statusMoverLinha, setStatusMoverLinha] = useState<{ tipo: "movendo" | "erro"; texto?: string } | null>(
    null,
  );
  async function moverLinha(direcao: "cima" | "baixo") {
    if (!no?.linha) return;
    setStatusMoverLinha({ tipo: "movendo" });
    const resultado = await moverLinhaAction(no.linha, direcao);
    setStatusMoverLinha(resultado.error ? { tipo: "erro", texto: resultado.error } : null);
  }
  const [grupoValor, setGrupoValor] = useState(no?.grupo ?? "");
  const [linhaValor, setLinhaValor] = useState(no?.linha ?? "");
  // Controla se o seletor de Grupo/Linha está mostrando o campo de texto livre ("+ Outra...") em vez
  // da lista fixa — só entra nesse modo quando a pessoa escolhe isso explicitamente, nunca sozinho:
  // o valor de uma caixa já existente sempre aparece na lista (vem de `gruposExistentes`/
  // `linhasExistentes`, derivado dos dados de verdade), então nunca precisa cair aqui só de abrir o
  // painel. Os dois eram texto livre com sugestão (`<datalist>`) antes — fácil digitar "Preparador
  // Físico" numa caixa e "Preparador Fisico" (sem acento) noutra sem perceber, o que criava uma
  // coluna quase-idêntica invisível no meio da grade (bug real visto no organograma do Mateus, spec
  // de 27/08). Virar `<select>` de verdade torna impossível digitar errado sem querer, e é mais
  // fácil de preencher (escolhe da lista em vez de lembrar o nome exato).
  const [grupoEhOutro, setGrupoEhOutro] = useState(false);
  const [linhaEhOutra, setLinhaEhOutra] = useState(false);
  // Muda toda vez que uma caixa NOVA de grade é criada com sucesso — força o `<form>` a remontar
  // (limpando os campos não-controlados: Nome, Cargo, Reporta para) sem mexer em Grupo/Linha, que
  // ficam controlados por `grupoValor`/`linhaValor` e continuam preenchidos de propósito.
  const [formResetKey, setFormResetKey] = useState(0);

  // Depois de salvar com sucesso: editando uma caixa existente, fecha o painel (sinal de que salvou).
  // Criando uma caixa NOVA de grade (Grupo + Linha preenchidos), em vez de fechar, mantém o painel
  // aberto com o mesmo Grupo/Linha — só limpa a pessoa — pra adicionar a próxima coluna da mesma
  // linha em seguida, sem reabrir "+ Nova caixa" e redigitar tudo de novo. Depende de `state` (não
  // de `state.success`) porque duas criações seguidas dão o mesmo `success: true` — só a referência
  // do objeto muda a cada envio, então é isso que precisa disparar o efeito de novo.
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

  // Ordenado por nome — a lista vinha na ordem "de banco" (inserção), o que fazia achar alguém numa
  // lista grande virar uma busca visual sem padrão nenhum.
  const opcoesReportaPara = todosOsNos
    .filter((n) => n.id !== no?.id)
    .sort((a, b) => a.nomeExibido.localeCompare(b.nomeExibido));

  // Onde cada pessoa da Comissão Técnica já está vinculada no organograma (fora da própria caixa
  // sendo editada) — mostrado junto ao nome dela no seletor abaixo. Antes, uma pessoa já vinculada a
  // QUALQUER caixa sumia da lista pra sempre (não dava pra vincular a mesma pessoa numa segunda
  // caixa) — impedia justamente o caso real de alguém que atende mais de uma categoria (ex.: técnico
  // de Sub15 E Sub17: precisa de uma caixa em cada), e também dificultava recuperar uma caixa que
  // ficou difícil de achar na tela (a pessoa "sumia" da lista, sem jeito de vinculá-la de novo em
  // outro lugar pra ao menos localizá-la). Agora toda pessoa continua na lista sempre; só avisa onde
  // ela já está, pra evitar um vínculo duplicado por engano sem impedir um de propósito.
  const usosPorPessoa = new Map<string, string[]>();
  for (const n of todosOsNos) {
    if (!n.comissaoTecnicaBaseId || n.id === no?.id) continue;
    const rotulo = n.grupo ? (n.linha ? `${n.grupo} · ${n.linha}` : n.grupo) : "liderança";
    usosPorPessoa.set(n.comissaoTecnicaBaseId, [...(usosPorPessoa.get(n.comissaoTecnicaBaseId) ?? []), rotulo]);
  }

  // Sugestões de autocompletar (via <datalist>) com os valores de Grupo/Linha já usados nas outras
  // caixas — sem isso é fácil digitar "Comissão Sub20" numa caixa e "comissao sub 20" noutra e as
  // duas nunca se alinharem na grade por serem textos diferentes pro código.
  const gruposExistentes = [...new Set(todosOsNos.map((n) => n.grupo).filter((g): g is string => !!g))].sort();
  const linhasExistentes = [...new Set(todosOsNos.map((n) => n.linha).filter((l): l is string => !!l))].sort();
  // Linha vira lista fixa (não texto livre): junta as linhas padrão com as que já existem nos dados
  // (pra continuar mostrando uma linha "não padrão" que alguém criou digitando "+ Outra..." antes).
  const opcoesLinha = [...new Set([...LINHAS_PADRAO, ...linhasExistentes])].sort();

  // Preencheu Linha mas esqueceu Grupo — sem os dois juntos a caixa não vira célula da grade, cai
  // na árvore de liderança. Avisa na hora em vez de deixar a pessoa descobrir só depois de salvar
  // (foi exatamente o que aconteceu com o Igor Silvério).
  const faltaGrupo = linhaValor.trim() !== "" && grupoValor.trim() === "";

  // Só uma célula de grade JÁ EXISTENTE (Grupo + Linha preenchidos) tem "mover linha" — é a única
  // situação em que `moverLinhaAction` sabe o que fazer (existe uma linha salva pra mover). Caixa
  // nova, liderança e "grupo sem linha" continuam usando o campo Ordem numérico de antes.
  const ehCelulaDeGradeExistente = Boolean(no && no.grupo && no.linha);
  const posicaoDaLinha = no?.linha ? linhasOrdenadas.indexOf(no.linha) : -1;

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

      <form key={formResetKey} action={formAction} className="mt-3 space-y-3">
        {no ? <input type="hidden" name="id" value={no.id} /> : null}

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
            Vinculando, nome e cargo vêm sempre do cadastro — se ela mudar lá, muda aqui também. Dá pra
            vincular a mesma pessoa em mais de uma caixa (ex.: um técnico que atende Sub15 e Sub17) — o
            &quot;já em: ...&quot; ao lado do nome só avisa onde ela já está, não impede escolher de
            novo.
          </p>
        </div>

        {!vinculada ? (
          <>
            <div>
              <label className="field-label">Nome</label>
              <input
                name="nome"
                className="field-input"
                placeholder="Deixe em branco pra vaga em aberto (mostra “???”)"
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

        {/* Grupo (coluna) e Linha (categoria) sempre andam juntos — é o que decide se a caixa vira
         * uma célula da grade ou fica na árvore de liderança — por isso ganham um bloco visual só
         * deles, separado do resto do formulário. Os dois viraram `<select>` de verdade (nunca mais
         * texto livre): antes bastava um espaço a mais ou uma letra sem acento pra criar uma coluna
         * "quase igual" à de verdade, sem ninguém perceber (bug real, spec de 27/08) — escolher de
         * uma lista em vez de digitar de cabeça também é mais rápido de preencher. */}
        <div className="rounded-md border border-linha p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
            Onde fica no organograma
          </p>
          <div className="space-y-3">
            <div>
              <label className="field-label">Grupo (coluna)</label>
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
                <option value="">— nenhum (caixa de liderança) —</option>
                {gruposExistentes.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value={VALOR_OUTRA}>+ Nova coluna (digitar)...</option>
              </select>
              {grupoEhOutro ? (
                <input
                  autoFocus
                  className="field-input mt-2"
                  placeholder="Digite o nome da nova coluna"
                  value={grupoValor}
                  onChange={(e) => setGrupoValor(e.target.value)}
                />
              ) : null}
              <input type="hidden" name="grupo" value={grupoValor} />
            </div>

            <div>
              <label className="field-label">Linha (categoria)</label>
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
                <option value="">— nenhuma —</option>
                {opcoesLinha.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
                <option value={VALOR_OUTRA}>+ Nova categoria (digitar)...</option>
              </select>
              {linhaEhOutra ? (
                <input
                  autoFocus
                  className="field-input mt-2"
                  placeholder="Digite o nome da nova categoria"
                  value={linhaValor}
                  onChange={(e) => setLinhaValor(e.target.value)}
                />
              ) : null}
              <input type="hidden" name="linha" value={linhaValor} />
            </div>
          </div>

          {faltaGrupo ? (
            <p className="mt-2 text-xs font-medium text-amber-600">
              Falta escolher o Grupo acima — sem ele, essa caixa não entra na grade, mesmo com a Linha
              preenchida.
            </p>
          ) : (
            <p className="mt-2 text-xs text-neutral-400">
              Preencha os dois pra virar uma célula da grade (coluna × categoria). Deixe os dois em
              branco pra caixa de liderança (Presidente, Diretor...).
            </p>
          )}
        </div>

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
                  posicaoDaLinha === -1 || posicaoDaLinha >= linhasOrdenadas.length - 1 || statusMoverLinha?.tipo === "movendo"
                }
                onClick={() => void moverLinha("baixo")}
                title={
                  posicaoDaLinha !== -1 && posicaoDaLinha >= linhasOrdenadas.length - 1
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
                Move a linha inteira &quot;{no!.linha}&quot; — todas as colunas dessa linha sobem ou descem
                juntas, sem sair do alinhamento. Não precisa digitar número nem salvar: já move na hora.
                {linhasOrdenadas.length <= 1
                  ? " Os botões ficam desativados enquanto essa for a única linha da grade — assim que houver outra, dá pra reordenar."
                  : ""}
              </p>
            )}
          </div>
        ) : null}

        <div>
          <label className="field-label">Reporta para</label>
          <select name="reportaPara" className="field-input" defaultValue={no?.reportaPara ?? ""}>
            <option value="">— topo do organograma —</option>
            {opcoesReportaPara.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nomeExibido} — {n.cargoExibido}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end border-t border-linha pt-3">
          <SalvarButton />
        </div>
      </form>

      {/* Fora do <form> de propósito — um <form> dentro de outro <form> não é válido em HTML, e o
       * botão "Sim, excluir" do DeleteButton (que é o seu próprio <form>) acabava não submetendo pra
       * ação de excluir quando ficava aninhado dentro deste. */}
      {no ? (
        <div className="mt-3 flex justify-start border-t border-linha pt-3">
          <DeleteButton
            errorAction={excluirAction}
            id={no.id}
            entityLabel={
              filhosCount > 0
                ? `caixa (${filhosCount} pessoa${filhosCount === 1 ? "" : "s"} ficaria${
                    filhosCount === 1 ? "" : "m"
                  } sem líder direto)`
                : "caixa"
            }
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Uma caixa do organograma. Liderança (sem `grupo`) em grená; gente de área (com `grupo`) em card
 * claro — mesma leitura da imagem de referência do Mateus.
 */
function Caixa({
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
  const lideranca = !no.grupo;
  // Célula de grade (Grupo E Linha) não se arrasta — fica sempre alinhada, só a Ordem (no painel de
  // edição) decide sua posição na grade. Só liderança e "grupo sem linha" continuam arrastáveis.
  const naGrade = Boolean(no.grupo && no.linha);
  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={naGrade ? undefined : onPointerDownCaixa}
      onClick={onClick}
      style={{ left: x, top: y, width: LARGURA_CAIXA, height: ALTURA_CAIXA }}
      className={`absolute flex select-none flex-col justify-center rounded-md p-3 shadow-sm ${
        naGrade ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${lideranca ? "bg-grena text-white" : "bg-white text-neutral-800 border border-linha"} ${
        selecionada ? "ring-2 ring-dourado" : ""
      } ${no.vaga ? "opacity-60" : ""}`}
    >
      <p className={`truncate text-sm font-bold ${lideranca ? "text-white" : "text-grena-escuro"}`}>
        {no.nomeExibido}
      </p>
      <p className={`truncate text-xs ${lideranca ? "text-white/80" : "text-neutral-500"}`}>{no.cargoExibido}</p>
    </div>
  );
}

/**
 * Botão "Reorganizar automaticamente" — solta todo mundo que foi arrastado de volta pro layout
 * automático (pedido do Mateus depois de rodadas de teste deixarem caixas arrastadas em cantos que
 * já não faziam sentido, "uma bagunça"). Confirmação em duas etapas (mesmo padrão do `DeleteButton`,
 * sem `window.confirm`) porque desfaz de uma vez todo arrasto manual salvo — reversível na mão
 * (arrastando nas dela de novo), mas ainda assim uma ação em massa que merece um passo a mais.
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
          Solta todas as caixas arrastadas de volta pro lugar automático. Confirma?
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
 * Organograma do Futebol de Base: caixas arrastáveis, linhas ligando cada uma a quem ela reporta,
 * cabeçalho de coluna por `grupo` (ver docs/superpowers/specs/2026-08-23-organograma-base-design.md).
 * Layout automático (lib/futebol/organograma.ts) só decide a posição de quem nunca foi arrastada —
 * depois disso a posição salva manda.
 */
export function OrganogramaEditor({
  nos,
  pessoasComissao,
  salvarAction,
  moverAction,
  excluirAction,
  moverLinhaAction,
  reorganizarAction,
}: {
  nos: OrganogramaNoData[];
  pessoasComissao: PessoaComissao[];
  salvarAction: (prevState: OrganogramaNoFormState, formData: FormData) => Promise<OrganogramaNoFormState>;
  moverAction: (id: string, x: number, y: number) => Promise<{ error?: string }>;
  excluirAction: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  moverLinhaAction: (linha: string, direcao: "cima" | "baixo") => Promise<{ error?: string }>;
  reorganizarAction: () => Promise<{ error?: string }>;
}) {
  const [selecionado, setSelecionado] = useState<string | "novo" | null>(null);

  // Depois de excluir com sucesso, a página revalida e `nos` chega sem aquela caixa — se o painel
  // ainda estiver aberto nela, fecha sozinho (é o sinal visual de que a exclusão realmente
  // aconteceu). Se a exclusão falhar, a caixa continua em `nos` e o painel fica aberto mostrando o
  // erro do `DeleteButton` normalmente.
  useEffect(() => {
    if (selecionado && selecionado !== "novo" && !nos.some((n) => n.id === selecionado)) {
      setSelecionado(null);
    }
  }, [nos, selecionado]);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [erroArrasto, setErroArrasto] = useState<string | null>(null);
  const arrastoRef = useRef<{ id: string; inicioX: number; inicioY: number; origemX: number; origemY: number } | null>(
    null,
  );

  // Assim que dados novos chegam do servidor (depois de QUALQUER ação — arrastar, salvar, excluir,
  // reorganizar), descarta as posições otimistas locais: `no.posX`/`no.posY` (vindo de `nos`, já
  // revalidado) volta a mandar. Sem isso, uma posição arrastada ficava presa na memória do
  // navegador pra sempre (nunca era limpa), então depois de "Reorganizar automaticamente" a caixa
  // continuava aparecendo no lugar antigo NA TELA enquanto o PDF (que sempre lê do banco) já
  // mostrava reorganizado — exatamente o "tela e PDF ficam diferentes" relatado. Também cobre o
  // caso de um `moverAction` que falhou silenciosamente: sem essa limpeza, a caixa continuava
  // "arrastada" só no navegador mesmo sem nunca ter sido salva de verdade.
  useEffect(() => {
    setOverrides({});
  }, [nos]);

  // Largura disponível do cartão onde o organograma é desenhado — usada pra calcular o quanto o
  // desenho precisa encolher pra caber sem forçar scroll horizontal (ver `calcularEscalaOrganograma`
  // e a spec de 27/08). Medida via ResizeObserver pra reagir a redimensionamento da janela/sidebar,
  // não só ao carregar a página.
  const cartaoRef = useRef<HTMLDivElement | null>(null);
  const [larguraCartao, setLarguraCartao] = useState<number | null>(null);

  useEffect(() => {
    const elemento = cartaoRef.current;
    if (!elemento) return;
    const observer = new ResizeObserver((entries) => {
      const largura = entries[0]?.contentRect.width;
      if (largura) setLarguraCartao(largura);
    });
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  const layoutAutomatico = useMemo(
    () =>
      calcularLayoutAutomatico(
        nos.map(
          (n): OrganogramaNo => ({
            id: n.id,
            reportaPara: n.reportaPara,
            grupo: n.grupo,
            linha: n.linha,
            ordem: n.ordem,
            // Célula de grade nunca é arrastada — sempre automática, mesmo se `posManual` tiver
            // ficado `true` por engano de um estado anterior (ela vira caixa de liderança e volta).
            automatico: Boolean(n.grupo && n.linha) || !n.posManual,
          }),
        ),
      ),
    [nos],
  );

  const posicoes = useMemo(() => {
    const mapa = new Map<string, { x: number; y: number }>();
    for (const no of nos) {
      // Célula de grade (Grupo E Linha preenchidos) sempre usa a posição calculada da grade — nunca
      // arrasto nem posição salva. É o que garante que ela nunca "sai do alinhamento": o Mateus só
      // controla onde ela cai através do campo Ordem (linha) e do Grupo (coluna), nunca arrastando.
      if (no.grupo && no.linha) {
        mapa.set(no.id, layoutAutomatico.get(no.id) ?? { x: 0, y: 0 });
        continue;
      }
      const override = overrides[no.id];
      if (override) {
        mapa.set(no.id, override);
      } else if (no.posX !== null && no.posY !== null) {
        mapa.set(no.id, { x: no.posX, y: no.posY });
      } else {
        mapa.set(no.id, layoutAutomatico.get(no.id) ?? { x: 0, y: 0 });
      }
    }
    return mapa;
  }, [nos, overrides, layoutAutomatico]);

  // Cabeçalho de cada grupo: fica acima da caixa mais alta (menor y) daquele grupo, na mesma
  // coluna — segue o grupo mesmo se alguém for arrastada, ainda que a coluna deixe de ficar
  // perfeitamente alinhada se as caixas forem muito espalhadas.
  const cabecalhosGrupo = useMemo(() => {
    const porGrupo = new Map<string, { x: number; y: number }[]>();
    for (const no of nos) {
      if (!no.grupo) continue;
      const pos = posicoes.get(no.id);
      if (!pos) continue;
      porGrupo.set(no.grupo, [...(porGrupo.get(no.grupo) ?? []), pos]);
    }
    return [...porGrupo.entries()].map(([grupo, pontos]) => {
      const topo = pontos.reduce((a, b) => (b.y < a.y ? b : a));
      return { grupo, x: topo.x, y: topo.y - ALTURA_CABECALHO_GRUPO - 12 };
    });
  }, [nos, posicoes]);

  // Rótulo de cada `linha` (ex.: "Comissão Sub20"): fica à esquerda da coluna mais à esquerda que
  // tiver alguém com essa `linha`, centralizado na altura média de quem a usa — a média (em vez do
  // primeiro) deixa o rótulo estável mesmo se uma caixa daquela linha for arrastada um pouco.
  const rotulosLinha = useMemo(() => {
    const porLinha = new Map<string, { x: number; y: number }[]>();
    for (const no of nos) {
      if (!no.grupo || !no.linha) continue;
      const pos = posicoes.get(no.id);
      if (!pos) continue;
      porLinha.set(no.linha, [...(porLinha.get(no.linha) ?? []), pos]);
    }
    if (porLinha.size === 0) return [];
    const minXColunas = Math.min(...[...porLinha.values()].flat().map((p) => p.x));
    return [...porLinha.entries()].map(([linha, pontos]) => {
      const y = pontos.reduce((soma, p) => soma + p.y, 0) / pontos.length;
      return { linha, x: minXColunas - LARGURA_ROTULO_LINHA - GAP_ROTULO_LINHA, y };
    });
  }, [nos, posicoes]);

  // Mesma ordem em que as linhas aparecem na tela (de cima pra baixo) — usada só pra saber se a
  // linha selecionada já está no topo/base (desabilitar o botão correspondente no painel).
  const linhasOrdenadas = useMemo(
    () => [...rotulosLinha].sort((a, b) => a.y - b.y).map((r) => r.linha),
    [rotulosLinha],
  );

  // Conectores em ângulo reto (tronco descendo do pai, barramento horizontal, pé descendo até
  // cada filho) — igual à imagem de referência do Mateus. Cálculo compartilhado com o PDF
  // (`lib/pdf/organograma-base-document.tsx`) via `calcularConectores`, pra nunca divergir.
  const conectores = useMemo(() => calcularConectores(nos, posicoes), [nos, posicoes]);

  const todasAsPosicoes = [
    ...[...posicoes.values()],
    ...cabecalhosGrupo.map((c) => ({ x: c.x, y: c.y })),
    ...rotulosLinha.map((r) => ({ x: r.x, y: r.y })),
  ];
  // Limites reais do conteúdo — sem forçar simetria em torno de x=0. Uma versão anterior espelhava
  // esse cálculo (minX = -maxX) só pra manter o Presidente centralizado quando a tela precisava de
  // scroll horizontal; isso preenchia o lado mais curto com espaço vazio do tamanho do lado mais
  // longo (a grade de membros normalmente estica bem mais pra um lado que a árvore de liderança),
  // dobrando a largura do desenho à toa. Como a escala agora sempre encolhe o suficiente pra caber
  // sem scroll (`calcularEscalaOrganograma`) e o cartão só usa `overflow-x-hidden`, o Presidente fica
  // centralizado simplesmente centralizando o desenho (já do tamanho certo) dentro do cartão via CSS
  // (`mx-auto` mais abaixo) — sem precisar de espaço vazio nem de rolagem programática.
  const minX = Math.min(0, ...todasAsPosicoes.map((p) => p.x));
  const maxX = Math.max(LARGURA_CAIXA, ...todasAsPosicoes.map((p) => p.x + LARGURA_CAIXA));
  const minY = Math.min(0, ...todasAsPosicoes.map((p) => p.y));
  const maxY = Math.max(ALTURA_CAIXA, ...todasAsPosicoes.map((p) => p.y + ALTURA_CAIXA));
  const deslocX = -minX + PADDING;
  const deslocY = -minY + PADDING;
  const largura = maxX - minX + PADDING * 2;
  const altura = maxY - minY + PADDING * 2;

  // Encolhe o desenho inteiro (nunca amplia) pra caber na largura do cartão sem forçar scroll
  // horizontal — só entra em ação com a medida real do cartão em mãos; antes disso (primeira
  // renderização) assume escala 1 pra não "piscar" um tamanho errado.
  const escala = larguraCartao !== null ? calcularEscalaOrganograma(largura, larguraCartao) : 1;

  function tela(pos: { x: number; y: number }) {
    return { x: pos.x + deslocX, y: pos.y + deslocY };
  }

  function iniciarArrasto(id: string, e: React.PointerEvent) {
    e.stopPropagation();
    const atual = posicoes.get(id) ?? { x: 0, y: 0 };
    arrastoRef.current = { id, inicioX: e.clientX, inicioY: e.clientY, origemX: atual.x, origemY: atual.y };
    // Só passa a valer como arrasto de verdade depois que o cursor andar mais que esse limiar — sem
    // isso, QUALQUER clique (só selecionar uma caixa pra editar) já contava como um micro-arrasto: o
    // menor tremor do mouse/trackpad entre apertar e soltar botão movia a caixa uns pixels e salvava
    // aquilo como posição manual (`pos_manual: true`) pra sempre, tirando a caixa do recálculo
    // automático dali em diante sem o Mateus ter arrastado nada de propósito — a causa mais provável
    // da "bagunça" que voltava sozinha mesmo depois de "Reorganizar automaticamente" (spec de 27/08).
    const LIMIAR_ARRASTO_PX = 4;
    let arrastoIniciado = false;

    function mover(ev: PointerEvent) {
      const arrasto = arrastoRef.current;
      if (!arrasto) return;
      const deltaTelaX = ev.clientX - arrasto.inicioX;
      const deltaTelaY = ev.clientY - arrasto.inicioY;
      if (!arrastoIniciado) {
        if (Math.hypot(deltaTelaX, deltaTelaY) < LIMIAR_ARRASTO_PX) return;
        arrastoIniciado = true;
      }
      // Divide pelo fator de escala: com o desenho encolhido, cada pixel real que o cursor anda
      // corresponde a mais de um pixel "lógico" de posição — sem isso, arrastar sob uma escala menor
      // que 1 moveria a caixa mais rápido que o cursor.
      const novaPos = {
        x: arrasto.origemX + deltaTelaX / escala,
        y: arrasto.origemY + deltaTelaY / escala,
      };
      setOverrides((atual) => ({ ...atual, [arrasto.id]: novaPos }));
    }

    function soltar() {
      const arrasto = arrastoRef.current;
      arrastoRef.current = null;
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      // Nunca passou do limiar → foi só um clique (abrir o painel de edição, por exemplo) — não
      // salva posição nenhuma, a caixa nem sabe que foi tocada.
      if (!arrasto || !arrastoIniciado) return;
      const posFinal = overrides[arrasto.id] ?? { x: arrasto.origemX, y: arrasto.origemY };
      setErroArrasto(null);
      void moverAction(arrasto.id, posFinal.x, posFinal.y).then((resultado) => {
        if (resultado?.error) {
          setErroArrasto(resultado.error);
          // Não salvou de verdade — descarta a posição otimista pra tela voltar a mostrar
          // exatamente o que está salvo no banco (o mesmo que o PDF mostra), em vez de ficar
          // presa numa posição que só existe neste navegador.
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

  const noSelecionado = selecionado && selecionado !== "novo" ? (nos.find((n) => n.id === selecionado) ?? null) : null;
  const painelAberto = selecionado !== null;
  const filhosDoSelecionado = noSelecionado ? nos.filter((n) => n.reportaPara === noSelecionado.id).length : 0;

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

        {/* `overflow-x-hidden`: a escala já garante que a largura sempre cabe, então nunca deveria
         * precisar de scroll horizontal (ver `calcularEscalaOrganograma`). `scrollbarGutter: "stable"`
         * evita um loop de retroalimentação: a escala encolhe largura E altura juntas (mesmo
         * `transform: scale()`), então uma escala menor às vezes tira a barra de rolagem vertical
         * (altura menor que 75vh) — sem reservar o espaço dela, isso aumenta a largura medida pelo
         * ResizeObserver, o que aumenta a escala de novo, o que devolve a barra, e por aí vai: a tela
         * "tremendo" reportada pelo Mateus é exatamente esse vaivém. Reservando o espaço da barra
         * sempre (mostrada ou não), a largura medida nunca muda por causa dela. */}
        <div
          ref={cartaoRef}
          className="card overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: "75vh", scrollbarGutter: "stable" }}
        >
          {/* Wrapper externo no tamanho JÁ ENCOLHIDO — evita que o navegador reserve espaço em
           * branco do tamanho lógico original (que o `transform: scale()` abaixo não afeta pro
           * cálculo de layout). O desenho em si continua todo calculado em pixels lógicos; só a
           * apresentação visual encolhe. `mx-auto` centraliza o desenho (já do tamanho certo) dentro
           * do cartão quando ele é mais estreito que o espaço disponível — é isso que mantém o
           * Presidente centralizado, sem precisar de espaço vazio artificial nem de rolagem. */}
          <div className="mx-auto" style={{ width: largura * escala, height: altura * escala }}>
            <div
              className="relative origin-top-left"
              style={{ width: largura, height: altura, transform: `scale(${escala})` }}
            >
              <svg className="pointer-events-none absolute inset-0" width={largura} height={altura}>
                {conectores.map((s) => {
                  const de = tela({ x: s.x1, y: s.y1 });
                  const para = tela({ x: s.x2, y: s.y2 });
                  return (
                    <line key={s.key} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#B98F1E" strokeWidth={1.5} />
                  );
                })}
              </svg>

              {cabecalhosGrupo.map((c) => {
                const pos = tela(c);
                return (
                  <div
                    key={c.grupo}
                    style={{ left: pos.x, top: pos.y, width: LARGURA_CAIXA, height: ALTURA_CABECALHO_GRUPO }}
                    className="absolute flex items-center justify-center rounded-md bg-grena px-2 text-center text-xs font-bold uppercase tracking-wide text-white"
                  >
                    {c.grupo}
                  </div>
                );
              })}

              {rotulosLinha.map((r) => {
                const pos = tela(r);
                return (
                  <div
                    key={r.linha}
                    style={{ left: pos.x, top: pos.y, width: LARGURA_ROTULO_LINHA, height: ALTURA_CAIXA }}
                    className="absolute flex items-center justify-center rounded-md border border-grena/30 bg-white px-2 text-center text-xs font-bold uppercase tracking-wide text-grena-escuro"
                  >
                    {r.linha}
                  </div>
                );
              })}

              {nos.map((no) => {
                const pos = posicoes.get(no.id);
                if (!pos) return null;
                const tela_ = tela(pos);
                return (
                  <Caixa
                    key={no.id}
                    no={no}
                    x={tela_.x}
                    y={tela_.y}
                    selecionada={selecionado === no.id}
                    onPointerDownCaixa={(e) => iniciarArrasto(no.id, e)}
                    onClick={() => setSelecionado(no.id)}
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
      </div>

      {painelAberto ? (
        <PainelEdicao
          no={noSelecionado}
          todosOsNos={nos}
          linhasOrdenadas={linhasOrdenadas}
          pessoasDisponiveis={pessoasComissao}
          filhosCount={filhosDoSelecionado}
          salvarAction={salvarAction}
          excluirAction={excluirAction}
          moverLinhaAction={moverLinhaAction}
          aoFechar={() => setSelecionado(null)}
        />
      ) : null}
    </div>
  );
}
