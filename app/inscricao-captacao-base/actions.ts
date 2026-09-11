"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { captacaoInscricaoSchema } from "@/lib/validation/schemas";
import {
  uploadFotoRedimensionada,
  uploadCaptacaoDocumento,
  ENTITY_PHOTOS_BUCKET,
  CAPTACAO_DOCUMENTOS_BUCKET,
} from "@/lib/supabase/storage";
import type { CaptacaoDocumentoTipo } from "@/lib/supabase/types";

/**
 * Inscrição pública pro teste/avaliação do Futebol de Base (link sem login, ver
 * app/inscricao-captacao-base/page.tsx e docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md). Cria sempre em `captacao_base` com
 * `status: "inscricao"` e `origem: "publico"` — decidido aqui no servidor, nunca pelo formulário.
 * Cai na fila de "Aprovações" (`/base/captacao/aprovacoes`); só quando o Mateus aprova e informa a
 * Data de Início é que passa a "Em avaliação". Não tem relação nenhuma com o cadastro de Atletas
 * (esse é o link da Ficha de Cadastro, `/cadastro-atleta-base`, coisa totalmente separada).
 *
 * Desde 2026-09-11 (ver spec 2026-09-11-captacao-documentos-termo-auto-cadastro-design.md) também
 * exige a foto do candidato e os 5 documentos obrigatórios (PDF ou foto), e grava o Termo de
 * Responsabilidade (consentimento digital). Como os arquivos não são cobertos pelo
 * `captacaoInscricaoSchema` (Zod não valida File de FormData bem), são conferidos à parte, depois da
 * validação dos campos de texto — só então o registro é criado.
 *
 * Roda inteiro com o cliente admin (service_role) — mesma razão de `cadastrarStaffPublicoBase`:
 * quem preenche não tem sessão.
 */
export interface InscricaoCaptacaoState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
}

/** Os 5 documentos obrigatórios (ver seção 2 do spec) — chave = `name` do `<input type="file">` no
 * formulário (igual ao `tipo` gravado em `captacao_documentos`), valor = rótulo pra mensagem de erro. */
const DOCUMENTOS_OBRIGATORIOS: Record<CaptacaoDocumentoTipo, string> = {
  rg_atleta: "Cópia do RG do atleta",
  rg_responsavel: "Cópia do RG do(s) responsável(is)",
  declaracao_escolar: "Declaração escolar",
  atestado_medico: "Atestado médico",
  eletrocardiograma: "Eletrocardiograma com laudo",
};

