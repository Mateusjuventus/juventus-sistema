import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCPF } from "@/lib/validation/cpf";
import { ENTITY_PHOTOS_BUCKET, buildPhotoPath } from "@/lib/supabase/storage";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";

/**
 * Cria o cadastro em `atletas_base` a partir de um candidato aprovado na Captação — ver spec
 * docs/superpowers/specs/2026-09-11-captacao-documentos-termo-auto-cadastro-design.md, seção 4.
 *
 * Isto reverte a decisão de 19/08 (`2026-08-19-captacao-atletas-separacao-design.md`, "Captação e
 * Atletas não tem relação nenhuma") — a diferença agora é que a Captação coleta dados suficientes
 * (RG, CPF, endereço completo, pé dominante, foto) pra que o cadastro gerado já saia bem mais
 * completo do que na tentativa original. As duas tabelas continuam independentes: isto só faz um
 * INSERT em `atletas_base`, nunca lê `atletas_base` de volta pra Captação.
 *
 * Chamada de `salvarParecerCaptacao` (app/treinador/actions.ts) logo depois que o parecer é salvo
 * com veredito "aprovado" — mesmo espírito best-effort de `assinarComoTreinadorEAvisarDemais`:
 * NUNCA lança exceção, nunca deve derrubar o salvamento do parecer em si. Qualquer falha (categoria/
 * RG/CPF/data de nascimento ausentes, RG ou CPF já cadastrados em outro atleta etc.) só grava uma
 * nota em `captacao_base.observacoes` pra alguém da equipe resolver manualmente depois.
 */
export async function criarAtletaBaseAPartirDeCaptacao(
  supabase: SupabaseClient,
  candidatoId: string,
): Promise<void> {
  const { data } = await supabase.from("captacao_base").select("*").eq("id", candidatoId).maybeSingle();
  if (!data) return;
  const candidato = data as CaptacaoBaseRow;

  // Já foi gerado antes (parecer reaberto/resalvo) — não duplica.
  if (candidato.atleta_gerado_id) return;

  const novoId = randomUUID();

  // Copia a foto ANTES de inserir o atleta: se a cópia falhar, ainda assim cria o cadastro (só sem
  // foto — dá pra subir depois, como qualquer campo) em vez de deixar o candidato aprovado sem
  // cadastro nenhum por causa de um problema no storage.
  let fotoPath: string | null = null;
  if (candidato.foto_path) {
    const destino = buildPhotoPath("atletas-base", novoId, "foto.jpg");
    const { error: copyError } = await supabase.storage
      .from(ENTITY_PHOTOS_BUCKET)
      .copy(candidato.foto_path, destino);
    if (!copyError) fotoPath = destino;
  }

  const { error } = await supabase.from("atletas_base").insert({
    id: novoId,
    categoria: candidato.categoria,
    nome_completo: candidato.nome_completo,
    rg: candidato.rg,
    cpf: candidato.cpf ? normalizeCPF(candidato.cpf) : null,
    data_nascimento: candidato.data_nascimento,
    posicao: candidato.posicao,
    pe_dominante: candidato.pe_dominante,
    telefone: candidato.telefone,
    foto_path: fotoPath,
    status: "liberado",
    ativo: true,
    mae_nome: candidato.mae_nome,
    mae_telefone: candidato.mae_telefone,
    pai_nome: candidato.pai_nome,
    pai_telefone: candidato.pai_telefone,
    escola: candidato.escola,
    cep: candidato.cep,
    logradouro: candidato.logradouro,
    numero: candidato.numero_endereco,
    complemento: candidato.complemento,
    bairro: candidato.bairro,
    cidade: candidato.cidade,
    uf: candidato.uf,
    // Campos que a Captação não coleta ficam em aberto (null) pra completar depois como qualquer
    // cadastro manual: apelido, número de camisa/CBF/FPF, datas de início/contrato, tipo de
    // contrato, agência, empresário, alojamento, classificação G1/G2/G3.
  });

  if (error) {
    const notaFalha =
      `Criação automática do cadastro de atleta falhou ao aprovar (${new Date().toLocaleDateString("pt-BR")}): ` +
      `${error.message}. Complete manualmente pelo cadastro de Atletas da Base, se for o caso.`;
    const observacoes = candidato.observacoes ? `${candidato.observacoes}\n\n${notaFalha}` : notaFalha;
    await supabase.from("captacao_base").update({ observacoes }).eq("id", candidatoId);
    return;
  }

  await supabase.from("captacao_base").update({ atleta_gerado_id: novoId }).eq("id", candidatoId);
}
