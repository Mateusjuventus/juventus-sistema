"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { captacaoInscricaoSchema } from "@/lib/validation/schemas";
import { uploadFotoRedimensionada, getSignedPhotoUrl, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { camposComunsCaptacao, encontrarCandidatoParaCompletar } from "@/lib/futebol/captacao";
import { isValidCPF } from "@/lib/validation/cpf";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";

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
 * exige a foto do candidato e grava o Termo de Responsabilidade (consentimento digital). Como o
 * arquivo da foto não é coberto pelo `captacaoInscricaoSchema` (Zod não valida File de FormData
 * bem), é conferido à parte, depois da validação dos campos de texto — só então o registro é
 * criado.
 *
 * Os 5 documentos obrigatórios (RG, declaração escolar, atestado médico, eletrocardiograma) NÃO são
 * mais coletados por aqui — pedido do Mateus em 2026-10-01: ele recolhe fisicamente com a família,
 * em vez de guardar cópia digital no Supabase (volume de ~100 atletas pesava rápido no armazenamento/
 * egress do plano gratuito). A tabela `captacao_documentos` e o bucket `captacao-documentos`
 * continuam existindo (candidatos antigos podem ter documento registrado), só não recebem mais
 * envio novo daqui.
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

/** Confere se a foto do atleta veio como arquivo de verdade — um `<input type="file">` vazio ainda
 * manda um File com `size === 0`, então isso cobre tanto "campo não enviado" quanto "campo enviado
 * sem escolher arquivo". */
function arquivoValido(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

/**
 * Etapa inicial do formulário público (ver spec 2026-09-11-captacao-completar-cadastro-cpf-
 * design.md) — antes de mostrar o resto da ficha, pede CPF + data de nascimento e confere se já
 * existe um candidato "Em avaliação" com isso (criado pelo Mateus/equipe pelo formulário interno,
 * sem documentos/termo ainda). `verificado` vira `true` depois da primeira tentativa (achando ou
 * não), momento em que o restante do formulário passa a aparecer.
 *
 * `candidatoId`/`valuesTexto`/`fotoUrl` só vêm preenchidos quando ACHA um candidato — os campos já
 * preenchidos pré-populam o resto da ficha (editável) e o `id` vai num campo oculto pro envio saber
 * que é pra completar esse cadastro em vez de criar um novo. Não achando (CPF novo, CPF existe mas
 * data de nascimento não bate, ou o candidato já foi decidido), `valuesTexto` só carrega de volta o
 * que a pessoa acabou de digitar (CPF/data de nascimento), pra não digitar de novo — e a resposta é
 * SEMPRE esse mesmo formato, sem `candidatoId`, pra ninguém conseguir usar essa etapa pra descobrir
 * se um CPF está cadastrado (decisão 4 da spec).
 */
export interface VerificacaoCaptacaoState {
  verificado: boolean;
  erro?: string;
  candidatoId?: string;
  valuesTexto?: Record<string, string>;
  fotoUrl?: string | null;
}

export async function verificarCandidatoExistente(
  _prevState: VerificacaoCaptacaoState,
  formData: FormData,
): Promise<VerificacaoCaptacaoState> {
  const cpf = String(formData.get("cpf") ?? "");
  const dataNascimento = String(formData.get("dataNascimento") ?? "");

  if (!isValidCPF(cpf)) {
    return { verificado: false, erro: "CPF inválido.", valuesTexto: { cpf, dataNascimento } };
  }
  if (!dataNascimento) {
    return { verificado: false, erro: "Informe a data de nascimento.", valuesTexto: { cpf, dataNascimento } };
  }

  const admin = createAdminClient();
  const { data } = await admin.from("captacao_base").select("*").eq("status", "avaliacao").not("cpf", "is", null);
  const candidatos = (data ?? []) as CaptacaoBaseRow[];
  const candidatoId = encontrarCandidatoParaCompletar(candidatos, cpf, dataNascimento);

  if (!candidatoId) {
    return { verificado: true, valuesTexto: { cpf, dataNascimento } };
  }

  const candidato = candidatos.find((c) => c.id === candidatoId) as CaptacaoBaseRow;
  const fotoUrl = await getSignedPhotoUrl(admin, candidato.foto_path);

  return {
    verificado: true,
    candidatoId,
    fotoUrl,
    valuesTexto: {
      ...camposComunsCaptacao(candidato),
      possuiPlanoSaude: candidato.possui_plano_saude ? "sim" : "nao",
      federado: candidato.federado ? "sim" : "nao",
    },
  };
}

export async function inscreverCaptacao(
  _prevState: InscricaoCaptacaoState,
  formData: FormData,
): Promise<InscricaoCaptacaoState> {
  const { valuesTexto, result } = parseForm(formData);

  // Junta os erros de texto (Zod) com os de arquivo (conferidos mais abaixo) num aviso só — antes,
  // um reenvio revelava um tipo de erro por vez (texto primeiro, arquivo só depois de corrigir o
  // texto), fazendo a pessoa reenviar várias vezes até descobrir tudo que faltava. Pedido do Mateus,
  // 27/09: "quero que ao enviar... aparecer pra pessoa o que está faltando" — de uma vez, não aos
  // poucos.
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
  }

  const admin = createAdminClient();

  // Campo oculto preenchido pela etapa de verificação de CPF quando ela acha um candidato "Em
  // avaliação" já existente (ver `verificarCandidatoExistente` acima e spec 2026-09-11-captacao-
  // completar-cadastro-cpf-design.md) — presente só nesse caso; do contrário é uma inscrição nova.
  const captacaoIdExistente = String(formData.get("captacaoIdExistente") ?? "") || null;
  let candidatoExistente: CaptacaoBaseRow | null = null;
  if (captacaoIdExistente) {
    const { data: existente } = await admin
      .from("captacao_base")
      .select("*")
      .eq("id", captacaoIdExistente)
      .eq("status", "avaliacao")
      .maybeSingle();
    // Não achou mais (alguém decidiu esse candidato entre a verificação e o envio, ou o id foi
    // adulterado) — não dá mais pra completar esse cadastro por aqui. Pede pra recarregar em vez de
    // silenciosamente virar uma inscrição nova (evitaria duplicar sem a pessoa perceber).
    if (!existente) {
      return {
        error:
          "Não foi possível confirmar esse cadastro (pode ter sido decidido nesse meio tempo). Recarregue a página e tente novamente.",
        values: valuesTexto,
      };
    }
    candidatoExistente = existente as CaptacaoBaseRow;
  }
  // Só dispensa a foto quando está completando um cadastro que já tem uma (o formulário interno
  // às vezes já anexa) — inscrição nova continua sempre exigindo.
  const fotoJaExistente = !!candidatoExistente?.foto_path;

  // Arquivo não passa pelo Zod (`captacaoInscricaoSchema` só cobre texto) — conferido aqui, num
  // segundo passo, mas juntado ao mesmo `fieldErrors` de cima (não um aviso à parte) — mesmo padrão
  // de `cadastrarAtletaBasePublico` (foto obrigatória).
  const foto = formData.get("foto");
  const fotoValida = arquivoValido(foto);
  if (!fotoValida && !fotoJaExistente) fieldErrors.foto = "A foto do atleta é obrigatória.";

  // Um só ponto de saída pra qualquer campo de texto ou arquivo com problema — cobre também o caso
  // de `!result.success` sem nenhum `fieldErrors` (não deveria acontecer, já que todo issue do Zod
  // vira uma entrada, mas serve de rede de segurança pro TypeScript conseguir estreitar `result`
  // pra `result.success: true` dali pra frente).
  if (Object.keys(fieldErrors).length > 0 || !result.success) {
    return {
      error: "Existem campos com erro. Revise os campos destacados em vermelho acima.",
      fieldErrors,
      values: valuesTexto,
    };
  }

  const { data: configData } = await admin
    .from("configuracoes_inscricao_captacao_base")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  if (!configData?.cadastro_publico_ativo) {
    return { error: "As inscrições estão fechadas no momento. Fale com o responsável do Futebol de Base." };
  }

  const data = result.data;
  // Campos em comum entre criar uma inscrição nova e completar uma já existente — o que muda entre
  // os dois é status/data_inicio/origem (preservados no caminho de completar, ver abaixo) e o
  // próprio id (gerado num INSERT, já conhecido num UPDATE).
  const camposComuns = {
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
  };

  let candidatoId: string;
  if (candidatoExistente) {
    // Completar cadastro existente: UPDATE, preservando id/numero/status/origem/data_inicio/
    // atleta_gerado_id — o candidato já está "Em avaliação", não deve voltar pra fila de Aprovações
    // nem trocar de origem (ver spec, seção 4). Confere de novo o status na cláusula WHERE (defesa
    // contra corrida com o SELECT acima).
    const { data: atualizado, error } = await admin
      .from("captacao_base")
      .update(camposComuns)
      .eq("id", candidatoExistente.id)
      .eq("status", "avaliacao")
      .select("id")
      .single();
    if (error || !atualizado) {
      console.error("inscreverCaptacao: falha ao completar cadastro em captacao_base", error);
      // 22003 = numeric_value_out_of_range (ver comentário equivalente no caminho de inscrição
      // nova, abaixo) — nada a ver com o candidato ter sido decidido nesse meio tempo, então merece
      // mensagem própria em vez da genérica de corrida.
      const mensagem =
        error?.code === "22003"
          ? "Um dos valores numéricos (altura ou peso) está fora do esperado. Confira se a altura está em metros (ex.: 1.75) e o peso em kg, e tente novamente."
          : "Não foi possível completar esse cadastro (ele pode ter sido decidido nesse meio tempo). Recarregue a página e tente novamente.";
      return { error: mensagem, values: valuesTexto };
    }
    candidatoId = atualizado.id as string;
  } else {
    const { data: inserted, error } = await admin
      .from("captacao_base")
      .insert({ ...camposComuns, status: "inscricao", data_inicio: null, origem: "publico" })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("inscreverCaptacao: falha ao inserir em captacao_base", error);
      // 22003 = numeric_value_out_of_range — o caso mais comum é altura/peso fora da faixa esperada
      // pelas colunas (`altura numeric(3,2)`, `peso numeric(5,2)`); a validação em
      // `alturaMetrosField` já bloqueia isso antes de chegar aqui, mas esse aviso específico fica
      // como rede de segurança em vez de deixar o erro cru do banco aparecer pra família.
      const mensagem =
        error?.code === "22003"
          ? "Um dos valores numéricos (altura ou peso) está fora do esperado. Confira se a altura está em metros (ex.: 1.75) e o peso em kg, e tente novamente."
          : "Não foi possível enviar a inscrição. Tente novamente.";
      return { error: mensagem, values: valuesTexto };
    }
    candidatoId = inserted.id as string;
  }

  let fotoPathNovo: string | undefined;

  /** Desfaz o registro e a foto enviada NESTA submissão — só quando é uma inscrição NOVA.
   * Completando um cadastro que já existia antes desta submissão, nunca desfaz nada aqui: apagar o
   * registro desfaria trabalho legítimo e, pior, apagaria um candidato que o Mateus criou
   * manualmente só porque o upload da foto deu erro. */
  async function desfazerInscricao() {
    if (candidatoExistente) return;
    await admin.from("captacao_base").delete().eq("id", candidatoId);
    if (fotoPathNovo) await admin.storage.from(ENTITY_PHOTOS_BUCKET).remove([fotoPathNovo]);
  }

  // Foto: só sobe se uma nova foi enviada (`fotoValida`) — completando um cadastro que já tem foto,
  // sem trocar, o `foto_path` existente fica como está. `foto` já foi conferida como File válido
  // acima; o `as File` só contorna o TypeScript não propagar esse narrowing por uma variável
  // independente.
  if (fotoValida) {
    const fotoResultado = await uploadFotoRedimensionada(admin, foto as File, "captacao-base", candidatoId);
    if (fotoResultado.error) {
      await desfazerInscricao();
      return { error: "Não foi possível enviar a foto do atleta. Tente novamente.", values: valuesTexto };
    }
    fotoPathNovo = fotoResultado.path;
    await admin.from("captacao_base").update({ foto_path: fotoResultado.path }).eq("id", candidatoId);
  }

  revalidatePath("/base/captacao");
  revalidatePath("/base/captacao/aprovacoes");
  revalidatePath(`/base/captacao/${candidatoId}`);
  return { success: true };
}
