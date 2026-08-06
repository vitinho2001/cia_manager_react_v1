import { supabase } from './supabase'

export async function getCurrentOrganizationId(): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error('Usuário não autenticado.')
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', authData.user.id)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data?.organization_id) throw new Error('Seu usuário ainda não está vinculado a uma organização.')
  return data.organization_id as string
}
