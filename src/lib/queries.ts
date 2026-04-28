export async function getApostasProva(provaId: string): Promise<Aposta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, perfil:perfis(*)`)
    .eq('prova_id', provaId)
    .order('pontos_total', { ascending: false })

  if (error) throw error
  return (data ?? []) as Aposta[]
}
