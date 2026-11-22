import { inject, Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private supabase: SupabaseClient = createClient(
    supabaseConfig.url,
    supabaseConfig.publishableKey
  );

  // Retorna true se existir uma sessão ativa (o Supabase guarda a sessão no navegador).
  async verificarSessao(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    return !!data.session;
  }

  // Usado pelo interceptor (passo 4) para mandar o token para o NestJS.
  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async entrar(email: string, senha: string): Promise<Session> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.session) {
      throw error ?? new Error('Não foi possível iniciar a sessão.');
    }
    return data.session;
  }

  async sair(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
