/** Formato mínimo necessário pra resolver a função atual de uma pessoa do Staff Operacional —
 * compatível com `StaffOperacionalComFuncaoRow` e `StaffOperacionalBaseComFuncaoRow` (ambos os
 * departamentos têm exatamente esses três campos). */
interface StaffComFuncoes {
  terceirizada: boolean;
  funcao: { nome: string } | null;
  funcao_terceirizada: { nome: string } | null;
}

/**
 * Função cadastrada de uma pessoa do Staff Operacional — a função interna normalmente, ou a função
 * da empresa terceirizada quando `terceirizada` for true (só um dos dois vem preenchido, mesma
 * regra das telas de Staff Operacional — ver `app/staff-operacional/page.tsx`). `null` quando não
 * há nenhuma função cadastrada (ou o join não trouxe o nome).
 *
 * Usado no Recibo de Pagamento pra preencher "Função no jogo" com o que já está cadastrado sempre
 * que o campo específico do jogo não foi preenchido, em vez de deixar em branco.
 */
export function funcaoCadastroStaff(staff: StaffComFuncoes): string | null {
  return (staff.terceirizada ? staff.funcao_terceirizada?.nome : staff.funcao?.nome) ?? null;
}
