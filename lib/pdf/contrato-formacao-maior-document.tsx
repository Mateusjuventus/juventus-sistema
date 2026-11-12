import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CORES } from "./logistica-shared";

/**
 * Contrato de Formação Desportiva e Outras Avenças — versão para atleta MAIOR DE IDADE, em PDF.
 * Ver docs/superpowers/specs/2026-11-11-contrato-formacao-fase2-design.md.
 *
 * Este é um modelo DIFERENTE do de menor (`contrato-formacao-document.tsx`), não uma variante
 * condicional do mesmo texto — confirmado com o Mateus ("é outro contrato") a partir de um
 * `.docx` próprio anexado (`Modelo_-_Contrato_de_Formação_-_Maior.docx`). Diferenças estruturais
 * principais: preâmbulo qualifica só o ATLETA (sem mãe/pai), inclui o e-mail do atleta na
 * qualificação (em vez de naturalidade), e o bloco de assinatura final é só "ATLETA" — sem "PAI DO
 * ATLETA"/"MÃE DO ATLETA".
 *
 * Todo o texto é transcrito literalmente do `.docx` original, com as mesmas duas restaurações de
 * formatação já feitas no contrato de menor (letras das Cláusulas 3.1 e 3.2, perdidas pela
 * numeração automática do Word — recuperadas pelas autorreferências do próprio texto: "alínea d)"
 * na 3.1.1, "letra n" na 3.2 "p)") e mais 5 correções confirmadas com o Mateus em 11/11/2026 (as 3
 * primeiras por decisão expressa dele; as 2 últimas são restaurações óbvias de formatação/
 * referência interna, do mesmo tipo das letras de lista, então não exigiram pergunta separada):
 *
 * 1. Cláusula 15 (Condições negociais): a lista pulava de "c)" pra "e)" sem "d)" — reletrada em
 *    sequência (a-f, com f.1/f.2 em vez de g.1/g.2).
 * 2. Parágrafo da Cláusula Décima Segunda (Anticorrupção) estava numerado "13.4" e citava "esta
 *    Cláusula 13" — corrigido pra "12.4"/"Cláusula 12" (é o parágrafo final da própria Cláusula
 *    12, não da 13, que é a cláusula seguinte, "Do Foro Eleito").
 * 3. Cláusula 8.2 tinha "multa no valor de R$ 500.00,00 (quinhentos mil reais)" — valor numérico
 *    corrigido pra R$ 500.000,00, compatível com o valor por extenso.
 * 4. Cláusula 6.1 citava "sub–cláusula 7.3" pra um cálculo que só existe na Cláusula 6 ("6.3" —
 *    a Cláusula 7, "Do Período de Recesso", não tem item 7.3 nenhum; o contrato de menor, no mesmo
 *    trecho, já diz corretamente "6.3") — corrigido pra "sub-cláusula 6.3".
 * 5. Cláusula 6.3.1 tinha "R$8.000 (cinco mil reais)" — número e extenso não combinavam; o Mateus
 *    confirmou R$ 8.000,00 (oito mil reais) como o valor certo.
 *
 * Mais duas correções pontuais, sem necessidade de pergunta (restauração de texto faltante, não
 * mudança de conteúdo): a qualificação do CLUBE estava sem "com sede nesta Capital de São Paulo,"
 * antes do endereço (texto idêntico ao do contrato de menor, só caiu aqui) — restaurado; e o
 * parágrafo de encerramento da Cláusula 13 dizia "...estando o ATLETA assistido ou representado
 * pelo seu responsável legal, abaixo qualificado." — sobra do texto do contrato de menor,
 * incompatível com este documento (que não tem representante legal nenhum qualificado nele) —
 * removida.
 *
 * A nota deixada no item f.2 (ex-g.2) ("-verificar se esses termos se aplicam ao atleta, se há
 * alguma alteração.") foi confirmada pelo Mateus como texto a manter, igual ao contrato de menor.
 *
 * Cabeçalho/rodapé usam imagens PRÓPRIAS deste modelo (extraídas do mesmo `.docx`, dimensões
 * diferentes das do contrato de menor) — ver `public/brand/contrato-formacao-maior-cabecalho.png`/
 * `contrato-formacao-maior-rodape.png`.
 */

export interface ContratoFormacaoMaiorCampos {
  nomeCompleto: string;
  dataNascimento: string;
  rg: string;
  cpf: string;
  email: string;
  endereco: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  bolsaValor: string;
  dataAssinaturaExtenso: string;
}

export type ContratoFormacaoMaiorLogoSrc = string | { data: Buffer; format: "png" | "jpg" } | null;

type Bloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "clausula"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "item"; texto: string }
  | { tipo: "centro"; texto: string; bold?: boolean }
  | { tipo: "linha" }
  | { tipo: "tabela2col"; esquerda: string; direita: string }
  | { tipo: "assinaturaAtleta" }
  | { tipo: "testemunhas" }
  | { tipo: "quebraPagina" };

