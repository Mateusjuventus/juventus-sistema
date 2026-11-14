import Link from "next/link";
import { AtletaAvatarBloco } from "@/components/atleta-avatar";

/**
 * Card de pessoa da Comissão Técnica/Diretoria, usado na grade de `app/comissao-tecnica/page.tsx`.
 *
 * Revisão de 14/11/2026 (pedido direto do Mateus, no mesmo dia do Dashboard): "deixa no padrão dos
 * atletas" — este card agora usa a MESMA anatomia de `AtletaCard` (components/atletas/
 * atleta-card.tsx): foto 3:4 (`AtletaAvatarBloco`, o mesmo componente do card de Atleta — inclusive
 * o mesmo fundo gradiente grená com as iniciais de quem ainda não tem foto, em vez do quadrado
 * cinza com só a primeira letra de antes), faixa clara com o nome logo abaixo da foto, e um bloco
 * escuro grená embaixo com o resto da informação (aqui, Função/Setor em vez de nascimento/CPF/
 * contrato, que não fazem sentido pra quem não é atleta). Deliberadamente SEM os selos específicos
 * de atleta (sigla de posição, número da camisa, tipo de contrato, classificação G1/G2/G3) — só a
 * anatomia do card é compartilhada, não os dados.
 *
 * O `flex flex-col` no `Link` + `flex-1` no bloco escuro (mesmo comentário de `AtletaCard`) resolve
 * a inconsistência de altura que o Mateus apontou ("parece uns estar com aquela barra do card maior
 * que a outra"): como a grade estica cada card até a altura do maior vizinho na mesma linha (nomes
 * de tamanho variável, com/sem Setor preenchido), é o bloco escuro que absorve essa sobra — sem
 * isso, sobrava como uma faixa branca vazia embaixo dos cards mais curtos da linha.
 */
export function ComissaoCard({
  id,
  nome,
  apelido,
  fotoUrl,
  funcao,
  setorLabel,
  ativo,
}: {
  id: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  funcao: string;
  setorLabel: string | null;
  ativo: boolean;
}) {
  const nomeExibido = apelido || nome;

  return (
    <Link
      href={`/comissao-tecnica/${id}/ver`}
      className={`flex flex-col overflow-hidden rounded-lg border-2 border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        ativo ? "" : "grayscale opacity-70"
      }`}
    >
      <div className="relative">
        <AtletaAvatarBloco
          nome={nome}
          fotoUrl={fotoUrl}
          className="aspect-[3/4] w-full"
          corFallback={{ bg: "bg-grena", texto: "text-white" }}
          comFundoEstudio
        />
        {!ativo ? (
          <span className="absolute bottom-1.5 right-1.5 whitespace-nowrap rounded-full bg-neutral-700 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            Inativo
          </span>
        ) : null}
      </div>

      {/* Faixa clara com o nome — mesmo padrão do `AtletaCard` (apelido quando existe, senão o
          nome completo). */}
      <div className="flex min-h-[1.5rem] items-center justify-center bg-neutral-100 px-1.5 py-0.5">
        <span className="line-clamp-2 break-words text-center text-[10px] font-bold leading-tight text-grena-escuro">
          {nomeExibido}
        </span>
      </div>

      {/* `flex-1`: absorve a altura extra quando a grade estica este card até o tamanho do maior
          vizinho na linha (ver doc-comment acima). */}
      <div className="flex flex-1 flex-col justify-center bg-grena-escuro px-2 py-2">
        {/* Nome completo — repete o texto da faixa de cima quando não há apelido, esperado (mesmo
            comportamento do `AtletaCard`). */}
        <p className="break-words text-center text-[9px] font-semibold leading-tight text-white/90">{nome}</p>
        <p className="mt-1 break-words text-center text-xs font-bold leading-tight text-white">{funcao}</p>
        {setorLabel ? (
          <p className="mt-0.5 break-words text-center text-[9px] leading-tight text-white/75">{setorLabel}</p>
        ) : null}
      </div>
    </Link>
  );
}
