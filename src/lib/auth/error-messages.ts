const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/already registered/i, 'Este e-mail já está cadastrado.'],
  [/at least 6 characters/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar.'],
];

export function authErrorMessage(message: string): string {
  return MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? 'Não foi possível entrar. Tente novamente.';
}