// Transcrição literal do `.docx` original — ver comentário do arquivo, acima, sobre os campos de
// mesclagem `{{chave}}` e as correções/restaurações aplicadas.
const BLOCOS: Bloco[] = [
  { tipo: "titulo", texto: "Contrato de Formação Desportiva e Outras Avenças" },
  { tipo: "paragrafo", texto: "Entre:" },
  {
    tipo: "paragrafo",
    texto:
      "JUVENTUS SAF, entidade de prática desportiva, inscrita no CNPJ/MF sob o n. 63.634.319/0001-99, com sede nesta Capital de São Paulo, na Rua Javari, n. 101, Mooca, São Paulo – SP, CEP 03.112-100, neste ato representada na forma de seu Contrato Social, doravante denominado apenas “JUVENTUS” ou “CLUBE”; e",
  },
  {
    tipo: "paragrafo",
    texto:
      "{{nomeCompleto}}, em formação desportiva, nascido em {{dataNascimento}}, portador da cédula de identidade RG n. {{rg}} e inscrito no CPF sob o n. {{cpf}}, e-mail {{email}}, residente e domiciliado em {{endereco}}, doravante denominado simplesmente “ATLETA”.",
  },
  { tipo: "paragrafo", texto: "CONSIDERANDO QUE:" },
  {
    tipo: "item",
    texto:
      "a)    O CLUBE é entidade de prática desportiva filiada à Federação Paulista de Futebol (“FPF”) e à Confederação Brasileira de Futebol (“CBF”), tendo como foco principal o desenvolvimento e treinamento de atletas amadores e profissionais de futebol pertencentes às categorias de base e profissional;",
  },
  {
    tipo: "item",
    texto:
      "b)    O CLUBE dispõe de completa infraestrutura para treinamento e acompanhamento médico, psicológico e educacional de atletas profissionais e amadores de futebol, com foco na formação e desenvolvimento profissional de seus atletas, tornando-os aptos a integrarem o elenco de quaisquer clubes de expressão, seja do Brasil ou do exterior; e",
  },
  {
    tipo: "item",
    texto:
      "c)    O ATLETA demonstrou potencial esportivo, tendo sido selecionado pela equipe técnica do CLUBE para desenvolver programa de treinamento desportivo, além de se encontrar livre de qualquer vínculo desportivo ou outro qualquer com terceiras entidades de prática desportiva.",
  },
  {
    tipo: "paragrafo",
    texto:
      "RESOLVEM as Partes celebrar o presente Contrato de Formação Desportiva (“Contrato”), que se regerá pela Lei 9.615, de 24 de março de 1998, Art. 29, com as alterações da Lei 12.395, de 16 de março de 2011, e do Estatuto da Criança e do Adolescente, pela Lei n. 14.597/2023, Art. 99, e pela legislação civil em vigor, de acordo com as seguintes cláusulas e condições:",
  },

  { tipo: "clausula", texto: "Cláusula Primeira – Do Vínculo De Formação Desportiva" },
  {
    tipo: "paragrafo",
    texto:
      "1.1. Através deste Contrato de Formação Desportiva, as Partes ajustam a formação desportiva do ATLETA pelo CLUBE, sem que seja gerado vínculo empregatício entre as Partes, pelo período de {{vigenciaInicio}} até {{vigenciaFim}}.",
  },
  {
    tipo: "paragrafo",
    texto:
      "1.1.1. As Partes reconhecem que a formação desportiva do ATLETA ora ajustada se iniciou antes da celebração deste Contrato, na data indicada na Cláusula 1.1, aplicando-se todas as disposições deste Contrato ao referido período. O ATLETA reconhece, porém, que já foi auferiu a bolsa auxílio aprendizagem pelo período de formação desportiva anterior a este Contrato.",
  },
  {
    tipo: "paragrafo",
    texto:
      "1.2. As Partes reconhecem que é parte integrante e indissociável deste Contrato o Atestado, com assinatura de médico, declarando que o ATLETA se submeteu à avaliação pré-participação recomendada, encontrando-se apto a participar do programa de treinos, jogos e demais atividades previstas neste Contrato.",
  },
  {
    tipo: "paragrafo",
    texto:
      "1.3. A despeito do prazo estabelecido na Cláusula 1.1, supra, as Partes reconhecem que o CLUBE poderá, a seu exclusivo critério, rescindir este Contrato de Formação Desportiva a qualquer tempo, por qualquer motivo, inclusive por entender que o ATLETA não está obtendo o resultado desportivo esperado.",
  },

  { tipo: "clausula", texto: "Cláusula Segunda - Dos Objetivos Do Contrato" },
  {
    tipo: "paragrafo",
    texto:
      "2.1. São objetivos do presente contrato propiciar ao ATLETA seu desenvolvimento humano, técnico e desportivo, mediante as seguintes práticas:",
  },
  {
    tipo: "item",
    texto:
      "a)    ministração gratuita de ensinamentos para capacitação técnica-educacional específica para a modalidade desportiva do futebol, por formação coletiva ou individual;",
  },
  {
    tipo: "item",
    texto: "b)    transmissão de conhecimentos teóricos e práticos de educação física, condicionamento e motricidade;",
  },
  {
    tipo: "item",
    texto:
      "c)    transmissão de conhecimentos específicos de regras, legislação, fundamentos e comportamento do atleta de futebol;",
  },
  {
    tipo: "item",
    texto:
      "d)    fazê-lo adquirir conhecimentos sobre ética, cidadania, comportamento e demais informações necessárias à futura formação de atleta desportivo profissional de futebol;",
  },
  {
    tipo: "item",
    texto:
      "e)    fazê-lo aprender conhecimentos teóricos e práticos sobre competições desportivas, observados o tempo de duração e a idade dos competidores; e",
  },
  {
    tipo: "item",
    texto:
      "f)    ser preparado para firmar o primeiro Contrato Especial de Trabalho Desportivo, norteado pelo programa de formação técnico-profissional metódica, compatível com os desenvolvimentos físicos, morais e psicológicos do atleta nos termos da Lei n. 14.597/2023.",
  },

  { tipo: "clausula", texto: "Cláusula Terceira – Das Obrigações Do Clube" },
  { tipo: "paragrafo", texto: "3.1. São obrigações do CLUBE:" },
  {
    tipo: "item",
    texto:
      "a)    propiciar ao ATLETA programas de treinamento nas categorias de base e complementação educacional exigível e adequada, enquadrando o ATLETA na equipe do escalão correspondente a sua idade ou idade superior, em razão de seu desempenho técnico e desde que haja parecer favorável de médico;",
  },
  {
    tipo: "item",
    texto:
      "b)    assegurar ao ATLETA, por meio de incentivos materiais e bolsa de aprendizagem, alojamento e instalações desportivas apropriados à sua capacitação técnica na modalidade desportiva do futebol, sobretudo em matéria de alimentação, higiene, segurança e salubridade;",
  },
  {
    tipo: "item",
    texto:
      "c)    ministrar e assegurar ao ATLETA, por meio de um corpo de profissionais habilitados e especializados em formação técnico-desportiva, conhecimentos teóricos e práticos de educação física, condicionamento e motricidade norteado por programa de formação técnico desportiva metódica, compatível com o desenvolvimento físico, moral e psicológico do atleta;",
  },
  {
    tipo: "item",
    texto:
      "d)    propiciar a matrícula escolar, assegurando ao ATLETA a presença às aulas do curso básico ou de formação técnica em que estiver matriculado, ajustando o tempo destinado à efetiva atividade de formação do atleta, não superior a quatro (4) horas diárias, aos horários do currículo escolar de cursos livres ou profissionalizantes, exigindo do ATLETA frequência e satisfatório aproveitamento escolar;",
  },
  {
    tipo: "item",
    texto:
      "e)    garantir ao ATLETA, por meio de incentivos materiais e bolsa de aprendizagem, assistência educacional, psicológica, médica e odontológica;",
  },
  {
    tipo: "item",
    texto:
      "f)    garantir ao ATLETA, ainda por meio de incentivos materiais e bolsa de aprendizagem, transporte, alimentação com acompanhamento de nutricionista, assistência de fisioterapeuta e demais profissionais qualificados na formação física e motora, além da convivência familiar adequada;",
  },
  {
    tipo: "item",
    texto:
      "g)    ministrar, gratuitamente e às suas expensas, a formação desportiva do ATLETA, garantindo o pagamento da bolsa de aprendizagem até o décimo dia útil do mês subsequente ao vencido;",
  },
  {
    tipo: "item",
    texto:
      "h)    contratar apólice de seguro de acidentes pessoais para cobrir as atividades de formação desportiva do ATLETA durante toda a vigência do presente instrumento contratual, incluindo como beneficiários da apólice a(s) pessoa(s) definida(s) pelo ATLETA dentre seus dependentes, ascendentes ou familiares;",
  },
  {
    tipo: "item",
    texto:
      "i)    registrar o ATLETA na entidade de administração do desporto competente, e também inscrevê-lo nas competições oficiais da respectiva faixa etária, promovidas pela referida entidade, ou de faixa etária superior, havendo permissão no regulamento da competição;",
  },
  { tipo: "item", texto: "j)    cumprir e respeitar todas as cláusulas deste contrato." },
  {
    tipo: "paragrafo",
    texto:
      "3.1.1. Inobstante o quanto ajustado na Cláusula 3.1, alínea d), caso o ATLETA opte por não realizar curso de formação técnica ou por se matricular diretamente em rede privada de ensino, esse será integralmente responsável pela escolha da instituição, assim como por todas as despesas relativas à sua atividade escolar.",
  },
  { tipo: "paragrafo", texto: "3.2. São obrigações do ATLETA:" },
  {
    tipo: "item",
    texto:
      "a)    assinar todos os documentos necessários para a formalização do vínculo não profissional entre o ATLETA e CLUBE perante a CBF e FPF, inclusive eventuais renovações;",
  },
  {
    tipo: "item",
    texto: "b)    cumprir regularmente o programa de treinamento e o horário de capacitação determinados pelo CLUBE;",
  },
  {
    tipo: "item",
    texto:
      "c)    assistir às aulas teóricas e práticas de educação física, condicionamento, motricidade, fundamentos e outras programadas pelo CLUBE, bem como delas participar com satisfatório aproveitamento;",
  },
  {
    tipo: "item",
    texto:
      "d)    apresentar-se nas competições desportivas preparatórias e oficiais, nas condições horários e locais estabelecidos pelo CLUBE;",
  },
  {
    tipo: "item",
    texto: "e)    permanecer, sempre que necessário, em regime de concentração, observando o limite máximo semanal permitido em lei;",
  },
  {
    tipo: "item",
    texto: "f)    assistir as aulas do curso escolar em que estiver matriculado e apresentar frequência e aproveitamento satisfatórios;",
  },
  {
    tipo: "item",
    texto:
      "g)    manter conduta moral e disciplinada durante e após as partidas, obedecendo aos dirigentes, médicos, técnicos e auxiliares especializados do CLUBE, acatando as decisões dos árbitros, as regras do jogo, os regulamentos e disposições em vigor e respeitando o público, os torcedores em geral, os companheiros e jogadores adversários;",
  },
  {
    tipo: "item",
    texto:
      "h)    manter uma boa conduta tanto em sua vida pública como privada, e se esforçar ao máximo para não prejudicar o prestígio e a imagem do CLUBE, comprometendo-se, especialmente, a não cometer atos que ofendam uma pessoa ou uma coletividade de pessoas, tais como injúria racial, racismo, homofobia, xenofobia, sexismo ou qualquer outra ofensa relacionada ao aspecto sexual, racial, religioso, ideologia de gênero, condição social, dentre outras, além de envolvimento em casos de violência doméstica ou maus tratos a animais;",
  },
  {
    tipo: "item",
    texto:
      "i)    não divulgar pela imprensa ou qualquer outro meio de comunicação informações confidenciais ou críticas ao CLUBE, seus dirigentes associados, funcionários ou torcedores e seus parceiros comerciais; bem como envidar os maiores esforços para que seus familiares e amigos também se abstenham de fazê-lo;",
  },
  {
    tipo: "item",
    texto: "j)    não participar durante todo o prazo deste contrato, de qualquer atividade desportiva, salvo prévia e expressa autorização do CLUBE;",
  },
  {
    tipo: "item",
    texto:
      "k)    não se ausentar da cidade de São Paulo ou do Brasil sem expressa autorização do CLUBE e, caso seja obrigado a fazê-lo, comunicar antecipadamente, por escrito e com justificação;",
  },
  {
    tipo: "item",
    texto:
      "l)    não ingerir medicamentos quaisquer sem conhecimento prévio do Departamento Médico do CLUBE, não realizar consultas, avaliações, procedimentos ou tratamentos médicos, terapêuticos, cirúrgicos, nutricionais, fisioterapêuticos ou qualquer outra especialidade médica ou medicina alternativa sem autorização do CLUBE, não consumir alimentos e/ou substâncias que sejam proibidas e/ou detectadas em exame antidoping e se submeter, sempre que necessário, aos exames e testes antidoping;",
  },
  {
    tipo: "item",
    texto:
      "m)    acatar zelosamente com todos os protocolos médicos e sanitários determinados pelo CLUBE, pelas entidades de administração de administração do futebol ou pelo Poder Público e informar o CLUBE imediatamente em caso de lesões e/ou enfermidades;",
  },
  {
    tipo: "item",
    texto:
      "n)    celebrar com o CLUBE o primeiro Contrato Especial de Trabalho Desportivo nos termos do Art. 99, da Lei n. 14.597/2023 (conforme condições negociais estipuladas pelo ATLETA, descritas no Instrumento de Cláusulas Adicionais anexo ao presente contrato), sujeitando-se, em caso de oposição, ou se o ATLETA vincular-se, sob qualquer forma, a outra entidade de prática desportiva, sem autorização expressa do CLUBE, ao pagamento do valor indenizatório correspondente a 200 (duzentas) vezes os gastos efetiva e comprovadamente efetuados pelo CLUBE na formação do ATLETA;",
  },
  {
    tipo: "item",
    texto:
      "o)    em caso de resilição imotivada desde Contrato, informar eventual nova entidade de prática desportiva a que se vincule do presente instrumento e das penalidades nele previstas, nos termos da Lei n. 14.597/2023;",
  },
  {
    tipo: "item",
    texto:
      "p)    pagar o valor indenizatório referido na letra “n” e devido ao CLUBE que será, obrigatoriamente, de responsabilidade da nova entidade de prática desportiva interessada no vínculo do ATLETA; enquanto não for concretizado esse pagamento, é vedado novo registro do ATLETA em entidade de administração do desporto, nos expressos termos do Art. 99, § 5º, inciso III da Lei n. 14.597/2023;",
  },
  {
    tipo: "item",
    texto:
      "q)    zelar por todas as instalações e materiais de trabalho do CLUBE, devendo devolver ao CLUBE, em até 5 (cinco) dias do término deste Contrato todo e qualquer material ou propriedade da agremiação;",
  },
  { tipo: "item", texto: "r)    não autorizar ou facilitar o acesso de terceiros em quaisquer dependências do CLUBE;" },
  {
    tipo: "item",
    texto:
      "s)    abster-se de realizar ou se envolver, de qualquer forma, com apostas esportivas com o objetivo de lucro, seja para si ou para terceiros;",
  },
  {
    tipo: "item",
    texto:
      "t)    prestar total colaboração com o clube e com seus defensores em caso de processo perante a Justiça Desportiva contra o ATLETA e/ou contra o CLUBE, seus funcionários, seus dirigentes e/ou seus atletas;",
  },
  {
    tipo: "item",
    texto:
      "u)    não celebrar nenhum tipo de acordo que, de qualquer forma, interfira no cumprimento deste Contrato, devendo comunicar ao CLUBE em até 24 (vinte e quatro horas), o recebimento, por si ou por seu agente, de qualquer proposta oriunda de outra entidade de prática desportiva;",
  },
  {
    tipo: "item",
    texto:
      "v)    cumprir incondicionalmente e integralmente as cláusulas deste Contrato, bem como com as regras disciplinares determinadas pelo CLUBE e/ou pelas entidades de administração do desporto; e",
  },
  {
    tipo: "item",
    texto:
      "w)    Respeitar integralmente os regulamentos dos campeonatos que disputar, o Código Brasileiro de Justiça Desportiva (CBJD), o Código de Ética do Futebol Brasileiro e demais regras desportivas aplicáveis aos atletas profissionais, comprometendo-se a prestar total colaboração com o CLUBE e com seus defensores em caso de processo perante a Justiça Desportiva contra o ATLETA e/ou contra o CLUBE, seus funcionários, seus dirigentes e/ou seus atletas.",
  },
  {
    tipo: "paragrafo",
    texto:
      "3.3. O ATLETA concorda que, em situações extraordinárias e justificadas, poderá participar de partidas de futebol em intervalo inferior ao mínimo previsto nos regulamentos esportivos aplicáveis.",
  },
  {
    tipo: "paragrafo",
    texto:
      "3.4. O ATLETA concorda que os documentos abaixo serão de apresentação, sob pena de desligamento temporário ou definitivo, todos devidamente rubricados e assinados por ele:",
  },
  { tipo: "item", texto: "a)    Comprovante de matrícula do ensino regular, se ainda não finalizado, a cada ano, até 30 de janeiro; e" },
  { tipo: "item", texto: "b)    Comprovante de frequência e desempenho escolares, relativo ao ano anterior, até 30 de janeiro." },
  {
    tipo: "paragrafo",
    texto:
      "3.5. Tendo em vista os ressarcimentos e incentivos materiais pagos ao ATLETA, o ATLETA assume o compromisso da própria formação educacional regular (ensino fundamental, médio, profissionalizante ou superior), com frequência e rendimento satisfatórios, nos termos da Constituição Federal, desobrigando o CLUBE de qualquer outra responsabilidade ou providência, além do pontual pagamento dos custos estabelecidos na Cláusula Quarta, infra, e da disponibilidade de carga horária compatível para os estudos.",
  },

  { tipo: "clausula", texto: "Cláusula Quarta – Da Bolsa Aprendizagem" },
  {
    tipo: "paragrafo",
    texto: "4.1. O CLUBE pagará ao ATLETA, mensalmente, como auxílio financeiro, a título de bolsa de aprendizagem, o valor de {{bolsaValor}}.",
  },
  {
    tipo: "paragrafo",
    texto:
      "4.1.1. O ATLETA reconhece que parte do valor estabelecido acima será destinado a auxílio-viagem, para a realização de viagem de visita aos familiares em sua cidade de origem ao final da temporada.",
  },
  {
    tipo: "paragrafo",
    texto:
      "4.2. Fica acordado que o valor da bolsa aprendizagem poderá ser reajustado conforme a categoria do ATLETA, ou ainda, por decisão unilateral do CLUBE de acordo com o desempenho desportivo do ATLETA. Os eventuais reajustes serão levados em consideração para o cálculo do custo mensal de formação do ATLETA pelo CLUBE.",
  },
  {
    tipo: "paragrafo",
    texto:
      "4.3. O ATLETA reconhece que o CLUBE poderá incluí-lo projetos propostos com base nas leis federal e estadual de incentivo ao esporte, bem como poderá obter junto ao mercado patrocínios diversos destinados à manutenção das atividades e custeio das despesas com a formação desportiva do ATLETA.",
  },

  { tipo: "clausula", texto: "Cláusula Quinta – Da Assinatura Do Primeiro Contrato Especial De Trabalho Desportivo" },
  {
    tipo: "paragrafo",
    texto:
      "5.1. A exclusivo critério e avaliação do CLUBE, o ATLETA se compromete a celebrar o primeiro Contrato Especial de Trabalho Desportivo até o término do presente contrato. Frustrada a formalização do primeiro ajuste laboral profissional com o ATLETA, terá do valor indenizatório correspondente a 200 (duzentas) vezes os gastos efetiva e comprovadamente efetuados pelo CLUBE na formação do ATLETA; esse pagamento de indenização é de responsabilidade da nova entidade de prática desportiva interessada no vínculo profissional do ATLETA; a ausência de tal pagamento impedirá novo registro do ATLETA em entidade de administração do desporto, nos expressos direito o CLUBE ao recebimento termos do Art. 99, § 5º, inciso III da Lei n. 14.597/2023.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.1.1. Caso o ATLETA efetivamente participe de, no mínimo, 1.500 (mil e quinhentos) minutos em jogos oficiais disputados pelo CLUBE na Edição de 2026 do Campeonato Paulista Sub-20 de Futebol Masculino, o CLUBE também se comprometerá a celebrar o Contrato Especial de Trabalho Desportivo indicado na Cláusula 5.1, supra.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.1.2. As Partes concordam que a contabilização da minutagem prevista na Cláusula 5.1., supra, considerará exclusivamente o tempo efetivamente disputado em campo pelo ATLETA em partidas oficiais da competição.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.1.3. Uma vez atingida a minutagem indicada na Cláusula 5.1.1, supra, o CLUBE terá o prazo de até 30 (trinta) dias para formalizar a apresentação e assinatura do Contrato Especial de Trabalho Desportivo com o ATLETA, respeitando os termos da legislação desportiva vigente.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.2. Estabelecem as Partes, ainda, que havendo a celebração do primeiro Contrato Especial de Trabalho Desportivo com o CLUBE, os chamados “direitos econômicos” sobre a cláusula indenizatória desportiva aplicável às transferências envolvendo o ATLETA serão detidos, em sua integralidade, pelo CLUBE, para que terceiros não possam intervir ou influenciar em transferência do ATLETA, ou interferir no seu desempenho esportivo.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.3. As Partes também reconhecem o direito de preferência do CLUBE à primeira renovação do Contrato Especial de Trabalho Desportivo, sob pena de indenização no importe da indenização prevista no Art. 99, §11º, da Lei n. 14.597/2023.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.4. As Partes reconhecem que assim que o ATLETA celebrar o primeiro Contrato Especial de Trabalho Desportivo com o CLUBE este instrumento será extinto e a relação das Partes será regido pelo novo instrumento.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.5. O CLUBE, na qualidade de formador do ATLETA, poderá exercer o direito de firmar o primeiro Contrato Especial de Trabalho Desportivo com o ATLETA durante toda a vigência contratual e até 90 (noventa) dias após o fim da vigência deste instrumento, comprometendo-se a indenizar o período entre o término do prazo e a assinatura do Contrato Especial de Trabalho em caso de exercício do direito nesse ínterim.",
  },
  {
    tipo: "paragrafo",
    texto:
      "5.6. Caso o CLUBE não oferte um Contrato Especial de Trabalho ao ATLETA em até 90 (noventa) dias após o término da vigência deste Contrato de Formação, o ATLETA estará automaticamente livre para firmar contrato com qualquer entidade de prática desportiva. Caso a equipe seja estrangeira, o CLUBE resguarda desde já o direito de cobrar desta o Training Compensation correspondente nos termos do artigo 20 do FIFA Regulations on the Status and Transfer of Players (“FIFA RSTP”).",
  },

  { tipo: "clausula", texto: "Cláusula Sexta – Da Indenização" },
  {
    tipo: "paragrafo",
    texto:
      "6.1. Por força dos princípios “pacta sunt servanda” e da “boa fé dos contratos”, que regem expressamente esta contratação, o valor indenizatório devido, caso o CLUBE fique impossibilitado de assinar o primeiro Contrato Especial de Trabalho Desportivo, por oposição do ATLETA, ou quando o ATLETA vincular-se, sob qualquer forma, a outra entidade de prática desportiva, sem autorização expressa do CLUBE, será de 200 (duzentas) vezes os gastos efetuados com a formação do ATLETA, conforme especificado na sub–cláusula 6.3.",
  },
  {
    tipo: "paragrafo",
    texto:
      "6.2. A indenização referida na sub-cláusula 6.1 está assegurada no § 5º, inciso III do Art. 99 da Lei 14.597/2023, devendo ser quitada no prazo de 15 (quinze) dias seguintes à formalização da recusa, pelo ATLETA, da assinatura do primeiro Contrato Especial de Trabalho Desportivo, sob pena de não ser permitido o novo registro do ATLETA em entidade de administração do desporto.",
  },
  {
    tipo: "paragrafo",
    texto:
      "6.3. Fica ajustado, entre as Partes que, para fins do cálculo da indenização com a formação desportiva do ATLETA, serão considerados como custos, despesas e gastos efetuados e vinculados ao processo de formação do ATLETA desde o início do vínculo com o CLUBE, apurados através dos registros contábeis do CLUBE, os seguintes itens:",
  },
  {
    tipo: "item",
    texto: "(i) valor da bolsa de aprendizagem paga ao atleta, de acordo com os valores especificados na Cláusula Quarta do presente Contrato;",
  },
  {
    tipo: "item",
    texto:
      "(ii) custos, despesas e gastos individuais com assistência médica, psicológica e psiquiátrica; assistência odontológica; educação e despesas escolares; fisioterapia, passagens e transportes; alimentação; acomodação; assessoria de imprensa e outros;",
  },
  {
    tipo: "item",
    texto:
      "(iii) média aritmética dos custos, despesas e gastos coletivos da categoria a que pertença o ATLETA, em itens como comissão técnica, transporte, material esportivo, e outros que são próprios e restritos à respectiva categoria;",
  },
  {
    tipo: "item",
    texto:
      "(iv) média aritmética dos custos, despesas e gastos coletivos incorridos com as diversas categorias formadoras de atletas do CLUBE, as quais incluem:",
  },
  { tipo: "item", texto: "(a) alimentação;" },
  { tipo: "item", texto: "(b) comissão técnica;" },
  { tipo: "item", texto: "(c) departamento médico;" },
  { tipo: "item", texto: "(d) transporte;" },
  { tipo: "item", texto: "(e) segurança;" },
  { tipo: "item", texto: "(f) equipe de cozinha;" },
  { tipo: "item", texto: "(g) serviços gerais de manutenção do alojamento e instalações esportivas;" },
  { tipo: "item", texto: "(h) pessoal e despesas administrativas;" },
  { tipo: "item", texto: "(i) seguros;" },
  { tipo: "item", texto: "(j) outros custos, despesas e gastos, desde que comprovados e vinculados ao processo de formação do ATLETA." },
  {
    tipo: "item",
    texto: "(v) ainda, por complemento, os gastos e despesas constantes das planilhas de projetos executados com base nas leis de incentivo fiscal ao esporte.",
  },
  {
    tipo: "paragrafo",
    texto:
      "6.3.1. Em atendimento ao quanto disposto no Art. 30, parágrafo único, do Regulamento Nacional de Registro e Transferência de Atletas de Futebol (“RNRTAF”), os gastos mencionados nos itens (III) e (IV), supra, são estimados no valor médio mensal de R$8.000,00 (oito mil reais) a partir do cálculo por amostragem dos gastos da categoria a qual o ATLETA pertence.",
  },

  { tipo: "clausula", texto: "Cláusula Sétima – Do Período De Recesso" },
  {
    tipo: "paragrafo",
    texto:
      "7.1. Fica ajustado entre as Partes que, preferencialmente ao final do exercício escolar ou, ao final da temporada, o CLUBE concederá ao ATLETA um período de descanso de 30 (trinta) dias consecutivos e ininterruptos com a garantia de recebimento dos incentivos previstos neste instrumento.",
  },
  {
    tipo: "paragrafo",
    texto: "7.2. Durante o período de recesso, o ATLETA ficará impedido de participar de atividades desportivas oficiais, ou não, sem a prévia e expressa autorização do CLUBE.",
  },

  { tipo: "clausula", texto: "Cláusula Oitava – Da Rescisão" },
  {
    tipo: "paragrafo",
    texto:
      "8.1. Este instrumento poderá ser rescindido antes da celebração do Contrato Especial de Trabalho Desportivo mencionado na Cláusula Sexta, se houver mútuo acordo entre as Partes. Caso o ATLETA queira rescindi-lo sem justo motivo, o clube ao qual o ATLETA vier a se vincular arcará com o pagamento à outra parte, de indenização correspondente a 200 (duzentas) vezes os gastos comprovadamente efetuados pelo CLUBE com a formação do ATLETA, nos termos do inciso II, do § 5º, do Art. 99 da Lei n. 14.597/2023.",
  },
  {
    tipo: "paragrafo",
    texto:
      "8.2. Em razão dos custos e despesas do CLUBE com o ATLETA, bem como com o planejamento para sua formação esportiva, caso o ATLETA opte por rescindir este Contrato antes de 1 (um) ano do seu registro pelo CLUBE, será devida multa no valor de R$ 500.000,00 (quinhentos mil reais).",
  },
  {
    tipo: "paragrafo",
    texto:
      "8.2.1. As Partes reconhecem que a cláusula penal ajustada na Cláusula 8.2, supra possui finalidade híbrida, visando a garantir o cumprimento integral deste Contrato, estimar os prejuízos suportados pelo CLUBE e penalizar a parte infratora. Nesse sentido, as Partes reconhecem o investimento realizado pelo CLUBE em razão da expectativa de cumprimento integral deste Contrato, bem como que sua rescisão antecipada traz prejuízos financeiros e reputacionais à agremiação, inclusive perante parceiros comerciais e concorrentes.",
  },
  {
    tipo: "paragrafo",
    texto:
      "8.3. Fica convencionado que o ATLETA estará livre de qualquer ônus, podendo requerer sua transferência para qualquer entidade, associação de prática desportiva ou ainda firmar contrato de profissional com outra entidade de prática desportiva, quando a rescisão unilateral deste contrato for motivada exclusivamente pelo CLUBE, sendo nesta hipótese inexigível o pagamento de qualquer indenização ou multa decorrente da rescisão, por qualquer das Partes ou pelo novo clube do ATLETA, seja qual for o período de vigência já transcorrido entre a data de assinatura e a data de rescisão.",
  },

  { tipo: "clausula", texto: "Cláusula Nona – Do Alojamento" },
  { tipo: "paragrafo", texto: "9.1. O CLUBE proverá alojamento para o ATLETA em suas dependências." },
  {
    tipo: "paragrafo",
    texto:
      "9.2. As Partes ajustam que o ATLETA poderá, por sua exclusiva opção, conta e risco, alojar-se em local diverso do oferecido pelo CLUBE, remanescendo, nesta hipótese, todas as demais obrigações estabelecidas e pactuadas livremente neste instrumento.",
  },

  { tipo: "clausula", texto: "Cláusula Décima – Da Cessão De Imagem" },
  {
    tipo: "paragrafo",
    texto:
      "10.1. Durante a vigência deste contrato, o ATLETA autoriza o CLUBE a explorar e/ou sublicenciar a sua imagem, semelhança, nome, som da voz e/ou apelido desportivo (“Direitos de Imagem”), para fins comerciais, promocionais, institucionais ou de fomento ao esporte, seja quando individualmente considerado, seja quando de forma coletiva, mas sempre de maneira vinculada ao CLUBE ou a marca ou símbolo distintivo do CLUBE (incluindo, não exaustivamente, uniformes, marcas registradas, escudos, nomes e mascotes). Dessa forma, o CLUBE, por si ou por terceiros por ele expressamente autorizados, especialmente seus patrocinadores e parceiros comerciais, poderá dispor e explorar os Direitos de Imagem para, dentre outras modalidades de exploração: (i) divulgação da imagem do ATLETA no sítio eletrônico do CLUBE e nos demais canais oficiais de comunicação, tais como redes sociais, revistas e vídeos institucionais; (ii) realização de campanhas de divulgação do CLUBE e de suas equipes e (iii) confecção de produtos desenvolvidos por iniciativa do CLUBE, seus patrocinadores e/ou parceiros comerciais. A respectiva contrapartida está incluída nos montantes previstos no item 4.1, nada mais tendo o ATLETA a reclamar sobre o tema contra o CLUBE. Além disso, o ATLETA declara que eventual uso e exploração dos Direitos de Imagem pelo CLUBE antes da assinatura deste Contrato por todas as Partes em ocorreu de forma legal e autorizada, sem que lhe seja devida qualquer remuneração.",
  },

  { tipo: "clausula", texto: "Cláusula Décima Primeira – Da Confidencialidade E Da Proteção De Dados" },
  {
    tipo: "paragrafo",
    texto:
      "11.1. As Partes concordam em manter o sigilo e a confidencialidade em relação às informações fornecidas em decorrência deste Contrato, assim como qualquer material de natureza sigilosa, não revelando tal informação a terceiros não autorizados, decorrentes ou oriundos do Contrato que ora se estabelece (doravante “Informações Confidenciais”), por até 10 (dez) anos até o término da vigência deste Contrato.",
  },
  {
    tipo: "paragrafo",
    texto:
      "11.1.1. As Partes reconhecem que eventuais violações às obrigações ajustadas no item 12.1, supra, seja por ação ou por omissão, poderão ensejar, além das sanções estabelecidas neste Contrato, responsabilidade civil e criminal.",
  },
  {
    tipo: "paragrafo",
    texto:
      "11.2. As Partes estão isentas da obrigação de sigilo somente com relação a qualquer informação que: (a) esteja sob domínio público no momento da assinatura do presente Contrato, ou passem a ser de domínio público após a presente data, de outro modo que não por violação de qualquer das obrigações deste Contrato ou de outra obrigação contratual ou legal de qualquer das Partes; (b) seja exigida pela regulamentação em vigor por ato administrativo, determinação judicial ou arbitral; (c) seja obtida em virtude da execução dos trabalhos decorrentes deste Contrato e que deva ser revelada por qualquer uma das Partes em razão de determinação judicial, legal ou normativa; e/ou (d) venha a se tornar disponível a qualquer das Partes de forma não confidencial por terceiros (não relacionados às Partes e/ou às obrigações aqui previstas) autorizados a fornecê-la.",
  },
  {
    tipo: "paragrafo",
    texto:
      "11.3. As Partes declaram que estão cientes, comprometidas e em plena concordância com os requisitos legais vigentes em relação à segurança, privacidade e tratamento das informações e de dados, em conformidade com a Lei Geral de Proteção de Dados, Lei n. 13.709/2018 (“LGPD”).",
  },
  {
    tipo: "paragrafo",
    texto: "11.3.1. Quaisquer Dados Pessoais compartilhados entre as Partes, deverão ser tratados e utilizados em consonância com os parâmetros previstos na LGPD.",
  },
  {
    tipo: "paragrafo",
    texto:
      "11.3.2. As Partes se reservam ao direito de manter armazenado os dados compartilhados em sua base de dados/sistema, durante o período necessário e conforme as finalidades para os quais foram coletados. Esses dados serão tratados durante toda a vigência deste Contrato e pelo tempo obrigatório para serem cumpridas todas as obrigações legais, contratuais ou regulatórias.",
  },
  {
    tipo: "paragrafo",
    texto:
      "11.4. As Partes declaram que nenhuma disposição deste Instrumento concorre para a cessão, transmissão ou transferência entre as Partes de quaisquer direitos, titularidades ou participação sobre a sua propriedade intelectual, observando-se o quanto disposto no item 8, supra.",
  },

  { tipo: "clausula", texto: "Cláusula Décima Segunda – Das Práticas Anticorrupção" },
  {
    tipo: "paragrafo",
    texto: "12.1. O ATLETA se compromete, expressamente, a cumprir com todas as regras disciplinares estipuladas por lei, pelas entidades de administração do desporto e pelo CLUBE.",
  },
  {
    tipo: "paragrafo",
    texto:
      "12.2. O ATLETA reconhece que não poderá oferecer, dar ou aceitar, a quem quer que seja, tanto de forma autônoma ou mediante terceiros, qualquer pagamento, doação, compensação, vantagem (financeira ou não financeira) de qualquer espécie que constituam prática ilegal ou de corrupção sob as leis de qualquer país, bem como envidar os maiores esforços para que seus familiares e amigos também se abstenham de fazê-lo.",
  },
  {
    tipo: "paragrafo",
    texto:
      "12.3. O ATLETA se compromete a se abster de realizar ou se envolver, de qualquer forma, com apostas esportivas com o objetivo de lucro, seja para si ou para terceiros, o que inclui, mas não se limita a realizar apostas, adequar sua conduta a apostas já realizadas por si ou por terceiros ou fornecer a terceiros quaisquer informações com o intuito de lhes possibilitar vantagens indevidas em apostas esportivas.",
  },
  {
    tipo: "paragrafo",
    texto:
      "12.4. As Partes reconhecem que eventuais violações às obrigações ajustadas nesta Cláusula 12, seja por ação ou por omissão, poderão ensejar, além das sanções estabelecidas neste Contrato, responsabilidade civil e criminal.",
  },

  { tipo: "clausula", texto: "Cláusula Décima Terceira – Do Foro Eleito" },
  {
    tipo: "paragrafo",
    texto:
      "13.1. Em caso de litígio, as Partes contratantes comprometem-se a submeter-se a arbitragem, fazendo uso da Câmara Nacional de Resolução de Disputas da Confederação Brasileira de Futebol.",
  },
  {
    tipo: "paragrafo",
    texto:
      "E por estarem assim justas e acordadas, as Partes firmam o presente Contrato de Formação Desportiva com Dotação de Bolsa de Aprendizagem, em (03) três vias de igual teor e forma, na presença de (02) duas testemunhas.",
  },
  { tipo: "centro", texto: "São Paulo, {{dataAssinaturaExtenso}}." },
  { tipo: "centro", texto: "JUVENTUS SAF", bold: true },
  {
    tipo: "tabela2col",
    esquerda: "JUVENTUS SAF\nLucas Soler Petarello de Oliveira\nPresidente do Conselho de Administração",
    direita: "JUVENTUS SAF\nJoão da Costa Minsoni\nMembro do Conselho Fiscal",
  },
  { tipo: "linha" },
  { tipo: "centro", texto: "ATLETA", bold: true },
  { tipo: "assinaturaAtleta" },
  { tipo: "testemunhas" },

  { tipo: "quebraPagina" },

  { tipo: "titulo", texto: "CLÁUSULAS ADICIONAIS" },
  {
    tipo: "paragrafo",
    texto: "As PARTES já qualificadas no CONTRATO DE FORMAÇÃO DESPORTIVA firmado nesta data decidem ajustar cláusulas adicionais nos seguintes termos.",
  },
  { tipo: "clausula", texto: "CLÁUSULA DÉCIMA QUINTA - Condições negociais do futuro Contrato Especial de Trabalho Desportivo" },
  {
    tipo: "paragrafo",
    texto:
      "15.1. Ficam desde logo fixadas as condições mínimas do primeiro Contrato Especial de Trabalho Desportivo a ser celebrado entre ATLETA e CLUBE caso este venha a exercer o direito previsto no artigo 99, caput, da Lei 14.597/2023:",
  },
  { tipo: "item", texto: "a)    Prazo: um ano" },
  { tipo: "item", texto: "b)    Salário inicial: salário mínimo vigente à época da celebração do contrato;" },
  {
    tipo: "item",
    texto: "c)    Cláusula Indenizatória Desportiva Nacional: valor equivalente a 2.000 vezes o valor médio do salário contratual então vigente do ATLETA ou o máximo permitido por lei;",
  },
  { tipo: "item", texto: "d)    Cláusula Indenizatória Desportiva Internacional: EUR 1.000.000,00 (um milhão de euros)" },
  {
    tipo: "item",
    texto: "e)    Cláusula Compensatória Desportiva: valor total de salários mensais a que teria direito o ATLETA desde a data da rescisão contratual até a data de término do contrato.",
  },
  {
    tipo: "item",
    texto:
      "f)    Compartilhamento de Direitos Econômicos: as partes compartilharão os direitos econômicos do ATLETA, na proporção de 90% (noventa por cento) ao CLUBE e 10% (dez por cento) ao ATLETA, na seguinte proporção:",
  },
  {
    tipo: "item",
    texto:
      "f.1) o pagamento de eventual valor devido ao ATLETA pelo CLUBE a título de Direitos Econômicos dar-se-á pelo valor líquido apurado em cada caso, compreendido este como o valor efetivamente auferido pelo CLUBE, deduzidos os impostos incidentes sobre a operação, eventual cobrança de mecanismo de solidariedade e/ou qualquer outro tipo de compensação prevista nos regulamentos da FIFA e/ou da Lei Pelé, bem como comissões eventualmente pagas a intermediários do negócio, desde que limitadas a 10% (dez por cento) do valor do negócio; e",
  },
  {
    tipo: "item",
    texto:
      "f.2) o ATLETA reconhece que não poderá ceder a sua participação sobre o seu percentual de Direitos Econômicos a terceiros sem a expressa anuência do CLUBE, sob pena de caracterização de infração contratual, hipótese em que o CLUBE ficará, ainda, desobrigado a repassar ao ATLETA ou a terceiros o valor correspondente à totalidade do percentual de Direitos Econômicos cedido no Contrato Especial de Trabalho Desportivo. -verificar se esses termos se aplicam ao  atleta, se há alguma alteração.",
  },
  {
    tipo: "paragrafo",
    texto: "E por estarem assim justas e acordadas, as partes firmam o presente instrumento de Cláusulas Adicionais ao Contrato de Formação Desportiva, em (03) três vias.",
  },
  { tipo: "paragrafo", texto: "São Paulo, {{dataAssinaturaExtenso}}." },
  { tipo: "centro", texto: "JUVENTUS SAF", bold: true },
  {
    tipo: "tabela2col",
    esquerda: "JUVENTUS SAF\nLucas Soler Petarello de Oliveira\nPresidente do Conselho de Administração",
    direita: "JUVENTUS SAF\nJoão da Costa Minsoni\nMembro do Conselho Fiscal",
  },
  { tipo: "linha" },
  { tipo: "centro", texto: "ATLETA", bold: true },
  { tipo: "assinaturaAtleta" },
];

