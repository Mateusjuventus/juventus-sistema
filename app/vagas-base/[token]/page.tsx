import { JuventusCrest } from "@/components/juventus-crest";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildConfrontoTexto } from "@/lib/posters/jogo-texto";
import { diaDaSemana, formatDataBr, formatHorario } from "@/lib/posters/relacionados-data";
import { horarioDaFuncao, montarResumo, todasPreenchidas, vagasRestantes } from "@/lib/futebol/vagas-staff";
import type {
  JogoBaseRow,
  JogoVagasStaffBaseFuncaoRow,
  JogoVagasStaffBaseInscricaoRow,
  JogoVagasStaffBaseRow,
  StaffFuncaoCatalogoRow,
  StaffOperacionalBaseRow,
} from "@/lib/supabase/types";
import { desistirVagaBase, pegarVagaBase } from "./actions";
import {
  VagaPublicaForm,
  type InscricaoDaPessoa,
  type PessoaOpcao,
} from "@/components/vaga-publica-form";

export const dynamic = "force-dynamic";

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-grena-escuro px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <JuventusCrest className="h-20 w-auto drop-shadow-lg" />
          <h1 className="mt-3 text-xl font-bold text-white">Juventus - SAF</h1>
          <p className="mt-1 text-sm text-white/70">Vagas de trabalho no jogo — Futebol de Base</p>
        </div>
        <div className="card p-5 sm:p-6">{children}</div>
      </div>
    </main>
  );
}

/**
 * Espelha `app/vagas/[token]/page.tsx` para o Futebol de Base — link público `/vagas-base/<token>`,
 * sem login, rodando com o cliente admin (service_role) porque quem abre não tem sessão. Ver
 * docs/superpowers/specs/2026-08-14-vagas-staff-design.md.
 */
