# Fundação de Cadastros + Controle de Elenco — Design

**Data:** 2026-07-08
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Aprovado

## Contexto

Mateus é Supervisor de Futebol Profissional no Juventus e centraliza hoje, em ferramentas soltas
(planilhas, Trello, PDFs avulsos), um conjunto grande de processos: controle de elenco, logística
de viagem (hotel/ônibus/refeição), convocação e presskit, operação de jogo (staff, checklist,
recibos), jogos fora, e prestação de contas com dashboard comparativo entre jogos.

O pedido original cobre seis frentes independentes que compartilham uma base de dados comum. Este
documento cobre **apenas a primeira frente**: a fundação de cadastros (atletas, comissão
técnica/diretoria, staff operacional, jogos/competições) e a tela de Controle de Elenco sobre ela.
As demais frentes (logística, convocação/presskit, operação de jogo, jogos fora, prestação de
contas/dashboard) serão desenhadas e implementadas em specs próprias, nesta ordem sugerida, todas
construídas sobre esta fundação.

## Objetivo

Ter um sistema web, acessível de computador e celular, onde Mateus consiga cadastrar, consultar,
editar e buscar os dados de atletas, comissão técnica/diretoria, staff operacional de jogo e os
jogos da competição — com padrão profissional de apresentação e sem risco de perda de dados
(especialmente dados pessoais sensíveis como CPF e RG).

## Fora de escopo (fica para módulos futuros)

- Geração de presskit e convocação (imagem/PDF).
- Cotação e geração de PDF de logística (hotel, ônibus, lista de passageiros, rooming list).
- Operação de jogo: checklist por jogo, seleção de staff operacional por jogo, geração de recibos.
- Particularidades de jogos fora (van, escolta, uniformização, vestiário).
- Prestação de contas, dashboard de gastos e gráficos comparativos entre jogos.
- Múltiplos usuários/permissões (a arquitetura já fica pronta para isso, mas a implementação de
  convites/permissões por perfil não entra agora).
- Múltiplas categorias/equipes (o sistema trata uma única equipe: Profissional).

## Arquitetura técnica

- **Front-end/back-end:** aplicação web em Next.js (React), com rotas de API no próprio Next.js.
- **Hospedagem:** Vercel, plano gratuito.
- **Banco de dados e storage de arquivos (fotos):** Supabase, plano gratuito (Postgres + Storage +
  Auth).
- **Autenticação:** Supabase Auth, login por e-mail/senha. Um único usuário (Mateus) nesta fase;
  o modelo de dados já inclui uma tabela de usuários para permitir adicionar mais pessoas depois
  sem redesenho.
- **Identidade visual:** cores do Juventus (grená/vinho, dourado, prata) e o brasão fornecido,
  aplicados de forma consistente em toda a interface.
- **Contas necessárias:** Mateus cria duas contas gratuitas (Vercel e Supabase) com seu e-mail; as
  chaves de acesso são usadas apenas para configurar o deploy e a conexão com o banco.

## Modelo de dados

Quatro cadastros independentes nesta fase — os módulos futuros vão referenciá-los por ID em vez de
duplicar dados.

### Atletas
nome completo, RG, CPF (validado e único), data de nascimento, posição, número da camisa, pé
dominante, telefone, cidade natal (cidade/UF), endereço atual, categoria/vínculo (data de início no
clube, empresário/representante), foto (upload, armazenada de forma privada).

### Comissão Técnica / Diretoria
nome completo, RG, CPF (validado e único), data de nascimento, função/cargo (campo com sugestões
pré-cadastradas — técnico, auxiliar técnico, preparador físico, preparador de goleiros,
fisioterapeuta, médico, analista de desempenho, mordomo, presidente, diretor, diretor adjunto,
assessor jurídico, coordenador, gerente geral, supervisor — mas aceita texto livre para outras),
telefone, e-mail, foto (opcional).

### Staff Operacional
nome completo, RG, CPF (validado e único), data de nascimento, função/setor (com sugestões —
segurança, controlador de acesso, gandula, maqueiro, orientador, bombeiro civil, limpeza — e texto
livre para outras), telefone, chave PIX, valor padrão de pagamento por função (editável
posteriormente por jogo, já pensando no módulo de Operação de Jogo).

### Jogos / Competições
competição, rodada/fase, adversário (nome + logo do adversário, upload), data, horário,
local/estádio, endereço, mandante ou visitante (jogo em casa ou fora).

## Telas e funcionalidades

- **Login** — tela simples de e-mail/senha.
- **Home** — painel inicial com atalhos para os quatro cadastros e placeholders visuais (com
  indicação de "em breve") para os módulos futuros, para o sistema já parecer uma central única
  desde o primeiro módulo.
- **Listagem de cada cadastro** (Atletas, Comissão Técnica/Diretoria, Staff Operacional, Jogos) —
  tabela com busca por nome e filtros relevantes (ex: função/setor, posição, mandante/visitante),
  responsiva para uso no celular.
- **Cadastro/edição** — formulário por entidade, com upload de foto onde aplicável, validação de
  campos obrigatórios e de CPF antes de salvar.
- **Exclusão** — com confirmação, para evitar perda acidental de dado.

## Validação e segurança de dados

- CPF validado por dígito verificador e checado contra duplicidade antes de salvar.
- RG único por pessoa dentro de cada cadastro.
- Senha de acesso protegida por hash seguro via Supabase Auth; nenhuma rota do sistema acessível
  sem login.
- Fotos e documentos armazenados em bucket privado do Supabase Storage, com acesso somente via
  usuário autenticado.
- Todos os cadastros passam por confirmação antes de exclusão definitiva.

## Testes / verificação

- Criar, editar e excluir um registro de cada entidade (Atleta, Comissão Técnica, Staff
  Operacional, Jogo), validando que os dados persistem corretamente.
- Testar upload e exibição de foto em cada entidade que suporta foto.
- Testar validação de CPF inválido e de CPF duplicado (deve bloquear o salvamento).
- Testar login com credenciais corretas e incorretas.
- Verificar responsividade das telas de listagem e formulário em tela de celular.

## Próximos módulos (ordem sugerida)

1. **Fundação de Cadastros + Controle de Elenco** (este documento).
2. **Convocação + Presskit** — geração de imagem/PDF profissional para divulgação.
3. **Logística de jogo** — cotações de hotel/ônibus/refeição e PDFs para fornecedores (lista de
   passageiros, rooming list).
4. **Operação de Jogo** — checklist por jogo, seleção de staff operacional, geração de recibos
   (individual e consolidado por setor); inclui as particularidades de jogos fora.
5. **Prestação de Contas + Dashboard** — lançamento de gastos por setor/jogo, com dashboard e
   gráficos comparativos entre jogos.

Cada um desses módulos terá sua própria spec e plano de implementação, construídos sobre os dados
cadastrados aqui.
