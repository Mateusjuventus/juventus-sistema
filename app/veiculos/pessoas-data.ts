import { createClient } from "@/lib/supabase/server";
import { formatCPF } from "@/lib/validation/cpf";
import type { PessoaOpcaoVeiculo } from "./veiculo-form";

/**
 * Lista de pessoas que podem ser vinculadas a um veículo — atletas, comissão técnica e staff
 * operacional ativo, sempre por NOME COMPLETO (a Relação de Placas vai para a portaria de um
 * estádio: apelido ali não confere com documento).
 *
 * O CPF já vem formatado porque é assim que ele é copiado pro documento; o RG do atleta/comissão
 * fica de fora de propósito — quando os dois existem, o CPF é o que a portaria pede.
 */
export async function carregarPessoasParaVeiculo(): Promise<PessoaOpcaoVeiculo[]> {
  const supabase = createClient();

  const [{ data: atletasData }, { data: comissaoData }, { data: staffData }] = await Promise.all([
    supabase.from("atletas").select("id, nome_completo, cpf, telefone").order("nome_completo"),
    supabase.from("comissao_tecnica").select("id, nome_completo, cpf, telefone").order("nome_completo"),
    supabase
      .from("staff_operacional")
      .select("id, nome_completo, cpf, telefone")
      .eq("ativo", true)
      .order("nome_completo"),
  ]);

  type Linha = { id: string; nome_completo: string; cpf: string | null; telefone: string | null };
  const mapear = (linhas: Linha[], tipo: PessoaOpcaoVeiculo["tipo"]): PessoaOpcaoVeiculo[] =>
    linhas.map((p) => ({
      tipo,
      id: p.id,
      nome: p.nome_completo,
      documento: p.cpf ? formatCPF(p.cpf) : null,
      telefone: p.telefone,
    }));

  return [
    ...mapear((atletasData ?? []) as Linha[], "atleta"),
    ...mapear((comissaoData ?? []) as Linha[], "comissao"),
    ...mapear((staffData ?? []) as Linha[], "staff"),
  ];
}