function preencher(texto: string, campos: ContratoFormacaoMaiorCampos): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_match, chave: string) => {
    const valor = campos[chave as keyof ContratoFormacaoMaiorCampos];
    return valor ?? "";
  });
}

// Cabeçalho/rodapé deste modelo são mais altos que os do contrato de menor (artes diferentes, ver
// comentário do arquivo) — altura calculada a partir do próprio `wp:extent` do `.docx` original
// (header cx=8018780 cy=2448000 EMU, footer cx=7600950 cy=1976120 EMU; 1pt = 12700 EMU), escalado
// pra largura cheia de A4 (595.28pt), mesmo método já usado no contrato de menor.
//
// O PNG do cabeçalho (`contrato-formacao-maior-cabecalho.png`) é recortado (`a:srcRect r="2390"
// b="37082"` no `header1.xml` do .docx original — Word corta 37,082% de baixo e 2,39% da direita
// antes de exibir) — sem aplicar esse corte, a imagem extraída inteira (com a área em branco que o
// Word corta) aparecia espremida dentro da altura calculada, deixando um vão enorme em branco
// antes do texto começar (reportado pelo Mateus ao ver o PDF em 12/11/2026). Altura abaixo já
// recalculada em cima do PNG recortado (2421×743px, proporção 0,30690 × 595,28pt).
//
// `width` em pontos fixos (595.28 = largura de uma página A4), não "100%": a versão de
// @react-pdf/renderer realmente usada no projeto (3.4.4 — testei direto com ela, não com a mais
// nova) não resolve bem `width: "100%"` num `<Image>` quando a altura também é fixa e a imagem não
// tem DPI embutido no PNG — ela estourava a largura da página inteira e cortava a borda direita do
// cabeçalho (reportado pelo Mateus em 12/11/2026, junto com o vão em branco acima). Largura fixa
// em pt evita esse caminho de resolução de porcentagem por completo.
const styles = StyleSheet.create({
  cabecalho: { position: "absolute", top: 0, left: 0, width: 595.28, height: 182.7 },
  rodape: { position: "absolute", bottom: 0, left: 0, width: 595.28, height: 154.8 },
  pagina: {
    paddingTop: 201.9,
    paddingBottom: 172,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1f1f1f",
    lineHeight: 1.35,
  },
  titulo: { fontSize: 13, fontWeight: 700, color: CORES.grenaEscuro, textAlign: "center", marginBottom: 10 },
  clausula: { fontSize: 10, fontWeight: 700, color: CORES.grenaEscuro, marginTop: 12, marginBottom: 4 },
  paragrafo: { textAlign: "justify", marginBottom: 6 },
  // Sem `marginLeft` (tinha 14pt) — pedido do Mateus em 12/11/2026, ao ver os itens com letra/
  // número/bullet (a), b), i), •...) puxados pra dentro em relação à margem esquerda normal do
  // parágrafo/cláusula: "tipo a), b) sempre ficam pra frente". Agora os itens começam na mesma
  // margem de tudo o resto do contrato, sem recuo — mesma mudança em
  // `contrato-formacao-document.tsx` (modelo do atleta menor).
  item: { textAlign: "justify", marginBottom: 6 },
  centro: { textAlign: "center", marginTop: 10, marginBottom: 2 },
  centroBold: { textAlign: "center", marginTop: 10, marginBottom: 2, fontWeight: 700 },
  linha: { textAlign: "center", marginTop: 26, marginBottom: 2 },
  tabelaLinha: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  tabelaCol: { width: "46%", textAlign: "center" },
  // Assinatura de uma parte só (o ATLETA, sem pai/mãe) — mesma régua visual de `tabela2col`, só
  // centralizada em vez de dividida em 2 colunas.
  assinaturaAtleta: { textAlign: "center", marginTop: 16 },
  testemunhasTitulo: { fontWeight: 700, marginTop: 20, marginBottom: 6 },
  testemunhasLinha: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  testemunhasCol: { width: "46%" },
});

