"use client";

import { useState } from "react";

interface EnderecoValues {
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
 */
export function EnderecoFields({
  defaultValues,
  errors,
}: {
  defaultValues?: EnderecoValues;
  errors?: EnderecoErrors;
}) {
  const [cep, setCep] = useState(defaultValues?.cep ?? "");
  const [logradouro, setLogradouro] = useState(defaultValues?.logradouro ?? "");
  const [numero, setNumero] = useState(defaultValues?.numero ?? "");
  const [complemento, setComplemento] = useState(defaultValues?.complemento ?? "");
  const [bairro, setBairro] = useState(defaultValues?.bairro ?? "");
  const [cidade, setCidade] = useState(defaultValues?.cidade ?? "");
  const [uf, setUf] = useState(defaultValues?.uf ?? "");
  const [buscando, setBuscando] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "nao-encontrado" | "erro">("idle");

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
      setLogradouro(dados.logradouro ?? "");
      setBairro(dados.bairro ?? "");
      setCidade(dados.localidade ?? "");
      setUf(dados.uf ?? "");
    } catch {
      setCepStatus("erro");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="cep" className="field-label">
          CEP
        </label>
        <input
          id="cep"
          name="cep"
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          onBlur={(e) => buscarCep(e.target.value)}
          placeholder="00000-000"
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
        <label htmlFor="logradouro" className="field-label">
          Rua / Logradouro
        </label>
        <input
          id="logradouro"
          name="logradouro"
          value={logradouro}
          onChange={(e) => setLogradouro(e.target.value)}
          className="field-input"
        />
        {errors?.logradouro ? <p className="field-error">{errors.logradouro}</p> : null}
      </div>

      <div>
        <label htmlFor="numero" className="field-label">
          Número
        </label>
        <input
          id="numero"
          name="numero"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className="field-input"
        />
        {errors?.numero ? <p className="field-error">{errors.numero}</p> : null}
      </div>

      <div>
        <label htmlFor="complemento" className="field-label">
          Complemento
        </label>
        <input
          id="complemento"
          name="complemento"
          value={complemento}
          onChange={(e) => setComplemento(e.target.value)}
          className="field-input"
        />
        {errors?.complemento ? <p className="field-error">{errors.complemento}</p> : null}
      </div>

      <div>
        <label htmlFor="bairro" className="field-label">
          Bairro
        </label>
        <input
          id="bairro"
          name="bairro"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          className="field-input"
        />
        {errors?.bairro ? <p className="field-error">{errors.bairro}</p> : null}
      </div>

      <div>
        <label htmlFor="cidade" className="field-label">
          Cidade
        </label>
        <input
          id="cidade"
          name="cidade"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          className="field-input"
        />
        {errors?.cidade ? <p className="field-error">{errors.cidade}</p> : null}
      </div>

      <div>
        <label htmlFor="uf" className="field-label">
          UF
        </label>
        <input
          id="uf"
          name="uf"
          value={uf}
          onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          className="field-input"
        />
        {errors?.uf ? <p className="field-error">{errors.uf}</p> : null}
      </div>
    </div>
  );
}
