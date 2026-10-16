"use client";

import { useEffect, useState } from "react";

export interface EnderecoValues {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface EnderecoErrors {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

/**
 * Campos de endereço do Staff Operacional (cadastro interno e formulário público de cadastro), com
 * autopreenchimento por CEP: ao sair do campo CEP com 8 dígitos preenchidos, busca no ViaCEP
 * (serviço público, sem chave de acesso) e preenche rua/bairro/cidade/UF automaticamente — todos os
 * campos continuam editáveis manualmente depois, inclusive número e complemento (que o ViaCEP não
 * preenche).
 *
 * `required`: opcional, `false` por padrão (mantém o comportamento de sempre — endereço opcional
 * nos cadastros que já usam este componente). A inscrição pública de Captação
 * (`/inscricao-captacao-base`) passa `required`, já que lá TODOS os campos são obrigatórios (ver
 * `captacaoInscricaoSchema`) — os outros usos deste componente continuam sem mexer.
 *
 * Se o cadastro já chega com CEP preenchido mas o resto do endereço vazio (caso dos atletas do
 * Profissional migrados do texto livre antigo — ver 0100_atleta_cep_do_endereco_legado.sql —, cujo
 * texto tinha o CEP mas não dava pra separar rua/número/bairro/cidade/UF com segurança), a busca no
 * ViaCEP dispara sozinha ao abrir o formulário, sem precisar clicar no campo CEP e sair dele.
 *
 * `namePrefix`: opcional — prefixa o `name`/`id` de cada campo (ex.: "origem" vira `origem_cep`),
 * pra permitir mais de um bloco de endereço no mesmo formulário sem colidir nomes (pedido de
 * 2026-10-16: "Endereço de origem" além do "Endereço atual" no cadastro do atleta). Vazio por
 * padrão — nenhum uso existente muda.
 *
 * `onChange`: opcional — chamado com o endereço completo a cada campo editado. Só é preciso quando
 * outra parte do formulário precisa acompanhar o que foi digitado aqui (ex.: o checkbox "Mesmo
 * endereço de origem" do cadastro do atleta, que copia esses valores pro outro bloco de endereço).
 */
export function EnderecoFields({
  defaultValues,
  errors,
  required,
  namePrefix,
  onChange,
}: {
  defaultValues?: EnderecoValues;
  errors?: EnderecoErrors;
  required?: boolean;
  namePrefix?: string;
  onChange?: (values: EnderecoValues) => void;
}) {
  const fieldName = (campo: keyof EnderecoValues) => (namePrefix ? `${namePrefix}_${campo}` : campo);
  const [cep, setCep] = useState(defaultValues?.cep ?? "");
  const [logradouro, setLogradouro] = useState(defaultValues?.logradouro ?? "");
  const [numero, setNumero] = useState(defaultValues?.numero ?? "");
  const [complemento, setComplemento] = useState(defaultValues?.complemento ?? "");
  const [bairro, setBairro] = useState(defaultValues?.bairro ?? "");
  const [cidade, setCidade] = useState(defaultValues?.cidade ?? "");
  const [uf, setUf] = useState(defaultValues?.uf ?? "");
  const [buscando, setBuscando] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "nao-encontrado" | "erro">("idle");

  // Avisa quem está de fora (via `onChange`) do endereço completo depois de qualquer mudança —
  // cada setter de campo já tem o valor novo na mão, então passa como `patch` em vez de ler os
  // states (que ainda não teriam atualizado nesse mesmo tick).
  function emitirMudanca(patch: EnderecoValues) {
    onChange?.({ cep, logradouro, numero, complemento, bairro, cidade, uf, ...patch });
  }

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscando(true);
    setCepStatus("idle");
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (dados.erro) {
        setCepStatus("nao-encontrado");
        return;
      }
      const resolvido = {
        logradouro: dados.logradouro ?? "",
        bairro: dados.bairro ?? "",
        cidade: dados.localidade ?? "",
        uf: dados.uf ?? "",
      };
      setLogradouro(resolvido.logradouro);
      setBairro(resolvido.bairro);
      setCidade(resolvido.cidade);
      setUf(resolvido.uf);
      emitirMudanca(resolvido);
    } catch {
      setCepStatus("erro");
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    const digitos = (defaultValues?.cep ?? "").replace(/\D/g, "");
    const restoJaPreenchido =
      defaultValues?.logradouro || defaultValues?.bairro || defaultValues?.cidade || defaultValues?.uf;
    if (digitos.length === 8 && !restoJaPreenchido) {
      buscarCep(digitos);
    }
    // Só ao montar — não queremos refazer a busca a cada tecla digitada (isso já acontece no
    // onBlur do campo CEP).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={fieldName("cep")} className="field-label">
          CEP{required ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={fieldName("cep")}
          name={fieldName("cep")}
          value={cep}
          onChange={(e) => {
            setCep(e.target.value);
            emitirMudanca({ cep: e.target.value });
          }}
          onBlur={(e) => buscarCep(e.target.value)}
          placeholder="00000-000"
          required={required}
          className="field-input"
        />
        {buscando ? <p className="mt-1 text-xs text-neutral-400">Buscando endereço...</p> : null}
        {cepStatus === "nao-encontrado" ? (
          <p className="mt-1 text-xs text-amber-700">CEP não encontrado — preencha o endereço manualmente.</p>
        ) : null}
        {cepStatus === "erro" ? (
          <p className="mt-1 text-xs text-amber-700">
            Não foi possível buscar o CEP agora — preencha manualmente.
          </p>
        ) : null}
        {errors?.cep ? <p className="field-error">{errors.cep}</p> : null}
      </div>

      <div>
        <label htmlFor={fieldName("logradouro")} className="field-label">
          Rua / Logradouro{required ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={fieldName("logradouro")}
          name={fieldName("logradouro")}
          value={logradouro}
          onChange={(e) => {
            setLogradouro(e.target.value);
            emitirMudanca({ logradouro: e.target.value });
          }}
          required={required}
          className="field-input"
        />
        {errors?.logradouro ? <p className="field-error">{errors.logradouro}</p> : null}
      </div>

      <div>
        <label htmlFor={fieldName("numero")} className="field-label">
          Número{required ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={fieldName("numero")}
          name={fieldName("numero")}
          value={numero}
          onChange={(e) => {
            setNumero(e.target.value);
            emitirMudanca({ numero: e.target.value });
          }}
          required={required}
          className="field-input"
        />
        {errors?.numero ? <p className="field-error">{errors.numero}</p> : null}
      </div>

      <div>
        <label htmlFor={fieldName("complemento")} className="field-label">
          Complemento{required ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={fieldName("complemento")}
          name={fieldName("complemento")}
          value={complemento}
          onChange={(e) => {
            setComplemento(e.target.value);
            emitirMudanca({ complemento: e.target.value });
          }}
          required={required}
          className="field-input"
        />
        {errors?.complemento ? <p className="field-error">{errors.complemento}</p> : null}
      </div>

      <div>
        <label htmlFor={fieldName("bairro")} className="field-label">
          Bairro{required ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={fieldName("bairro")}
          name={fieldName("bairro")}
          value={bairro}
          onChange={(e) => {
            setBairro(e.target.value);
            emitirMudanca({ bairro: e.target.value });
          }}
          required={required}
          className="field-input"
        />
        {errors?.bairro ? <p className="field-error">{errors.bairro}</p> : null}
      </div>

      <div>
        <label htmlFor={fieldName("cidade")} className="field-label">
          Cidade{required ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={fieldName("cidade")}
          name={fieldName("cidade")}
          value={cidade}
          onChange={(e) => {
            setCidade(e.target.value);
            emitirMudanca({ cidade: e.target.value });
          }}
          required={required}
          className="field-input"
        />
        {errors?.cidade ? <p className="field-error">{errors.cidade}</p> : null}
      </div>

      <div>
        <label htmlFor={fieldName("uf")} className="field-label">
          UF{required ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={fieldName("uf")}
          name={fieldName("uf")}
          value={uf}
          onChange={(e) => {
            const valor = e.target.value.toUpperCase().slice(0, 2);
            setUf(valor);
            emitirMudanca({ uf: valor });
          }}
          maxLength={2}
          required={required}
          className="field-input"
        />
        {errors?.uf ? <p className="field-error">{errors.uf}</p> : null}
      </div>
    </div>
  );
}
