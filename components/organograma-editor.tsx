"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ALTURA_CAIXA,
  ALTURA_CABECALHO_GRUPO,
  LARGURA_CAIXA,
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
const VALOR_OUTRA_LINHA = "__outra__";

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
  moverLinhaAction: (linha: string, direcao: "cima" | "baixo") => Promise<void>;
  aoFechar: () => void;
}) {
  const [state, formAction] = useFormState(salvarAction, {} as OrganogramaNoFormState);
  const [vinculada, setVinculada] = useState(no?.comissaoTecnicaBaseId ?? "");
  const [grupoValor, setGrupoValor] = useState(no?.grupo ?? "");
  const [linhaValor, setLinhaValor] = useState(no?.linha ?? "");
  // Controla se o seletor de Linha está mostrando o campo de texto livre ("+ Outra...") em vez da
  // lista fixa — só entra nesse modo quando a pessoa escolhe isso explicitamente, nunca sozinho:
  // o valor de uma caixa já existente sempre aparece na lista (vem de `linhasExistentes`, derivado
  // dos dados de verdade), então nunca precisa cair aqui só de abrir o painel.
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

  const opcoesReportaPara = todosOsNos.filter((n) => n.id !== no?.id);

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
    <div className="card w-full max-w-sm shrink-0 p-4">
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
            {pessoasDisponiveis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {p.cargo}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Vinculando, nome e cargo vêm sempre do cadastro — se ela mudar lá, muda aqui também.
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

        <div>
          <label className="field-label">Grupo (cabeçalho da coluna)</label>
          <input
            name="grupo"
            className="field-input"
            list="organograma-grupos"
            placeholder="Ex.: Head de Goleiros — deixe em branco pra caixa de liderança"
            value={grupoValor}
            onChange={(e) => setGrupoValor(e.target.value)}
          />
          <datalist id="organograma-grupos">
            {gruposExistentes.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-neutral-400">
            Preencha junto com a Linha abaixo pra essa caixa virar uma célula da grade (coluna × linha) —
            sem os dois, ela vira caixa de liderança.
          </p>
        </div>

        <div>
          <label className="field-label">Linha (rótulo da esquerda)</label>
          <select
            className="field-input"
            value={linhaEhOutra ? VALOR_OUTRA_LINHA : linhaValor}
            onChange={(e) => {
              if (e.target.value === VALOR_OUTRA_LINHA) {
                setLinhaEhOutra(true);
                setLinhaValor("");
              } else {
                setLinhaEhOutra(false);
                setLinhaValor(e.target.value);
              }
            }}
          >
            <option value="">— nenhuma (caixa de liderança) —</option>
            {opcoesLinha.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
            <option value={VALOR_OUTRA_LINHA}>+ Outra (digitar)...</option>
          </select>
          {linhaEhOutra ? (
            <input
              autoFocus
              className="field-input mt-2"
              placeholder="Digite o nome da nova linha"
              value={linhaValor}
              onChange={(e) => setLinhaValor(e.target.value)}
            />
          ) : null}
          <input type="hidden" name="linha" value={linhaValor} />
          {faltaGrupo ? (
            <p className="mt-1 text-xs font-medium text-amber-600">
              Falta preencher o Grupo acima — sem ele, essa caixa não entra na grade, mesmo com a Linha
              preenchida.
            </p>
          ) : (
            <p className="mt-1 text-xs text-neutral-400">Só faz sentido junto com um Grupo preenchido.</p>
          )}
        </div>

        {ehCelulaDeGradeExistente ? (
          <div>
            <label className="field-label">Posição da linha &quot;{no!.linha}&quot;</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={posicaoDaLinha <= 0}
                onClick={() => void moverLinhaAction(no!.linha!, "cima")}
                title={posicaoDaLinha <= 0 ? "Essa linha já é a primeira — não tem pra onde subir." : undefined}
              >
                ▲ Mover linha pra cima
              </button>
              <button
                type="button"
                className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={posicaoDaLinha === -1 || posicaoDaLinha >= linhasOrdenadas.length - 1}
                onClick={() => void moverLinhaAction(no!.linha!, "baixo")}
                title={
                  posicaoDaLinha !== -1 && posicaoDaLinha >= linhasOrdenadas.length - 1
                    ? "Essa linha já é a última — não tem pra onde descer."
                    : undefined
                }
              >
                ▼ Mover linha pra baixo
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Move a linha inteira &quot;{no!.linha}&quot; — todas as colunas dessa linha sobem ou descem
              juntas, sem sair do alinhamento. Não precisa digitar número nem salvar: já move na hora.
              {linhasOrdenadas.length <= 1
                ? " Os botões ficam desativados enquanto essa for a única linha da grade — assim que houver outra, dá pra reordenar."
                : ""}
            </p>
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
}: {
  nos: OrganogramaNoData[];
  pessoasComissao: PessoaComissao[];
  salvarAction: (prevState: OrganogramaNoFormState, formData: FormData) => Promise<OrganogramaNoFormState>;
  moverAction: (id: string, x: number, y: number) => Promise<void>;
  excluirAction: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  moverLinhaAction: (linha: string, direcao: "cima" | "baixo") => Promise<void>;
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
  const arrastoRef = useRef<{ id: string; inicioX: number; inicioY: number; origemX: number; origemY: number } | null>(
    null,
  );

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
  // cada filho) — igual à imagem de referência do Mateus. Uma linha diagonal direta (o que tinha
  // antes) não é fiel ao desenho de organograma que ele mandou.
  const conectores = useMemo(() => {
    const porPai = new Map<string, { x: number; y: number }[]>();
    for (const no of nos) {
      if (!no.reportaPara) continue;
      const pos = posicoes.get(no.id);
      if (!pos) continue;
      porPai.set(no.reportaPara, [...(porPai.get(no.reportaPara) ?? []), pos]);
    }
    const segmentos: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const [paiId, filhos] of porPai) {
      const pai = posicoes.get(paiId);
      if (!pai || filhos.length === 0) continue;
      const paiCentroX = pai.x + LARGURA_CAIXA / 2;
      const paiBaixoY = pai.y + ALTURA_CAIXA;
      const filhosCentroX = filhos.map((f) => f.x + LARGURA_CAIXA / 2);
      const menorTopoFilho = Math.min(...filhos.map((f) => f.y));
      const busY = paiBaixoY + Math.max(16, (menorTopoFilho - paiBaixoY) / 2);

      // Tronco: do pé do pai até o barramento.
      segmentos.push({ key: `${paiId}-tronco`, x1: paiCentroX, y1: paiBaixoY, x2: paiCentroX, y2: busY });
      // Barramento horizontal, cobrindo do filho mais à esquerda ao mais à direita (e o tronco do
      // pai, se ele cair fora desse intervalo).
      const minX = Math.min(paiCentroX, ...filhosCentroX);
      const maxX = Math.max(paiCentroX, ...filhosCentroX);
      if (maxX > minX) {
        segmentos.push({ key: `${paiId}-barramento`, x1: minX, y1: busY, x2: maxX, y2: busY });
      }
      // Um pé descendo do barramento até cada filho.
      filhos.forEach((f, i) => {
        segmentos.push({
          key: `${paiId}-pe-${i}`,
          x1: filhosCentroX[i],
          y1: busY,
          x2: filhosCentroX[i],
          y2: f.y,
        });
      });
    }
    return segmentos;
  }, [nos, posicoes]);

  const todasAsPosicoes = [
    ...[...posicoes.values()],
    ...cabecalhosGrupo.map((c) => ({ x: c.x, y: c.y })),
    ...rotulosLinha.map((r) => ({ x: r.x, y: r.y })),
  ];
  const minXBruto = Math.min(0, ...todasAsPosicoes.map((p) => p.x));
  const maxXBruto = Math.max(LARGURA_CAIXA, ...todasAsPosicoes.map((p) => p.x + LARGURA_CAIXA));
  // Simétrico em torno de x=0 — é onde a árvore de liderança (Presidente incluído) sempre fica
  // centrada (ver `calcularLayoutAutomatico`). Sem isso, a grade de membros esticando mais pra um
  // lado que o outro deixava o Presidente fora do centro visual da tela.
  const extensaoX = Math.max(Math.abs(minXBruto), Math.abs(maxXBruto));
  const minX = -extensaoX;
  const maxX = extensaoX;
  const minY = Math.min(0, ...todasAsPosicoes.map((p) => p.y));
  const maxY = Math.max(ALTURA_CAIXA, ...todasAsPosicoes.map((p) => p.y + ALTURA_CAIXA));
  const deslocX = -minX + PADDING;
  const deslocY = -minY + PADDING;
  const largura = maxX - minX + PADDING * 2;
  const altura = maxY - minY + PADDING * 2;

  function tela(pos: { x: number; y: number }) {
    return { x: pos.x + deslocX, y: pos.y + deslocY };
  }

  function iniciarArrasto(id: string, e: React.PointerEvent) {
    e.stopPropagation();
    const atual = posicoes.get(id) ?? { x: 0, y: 0 };
    arrastoRef.current = { id, inicioX: e.clientX, inicioY: e.clientY, origemX: atual.x, origemY: atual.y };

    function mover(ev: PointerEvent) {
      const arrasto = arrastoRef.current;
      if (!arrasto) return;
      const novaPos = {
        x: arrasto.origemX + (ev.clientX - arrasto.inicioX),
        y: arrasto.origemY + (ev.clientY - arrasto.inicioY),
      };
      setOverrides((atual) => ({ ...atual, [arrasto.id]: novaPos }));
    }

    function soltar() {
      const arrasto = arrastoRef.current;
      arrastoRef.current = null;
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      if (!arrasto) return;
      const posFinal = overrides[arrasto.id] ?? { x: arrasto.origemX, y: arrasto.origemY };
      void moverAction(arrasto.id, posFinal.x, posFinal.y);
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
        <div className="mb-2 flex justify-end">
          <button type="button" className="btn-secondary text-sm" onClick={() => setSelecionado("novo")}>
            + Nova caixa
          </button>
        </div>

        <div className="card overflow-auto" style={{ maxHeight: "75vh" }}>
          <div className="relative" style={{ width: largura, height: altura }}>
            <svg className="pointer-events-none absolute inset-0" width={largura} height={altura}>
              {conectores.map((s) => {
                const de = tela({ x: s.x1, y: s.y1 });
                const para = tela({ x: s.x2, y: s.y2 });
                return <line key={s.key} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#B98F1E" strokeWidth={1.5} />;
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

      {painelAberto ? (
        <PainelEdicao
          no={noSelecionado}
          todosOsNos={nos}
          linhasOrdenadas={linhasOrdenadas}
          pessoasDisponiveis={pessoasComissao.filter(
            (p) => p.id === noSelecionado?.comissaoTecnicaBaseId || !nos.some((n) => n.comissaoTecnicaBaseId === p.id),
          )}
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
