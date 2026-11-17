import { formatCPF } from "@/lib/validation/cpf";
import { formatCEP } from "@/lib/validation/cep";
import { enderecoFichaAtleta } from "@/lib/futebol/ficha-atleta";
import { valorPorExtenso } from "@/lib/pdf/valor-extenso";
import { formatDataBr, formatDataExtenso } from "@/lib/pdf/logistica-shared";
import { atletaMaiorIdade } from "@/lib/futebol/contrato";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";
import type { ContratoFormacaoCampos } from "@/lib/pdf/contrato-formacao-document";
import type { ContratoFormacaoMaiorCampos } from "@/lib/pdf/contrato-formacao-maior-document";

function naturalidade(cidade: string | null, uf: string | null): string {
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf || "";
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function capitalizar(texto: string): string {
  return texto.length > 0 ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

export interface CamposContratoFormacao {
  /** Decide (na hora de chamar, dinamicamente) qual dos dois modelos usar — ver `atletaMaiorIdade`
   * em lib/futebol/contrato.ts: se o atleta completar 18 anos durante a vigência do mesmo Contrato
   * de Formação, passa a usar `camposMaior` automaticamente, sem precisar editar nada. */
  maiorDeIdade: boolean;
  camposMenor: ContratoFormacaoCampos;
  camposMaior: ContratoFormacaoMaiorCampos;
}

/**
 * Monta os `campos` (placeholders `{{...}}`) dos dois modelos de Contrato de Formação a partir do
 * atleta + contrato vigente — compartilhado entre a geração do PDF
 * (`app/atletas/[id]/contrato/formacao/pdf/route.tsx`) e a busca do texto padrão pro editor de
 * "Personalizar texto do contrato" (`buscarTextoPadraoContratoFormacao`, em
 * `app/atletas/[id]/contrato/formacao/actions.ts`) — pra nunca os dois lugares calcularem os campos
 * de um jeito diferente. Ver docs/superpowers/specs/2026-11-16-contrato-formacao-texto-
 * personalizado-design.md.
 */
export function construirCamposContratoFormacao(
  atleta: AtletaRow,
  contrato: AtletaContratoRow,
): CamposContratoFormacao {
  const endereco =
    enderecoFichaAtleta({
      logradouro: atleta.logradouro,
      numero: atleta.numero,
      complemento: atleta.complemento,
      bairro: atleta.bairro,
      cidade: atleta.cidade,
      uf: atleta.uf,
      cepFormatado: atleta.cep ? formatCEP(atleta.cep) : null,
    }) ?? "";

  const bolsaValor =
    contrato.bolsa_aprendizagem > 0
      ? `${formatMoeda(contrato.bolsa_aprendizagem)} (${capitalizar(valorPorExtenso(contrato.bolsa_aprendizagem))})`
      : "";
  const dataAssinaturaExtenso = formatDataExtenso(contrato.vigencia_inicio);

  const camposMenor: ContratoFormacaoCampos = {
    nomeCompleto: atleta.nome_completo,
    dataNascimento: formatDataBr(atleta.data_nascimento),
    naturalidade: naturalidade(atleta.cidade_natal, atleta.uf_natal),
    rg: atleta.rg,
    cpf: atleta.cpf ? formatCPF(atleta.cpf) : "",
    maeNome: atleta.mae_nome ?? "",
    maeCpf: atleta.mae_cpf ? formatCPF(atleta.mae_cpf) : "",
    paiNome: atleta.pai_nome ?? "",
    paiCpf: atleta.pai_cpf ? formatCPF(atleta.pai_cpf) : "",
    endereco,
    vigenciaInicio: formatDataBr(contrato.vigencia_inicio),
    vigenciaFim: formatDataBr(contrato.vigencia_fim),
    bolsaValor,
    dataAssinaturaExtenso,
  };

  const camposMaior: ContratoFormacaoMaiorCampos = {
    nomeCompleto: atleta.nome_completo,
    dataNascimento: formatDataBr(atleta.data_nascimento),
    rg: atleta.rg,
    cpf: atleta.cpf ? formatCPF(atleta.cpf) : "",
    email: atleta.email ?? "",
    endereco,
    vigenciaInicio: formatDataBr(contrato.vigencia_inicio),
    vigenciaFim: formatDataBr(contrato.vigencia_fim),
    bolsaValor,
    dataAssinaturaExtenso,
  };

  return {
    maiorDeIdade: atletaMaiorIdade(atleta.data_nascimento, hojeBrasilia()),
    camposMenor,
    camposMaior,
  };
}
