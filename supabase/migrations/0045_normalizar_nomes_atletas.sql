-- Padroniza o nome completo dos atletas já cadastrados (alguns estão em CAIXA ALTA, outros em
-- minúsculas) para "Primeira Letra Maiúscula", com conectivos (dos, das, do, da, e) em minúsculo
-- quando não são a primeira palavra — mesmo padrão que o cadastro (Profissional e Base) passa a
-- aplicar automaticamente a partir de agora em toda gravação.
--
-- Roda uma vez, corrige os dados já existentes. É seguro rodar de novo (nomes já padronizados não
-- mudam ao passar pela função de novo).

create or replace function public._normalizar_nome_proprio(nome text)
returns text
language plpgsql
immutable
as $$
declare
  palavras text[];
  conectivos text[] := array['da', 'das', 'de', 'do', 'dos', 'e'];
  resultado text := '';
  palavra text;
  i int := 0;
  total int;
begin
  if nome is null then
    return null;
  end if;

  palavras := regexp_split_to_array(trim(regexp_replace(nome, '\s+', ' ', 'g')), ' ');
  total := array_length(palavras, 1);

  foreach palavra in array palavras loop
    i := i + 1;
    if i > 1 and lower(palavra) = any(conectivos) then
      resultado := resultado || lower(palavra);
    else
      resultado := resultado || initcap(palavra);
    end if;
    if i < total then
      resultado := resultado || ' ';
    end if;
  end loop;

  return resultado;
end;
$$;

update public.atletas set nome_completo = public._normalizar_nome_proprio(nome_completo);
update public.atletas_base set nome_completo = public._normalizar_nome_proprio(nome_completo);

drop function public._normalizar_nome_proprio(text);
