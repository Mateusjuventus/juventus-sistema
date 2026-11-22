export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import {
  RelacaoAtletasBaseDocument,
  type RelacaoAtletaLinha,
  type RelacaoAtletasColunas,
} from "@/lib/pdf/relacao-atletas-base-document";
import {
  agruparAtletasPorCategoria,
  atletaPassaFiltroTipoContrato,
  categoriasParaFiltro,
  composicaoEscopoCategorias,
  RELACAO_STATUS_LABEL,
  statusParaFiltro,
  TODOS_TIPOS_CONTRATO_ATLETA_BASE_FILTRO,
  tipoContratoParaFiltro,
} from "@/lib/futebol/relacao-atletas-base";
import { classificacaoAtletaLabel } from "@/lib/futebol/classificacao-atleta";
import { ehCategoriaBaseValida, TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS, STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import type { AtletaRow, AtletaStatus } from "@/lib/supabase/types";
import { clube } from "@/lib/clube";

const CHAVE_PIX_TIPO_LABEL: Record<string, string> = Object.fromEntries(
  STAFF_CHAVE_PIX_TIPOS.map((opcao) => [opcao.value, opcao.label]),
);

/** "Dados de pagamento (PF)"/"(PJ)" da Relação de Atletas — combina banco/agência/conta/chave PIX
 * (ou nome da empresa/CNPJ/chave PIX) numa string só, pra caber numa coluna só do documento (pedido
 * do Mateus em 18/11/2026, ver comentário em `relacao-atletas-form.tsx`). `null` quando o atleta nem
 * tem "Recebe como Pessoa Física/Jurídica" marcado — o documento já mostra "—" nesse caso. */
function pagamentoPf(a: Pick<AtletaRow, "recebe_como_pf" | "pf_banco" | "pf_agencia" | "pf_conta" | "pf_chave_pix" | "pf_chave_pix_tipo">): string | null {
  if (!a.recebe_como_pf) return null;
  const partes = [
    a.pf_banco ? `Banco: ${a.pf_banco}` : null,
    a.pf_agencia ? `Ag: ${a.pf_agencia}` : null,
    a.pf_conta ? `Conta: ${a.pf_conta}` : null,
    a.pf_chave_pix
      ? `PIX (${a.pf_chave_pix_tipo ? CHAVE_PIX_TIPO_LABEL[a.pf_chave_pix_tipo] ?? a.pf_chave_pix_tipo : "—"}): ${a.pf_chave_pix}`
      : null,
  ].filter((parte): parte is string => Boolean(parte));
  return partes.length > 0 ? partes.join(" · ") : "Sim (sem dados preenchidos)";
}

function pagamentoPj(
  a: Pick<
    AtletaRow,
    "recebe_como_pj" | "empresa_imagem_nome" | "empresa_imagem_cnpj" | "empresa_imagem_chave_pix" | "empresa_imagem_chave_pix_tipo"
  >,
): string | null {
  if (!a.recebe_como_pj) return null;
  const partes = [
    a.empresa_imagem_nome ? `Empresa: ${a.empresa_imagem_nome}` : null,
    a.empresa_imagem_cnpj ? `CNPJ: ${a.empresa_imagem_cnpj}` : null,
    a.empresa_imagem_chave_pix
      ? `PIX (${
          a.empresa_imagem_chave_pix_tipo ? CHAVE_PIX_TIPO_LABEL[a.empresa_imagem_chave_pix_tipo] ?? a.empresa_imagem_chave_pix_tipo : "—"
        }): ${a.empresa_imagem_chave_pix}`
      : null,
  ].filter((parte): parte is string => Boolean(parte));
  return partes.length > 0 ? partes.join(" · ") : "Sim (sem dados preenchidos)";
}

const PE_DOMINANTE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

function naturalidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) return `${cidade}/${uf}`;
  if (cidade) return cidade;
  if (uf) return uf;
  return null;
}