function parseForm(formData: FormData) {
  const raw = {
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    rg: String(formData.get("rg") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    posicao: String(formData.get("posicao") ?? ""),
    segundaPosicao: String(formData.get("segundaPosicao") ?? ""),
    peDominante: String(formData.get("peDominante") ?? ""),
    altura: String(formData.get("altura") ?? ""),
    peso: String(formData.get("peso") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    indicacao: String(formData.get("indicacao") ?? ""),
    clubeAnterior: String(formData.get("clubeAnterior") ?? ""),
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    escola: String(formData.get("escola") ?? ""),
    escolaridade: String(formData.get("escolaridade") ?? ""),
    periodoEscolar: String(formData.get("periodoEscolar") ?? ""),
    possuiPlanoSaude: String(formData.get("possuiPlanoSaude") ?? ""),
    planoSaudeQual: String(formData.get("planoSaudeQual") ?? ""),
    federado: String(formData.get("federado") ?? ""),
    federadoClube: String(formData.get("federadoClube") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    // Mesmo padrão de app/base/captacao/actions.ts: o input de número do endereço vem como
    // name="numero" (EnderecoFields), e vira `numero_endereco` na hora de gravar.
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    responsavelLegalNome: String(formData.get("responsavelLegalNome") ?? ""),
    responsavelLegalCpf: String(formData.get("responsavelLegalCpf") ?? ""),
    concordoAtleta: formData.get("concordoAtleta") === "on",
    concordoResponsavel: formData.get("concordoResponsavel") === "on",
  };

  const result = captacaoInscricaoSchema.safeParse(raw);
  // `values` (pra reidratar o formulário no erro) só guarda texto — os dois checkboxes não
  // precisam voltar pro cliente como string, o próprio estado do checkbox já reflete o que a
  // pessoa marcou.
  const { concordoAtleta: _a, concordoResponsavel: _r, ...valuesTexto } = raw;
  return { raw, valuesTexto, result };
}

/** Confere se todos os documentos obrigatórios (mais a foto) vieram como arquivo de verdade — um
 * `<input type="file">` vazio ainda manda um File com `size === 0`, então isso cobre tanto "campo
 * não enviado" quanto "campo enviado sem escolher arquivo". */
function arquivoValido(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function inscreverCaptacao(
  _prevState: InscricaoCaptacaoState,
  formData: FormData,
): Promise<InscricaoCaptacaoState> {
  const { valuesTexto, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return {
      error: "Existem campos com erro. Revise os campos destacados em vermelho acima.",
      fieldErrors,
      values: valuesTexto,
    };
  }

  // Arquivos não passam pelo Zod (`captacaoInscricaoSchema` só cobre texto) — conferidos aqui, num
  // segundo passo, juntando todos num só aviso pra pessoa ver de uma vez tudo que falta anexar.
  // Mesmo padrão de `cadastrarAtletaBasePublico` (foto obrigatória), estendido aos 5 documentos.
  const foto = formData.get("foto");
  const documentosEnviados: Partial<Record<CaptacaoDocumentoTipo, File>> = {};
  const fieldErrorsArquivos: Record<string, string> = {};
  if (!arquivoValido(foto)) fieldErrorsArquivos.foto = "A foto do atleta é obrigatória.";
  for (const tipo of Object.keys(DOCUMENTOS_OBRIGATORIOS) as CaptacaoDocumentoTipo[]) {
    const arquivo = formData.get(tipo);
    if (!arquivoValido(arquivo)) {
      fieldErrorsArquivos[tipo] = `${DOCUMENTOS_OBRIGATORIOS[tipo]} é obrigatório.`;
    } else {
      documentosEnviados[tipo] = arquivo;
    }
  }
  if (Object.keys(fieldErrorsArquivos).length > 0) {
    return {
      error: "Existem campos com erro. Revise os campos destacados em vermelho acima.",
      fieldErrors: fieldErrorsArquivos,
      values: valuesTexto,
    };
  }

  const admin = createAdminClient();

  const { data: configData } = await admin
    .from("configuracoes_inscricao_captacao_base")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  if (!configData?.cadastro_publico_ativo) {
    return { error: "As inscrições estão fechadas no momento. Fale com o responsável do Futebol de Base." };
  }

  const data = result.data;
  const { data: inserted, error } = await admin
    .from("captacao_base")
    .insert({
      nome_completo: data.nomeCompleto,
      rg: data.rg,
      cpf: data.cpf,
      data_nascimento: data.dataNascimento,
      posicao: data.posicao,
      segunda_posicao: data.segundaPosicao || null,
      pe_dominante: data.peDominante,
      altura: data.altura,
      peso: data.peso,
      categoria: data.categoria,
      telefone: data.telefone || null,
      email: data.email,
      indicacao: data.indicacao || null,
      clube_anterior: data.clubeAnterior || null,
      mae_nome: data.maeNome || null,
      mae_telefone: data.maeTelefone || null,
      pai_nome: data.paiNome || null,
      pai_telefone: data.paiTelefone || null,
      escola: data.escola || null,
      escolaridade: data.escolaridade || null,
      periodo_escolar: data.periodoEscolar,
      possui_plano_saude: data.possuiPlanoSaude === "sim",
      plano_saude_qual: data.possuiPlanoSaude === "sim" ? data.planoSaudeQual || null : null,
      federado: data.federado === "sim",
      federado_clube: data.federado === "sim" ? data.federadoClube || null : null,
      cep: data.cep || null,
      logradouro: data.logradouro || null,
      numero_endereco: data.numero || null,
      complemento: data.complemento || null,
      bairro: data.bairro || null,
      cidade: data.cidade || null,
      uf: data.uf ? data.uf.toUpperCase() : null,
      responsavel_legal_nome: data.responsavelLegalNome,
      responsavel_legal_cpf: data.responsavelLegalCpf,
      termo_aceite_atleta: data.concordoAtleta,
      termo_aceite_responsavel: data.concordoResponsavel,
      termo_aceito_em: new Date().toISOString(),
      status: "inscricao",
      data_inicio: null,
      origem: "publico",
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: `Não foi possível enviar a inscrição: ${error?.message}`, values: valuesTexto };

  const candidatoId = inserted.id as string;
  const caminhosDocumentosEnviados: string[] = [];

  /** Desfaz o registro e os arquivos já enviados — usado quando um upload ou insert seguinte falha,
   * pra não deixar uma inscrição incompleta (sem foto ou sem um documento obrigatório) na fila de
   * Aprovações do Mateus, nem arquivo órfão nos buckets. */
  async function desfazerInscricao(caminhoFoto?: string) {
    await admin.from("captacao_base").delete().eq("id", candidatoId);
    if (caminhoFoto) await admin.storage.from(ENTITY_PHOTOS_BUCKET).remove([caminhoFoto]);
    if (caminhosDocumentosEnviados.length > 0) {
      await admin.storage.from(CAPTACAO_DOCUMENTOS_BUCKET).remove(caminhosDocumentosEnviados);
    }
  }

  // Foto e documentos são enviados depois do registro existir, porque o path de cada um usa o id
  // do candidato. `foto` já foi conferida como File válido acima (`arquivoValido`); o `as File`
  // só contorna o TypeScript não propagar esse narrowing por uma variável independente.
  const fotoResultado = await uploadFotoRedimensionada(admin, foto as File, "captacao-base", candidatoId);
  if (fotoResultado.error) {
    await desfazerInscricao();
    return { error: "Não foi possível enviar a foto do atleta. Tente novamente.", values: valuesTexto };
  }
  await admin.from("captacao_base").update({ foto_path: fotoResultado.path }).eq("id", candidatoId);

  for (const [tipo, arquivo] of Object.entries(documentosEnviados) as [CaptacaoDocumentoTipo, File][]) {
    const documentoResultado = await uploadCaptacaoDocumento(admin, arquivo, candidatoId, tipo);
    if (documentoResultado.error || !documentoResultado.path) {
      await desfazerInscricao(fotoResultado.path);
      return {
        error: `Não foi possível enviar o documento "${DOCUMENTOS_OBRIGATORIOS[tipo]}". Tente novamente.`,
        values: valuesTexto,
      };
    }
    caminhosDocumentosEnviados.push(documentoResultado.path);
    const { error: docError } = await admin
      .from("captacao_documentos")
      .insert({ captacao_id: candidatoId, tipo, arquivo_path: documentoResultado.path });
    if (docError) {
      await desfazerInscricao(fotoResultado.path);
      return {
        error: `Não foi possível registrar o documento "${DOCUMENTOS_OBRIGATORIOS[tipo]}". Tente novamente.`,
        values: valuesTexto,
      };
    }
  }

  revalidatePath("/base/captacao");
  revalidatePath("/base/captacao/aprovacoes");
  return { success: true };
}