export default async function VagasPublicasBasePage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: vagasData, error: vagasError } = await admin
    .from("jogo_vagas_staff_base")
    .select("*")
    .eq("token", params.token)
    .maybeSingle();

  if (vagasError) {
    console.error("[vagas-base] erro ao buscar o link:", vagasError);
    // 42501 = falta GRANT pro service_role (ver 0075_vagas_staff_base.sql, que já nasceu com o
    // grant — mas se a migração não tiver sido aplicada ainda, o efeito é o mesmo). 42P01 / PGRST205
    // = a tabela não existe, no Postgres e no cache do PostgREST. Nos três casos o problema é de
    // instalação, não do link que a pessoa abriu.
    const problemaDeInstalacao =
      vagasError.code === "42P01" || vagasError.code === "PGRST205" || vagasError.code === "42501";
    return (
      <Moldura>
        <div className="py-6 text-center">
          <p className="text-lg font-semibold text-grena-escuro">Vagas indisponíveis no momento</p>
          <p className="mt-2 text-sm text-neutral-500">
            {problemaDeInstalacao
              ? "O recurso de vagas ainda não foi liberado neste sistema. Avise o Departamento de Futebol de Base."
              : "Não foi possível carregar as vagas agora. Tente novamente em instantes."}
          </p>
        </div>
      </Moldura>
    );
  }

  if (!vagasData) {
    return (
      <Moldura>
        <div className="py-6 text-center">
          <p className="text-lg font-semibold text-grena-escuro">Link não encontrado</p>
          <p className="mt-2 text-sm text-neutral-500">
            Confira se o endereço veio completo — ele termina em 12 letras e números. Se estiver certo,
            peça o link atualizado ao Departamento de Futebol de Base.
          </p>
        </div>
      </Moldura>
    );
  }

  const vagas = vagasData as JogoVagasStaffBaseRow;

  const [{ data: jogoData }, { data: funcoesData }, { data: inscricoesData }, { data: catalogoData }] =
    await Promise.all([
      admin.from("jogos_base").select("*").eq("id", vagas.jogo_id).maybeSingle(),
      admin.from("jogo_vagas_staff_base_funcoes").select("*").eq("vagas_id", vagas.id),
      admin.from("jogo_vagas_staff_base_inscricoes").select("*").eq("vagas_id", vagas.id),
      admin.from("staff_funcoes_catalogo").select("*"),
    ]);

  const jogo = jogoData as JogoBaseRow | null;
  const funcoes = (funcoesData ?? []) as JogoVagasStaffBaseFuncaoRow[];
  const inscricoes = (inscricoesData ?? []) as JogoVagasStaffBaseInscricaoRow[];
  const catalogo = (catalogoData ?? []) as StaffFuncaoCatalogoRow[];
  const nomePorFuncaoId = new Map(catalogo.map((f) => [f.id, f.nome]));

  const resumos = montarResumo(funcoes, inscricoes, nomePorFuncaoId);
  const lotado = todasPreenchidas(resumos);

  const { data: staffData } = await admin
    .from("staff_operacional_base")
    .select("id, nome_completo, funcao_id, funcao_terceirizada_id, terceirizada")
    .eq("ativo", true)
    .order("nome_completo", { ascending: true });

  const staff = (staffData ?? []) as Pick<
    StaffOperacionalBaseRow,
    "id" | "nome_completo" | "funcao_id" | "funcao_terceirizada_id" | "terceirizada"
  >[];

  const resumoPorFuncaoId = new Map(resumos.map((r) => [r.funcaoId, r]));
  const pessoas: PessoaOpcao[] = staff.map((p) => {
    const funcaoId = p.terceirizada ? p.funcao_terceirizada_id : p.funcao_id;
    const resumo = funcaoId ? resumoPorFuncaoId.get(funcaoId) : undefined;
    return {
      id: p.id,
      nome: p.nome_completo,
      funcaoNome: funcaoId ? (nomePorFuncaoId.get(funcaoId) ?? null) : null,
      temVaga: Boolean(resumo) && vagasRestantes(resumo!) > 0,
      vagasRestantes: resumo ? vagasRestantes(resumo) : 0,
      horario: horarioDaFuncao(resumo?.horarioApresentacao, vagas.horario_apresentacao),
    };
  });

  const resumoPorVagaFuncaoId = new Map(resumos.map((r) => [r.vagaFuncaoId, r]));
  const inscricaoPorStaff: Record<string, InscricaoDaPessoa> = {};
  for (const i of inscricoes) {
    const resumo = resumoPorVagaFuncaoId.get(i.vaga_funcao_id);
    inscricaoPorStaff[i.staff_id] = {
      situacao: i.situacao,
      funcaoNome: resumo?.funcaoNome ?? "—",
      horario: horarioDaFuncao(resumo?.horarioApresentacao, vagas.horario_apresentacao),
    };
  }

  const pegarAction = pegarVagaBase.bind(null, params.token);
  const desistirAction = desistirVagaBase.bind(null, params.token);

  const totalRestantes = resumos.reduce((soma, r) => soma + vagasRestantes(r), 0);

  return (
    <Moldura>
      {jogo ? (
        <div className="mb-4 rounded-md border border-linha p-3">
          <p className="text-base font-bold text-grena-escuro">{buildConfrontoTexto(jogo)}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {diaDaSemana(jogo.data_jogo)}, {formatDataBr(jogo.data_jogo)}
            {formatHorario(jogo.horario) ? ` · ${formatHorario(jogo.horario)}` : ""}
          </p>
          {jogo.local_estadio ? <p className="text-sm text-neutral-500">{jogo.local_estadio}</p> : null}
          {vagas.observacoes ? (
            <p className="mt-2 whitespace-pre-wrap border-t border-linha pt-2 text-sm text-neutral-600">
              {vagas.observacoes}
            </p>
          ) : null}
        </div>
      ) : null}

      {!vagas.aberto ? (
        <div className="py-6 text-center">
          <p className="text-lg font-semibold text-grena-escuro">Vagas encerradas</p>
          <p className="mt-2 text-sm text-neutral-500">
            A captação para este jogo foi fechada pelo Departamento de Futebol de Base.
          </p>
        </div>
      ) : resumos.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-lg font-semibold text-grena-escuro">Vagas ainda não abertas</p>
          <p className="mt-2 text-sm text-neutral-500">Tente de novo mais tarde.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 rounded-md bg-neutral-50 px-3 py-2 text-center text-sm font-semibold text-grena">
            {lotado
              ? "Vagas esgotadas neste jogo"
              : `${totalRestantes} vaga${totalRestantes === 1 ? "" : "s"} aberta${totalRestantes === 1 ? "" : "s"} — selecione seu nome para ver a sua`}
          </p>

          <div className="border-t border-linha pt-4">
            <VagaPublicaForm
              pessoas={pessoas}
              pegarAction={pegarAction}
              desistirAction={desistirAction}
              inscricaoPorStaff={inscricaoPorStaff}
              localApresentacao={vagas.local_apresentacao}
              cadastroHref="/cadastro-staff-base"
            />
          </div>
        </>
      )}
    </Moldura>
  );
}