function numeroRegistro(cbf: number | null, fpf: number | null): string | null {
  const partes = [cbf != null ? `CBF ${cbf}` : null, fpf != null ? `FPF ${fpf}` : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

const TODOS_STATUS_KEYS: { key: string; status: AtletaStatus }[] = [
  { key: "status_liberado", status: "liberado" },
  { key: "status_suspenso", status: "transicao" },
  { key: "status_departamento_medico", status: "departamento_medico" },
  { key: "status_dispensado", status: "dispensado" },
];

/**
 * PDF da Relação de Atletas da Base (ver docs/superpowers/specs/2026-09-04-relacao-atletas-base-
 * design.md) — mesmo padrão de submissão do Relatório Avulso (`app/base/relatorios/avulso/pdf/
 * route.tsx`): POST simples de formulário (sem Server Action), lê tudo do `FormData`, abre o PDF
 * numa aba nova.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  if (!(await isMaster(supabase))) {
    return new NextResponse("Você não tem permissão para exportar esta lista.", { status: 403 });
  }

  const formData = await request.formData();

  const categoriasMarcadas = formData
    .getAll("categorias")
    .map((valor) => String(valor))
    .filter(ehCategoriaBaseValida);
  const categoriasFiltro = categoriasParaFiltro(categoriasMarcadas);

  const statusMarcados = TODOS_STATUS_KEYS.filter(({ key }) => formData.get(key) === "on").map((s) => s.status);
  const statusFiltro = statusParaFiltro(statusMarcados);

  const tiposContratoMarcados = TODOS_TIPOS_CONTRATO_ATLETA_BASE_FILTRO.filter(
    (tipo) => formData.get(`tipoContrato_${tipo}`) === "on",
  );
  const tipoContratoFiltro = tipoContratoParaFiltro(tiposContratoMarcados);

  const colunas: RelacaoAtletasColunas = {
    apelido: formData.get("colApelido") === "on",
    nascimento: formData.get("colNascimento") === "on",
    cpf: formData.get("colCpf") === "on",
    rg: formData.get("colRg") === "on",
    telefone: formData.get("colTelefone") === "on",
    posicao: formData.get("colPosicao") === "on",
    numeroCamisa: formData.get("colNumeroCamisa") === "on",
    numeroRegistro: formData.get("colNumeroRegistro") === "on",
    peDominante: formData.get("colPeDominante") === "on",
    naturalidade: formData.get("colNaturalidade") === "on",
    endereco: formData.get("colEndereco") === "on",
    dataInicioClube: formData.get("colDataInicioClube") === "on",
    tipoContrato: formData.get("colTipoContrato") === "on",
    dataFimContrato: formData.get("colDataFimContrato") === "on",
    empresarioNome: formData.get("colEmpresarioNome") === "on",
    pagamentoPf: formData.get("colPagamentoPf") === "on",
    pagamentoPj: formData.get("colPagamentoPj") === "on",
    status: formData.get("colStatus") === "on",
    classificacao: formData.get("colClassificacao") === "on",
  };

  const { data } = await supabase
    .from("atletas")
    .select("*")
    .in("status", statusFiltro)
    .in("categoria", categoriasFiltro)
    .order("nome_completo", { ascending: true });

  // `tipo_contrato` aceita `null` ("sem contrato") — um `.in()` do Supabase não bate linha com
  // `null`, então esse filtro é aplicado aqui em JS (ver comentário de `atletaPassaFiltroTipoContrato`
  // em lib/futebol/relacao-atletas-base.ts), depois dos filtros de status/categoria já resolvidos no
  // banco.
  const atletasFiltrados = ((data ?? []) as AtletaRow[]).filter((a) =>
    atletaPassaFiltroTipoContrato(a.tipo_contrato, tipoContratoFiltro),
  );

  const atletas: RelacaoAtletaLinha[] = atletasFiltrados.map((a) => ({
    // A query acima já restringe `categoria` a `categoriasFiltro` (sempre categorias de Base) —
    // o cast só reflete pro TS o que o filtro já garante em runtime.
    categoria: a.categoria as CategoriaBase,
    nome: a.nome_completo,
    apelido: a.apelido,
    dataNascimento: a.data_nascimento,
    cpf: a.cpf,
    rg: a.rg,
    telefone: a.telefone,
    posicao: a.posicao,
    numeroCamisa: a.numero_camisa,
    numeroRegistro: numeroRegistro(a.numero_cbf, a.numero_fpf),
    peDominante: a.pe_dominante ? PE_DOMINANTE_LABEL[a.pe_dominante] ?? a.pe_dominante : null,
    naturalidade: naturalidade(a.cidade_natal, a.uf_natal),
    endereco: a.endereco_atual,
    dataInicioClube: a.data_inicio_clube,
    tipoContrato: a.tipo_contrato
      ? ATLETA_BASE_TIPO_CONTRATO_OPTIONS.find((o) => o.value === a.tipo_contrato)?.label ?? a.tipo_contrato
      : null,
    dataFimContrato: a.data_fim_contrato,
    empresarioNome: a.empresario_nome,
    pagamentoPf: pagamentoPf(a),
    pagamentoPj: pagamentoPj(a),
    status: RELACAO_STATUS_LABEL[a.status] ?? a.status,
    classificacao: classificacaoAtletaLabel(a.classificacao),
  }));

  const grupos = agruparAtletasPorCategoria(atletas, categoriasFiltro);

  const escopoTexto = composicaoEscopoCategorias(categoriasFiltro);

  // `juventus-escudo.png` (com as estrelas) — pedido do Mateus, não a `-mark` (sem estrelas) que o
  // Avulso usa.
  const escudoClubePath = path.join(process.cwd(), "public", clube.escudo.completo);
  const escudoClubeSrc = { data: readFileSync(escudoClubePath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelacaoAtletasBaseDocument
      escudoClubeSrc={escudoClubeSrc}
      escopoTexto={escopoTexto}
      grupos={grupos}
      colunas={colunas}
      geradoEm={new Date()}
    />,
  );

  const sufixoArquivo = categoriasFiltro.length === TODAS_CATEGORIAS_BASE.length ? "todas" : categoriasFiltro.join("-");
  const nomeArquivo = `relacao-atletas-${sufixoArquivo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