function Paragrafo({ texto }: { texto: string }) {
  return <Text style={styles.paragrafo}>{texto}</Text>;
}

export function ContratoFormacaoMaiorDocument({
  cabecalhoSrc,
  rodapeSrc,
  campos,
}: {
  cabecalhoSrc: ContratoFormacaoMaiorLogoSrc;
  rodapeSrc: ContratoFormacaoMaiorLogoSrc;
  campos: ContratoFormacaoMaiorCampos;
}) {
  // Separa os blocos em páginas pelo marcador `quebraPagina` — mesmo princípio do contrato de
  // menor (ver `contrato-formacao-document.tsx`).
  const paginas: Bloco[][] = [[]];
  for (const bloco of BLOCOS) {
    if (bloco.tipo === "quebraPagina") {
      paginas.push([]);
    } else {
      paginas[paginas.length - 1].push(bloco);
    }
  }

  return (
    <Document>
      {paginas.map((blocos, indicePagina) => (
        <Page key={indicePagina} size="A4" style={styles.pagina}>
          {cabecalhoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.cabecalho} src={cabecalhoSrc as string} fixed />
          ) : null}

          {blocos.map((bloco, i) => {
            switch (bloco.tipo) {
              case "titulo":
                return (
                  <Text key={i} style={styles.titulo}>
                    {preencher(bloco.texto, campos)}
                  </Text>
                );
              case "clausula":
                return (
                  <Text key={i} style={styles.clausula}>
                    {preencher(bloco.texto, campos)}
                  </Text>
                );
              case "paragrafo":
                return <Paragrafo key={i} texto={preencher(bloco.texto, campos)} />;
              case "item":
                return (
                  <Text key={i} style={styles.item}>
                    {preencher(bloco.texto, campos)}
                  </Text>
                );
              case "centro":
                return (
                  <Text key={i} style={bloco.bold ? styles.centroBold : styles.centro}>
                    {preencher(bloco.texto, campos)}
                  </Text>
                );
              case "linha":
                return (
                  <Text key={i} style={styles.linha}>
                    ______________________________________
                  </Text>
                );
              case "tabela2col":
                return (
                  <View key={i} style={styles.tabelaLinha} wrap={false}>
                    <Text style={styles.tabelaCol}>{bloco.esquerda}</Text>
                    <Text style={styles.tabelaCol}>{bloco.direita}</Text>
                  </View>
                );
              case "assinaturaAtleta":
                return (
                  <Text key={i} style={styles.assinaturaAtleta}>
                    ______________________________________{"\n"}ATLETA
                  </Text>
                );
              case "testemunhas":
                return (
                  <View key={i} wrap={false}>
                    <Text style={styles.testemunhasTitulo}>Testemunhas:</Text>
                    <View style={styles.testemunhasLinha}>
                      <View style={styles.testemunhasCol}>
                        <Text>1. ___________________________________</Text>
                        <Text style={{ marginTop: 10 }}>Nome:</Text>
                        <Text style={{ marginTop: 10 }}>CPF:</Text>
                      </View>
                      <View style={styles.testemunhasCol}>
                        <Text>2. ___________________________________</Text>
                        <Text style={{ marginTop: 10 }}>Nome:</Text>
                        <Text style={{ marginTop: 10 }}>CPF:</Text>
                      </View>
                    </View>
                  </View>
                );
              default:
                return null;
            }
          })}

          {rodapeSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.rodape} src={rodapeSrc as string} fixed />
          ) : null}
        </Page>
      ))}
    </Document>
  );
}
